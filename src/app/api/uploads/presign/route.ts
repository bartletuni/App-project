import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { createUploadTicket, sweepStalePending, validateUploadRequest } from "@/lib/direct-upload";
import { describeFormTokenFailure, verifyFormToken } from "@/lib/form-token";
import { GUEST_ESTIMATE_TOKEN_SCOPE } from "@/lib/guest-estimate";
import { DIRECT_UPLOADS } from "@/lib/part-source";
import { DAY_MS, HOUR_MS, clientIp, consumeRateLimits, hashIdentifier } from "@/lib/rate-limit";

/**
 * POST /api/uploads/presign — a signed URL to send one file straight to storage.
 *
 * This is the other half of the direct-upload design in src/lib/direct-upload.ts:
 * the browser asks here for permission to send ONE file of a stated name and
 * size, gets a URL good for exactly that, PUTs the file to Cloudflare, and then
 * submits the form carrying the receipt this route returns.
 *
 * It is a write surface open to the public, so it is held to the same standard
 * as the public estimate endpoint it serves:
 *
 *   * Who may ask. A signed-in session, or the signed form token the public
 *     estimate form already fetches when it loads — a blind POST has neither.
 *     The receipt is bound to whichever it was, so it is only good for a
 *     submission by the same caller.
 *   * How often. Per address, per hour and per day, in the database like the
 *     estimate form's own limits, and failing open for the same reason.
 *   * How big. The declared size is validated against the limit and signed into
 *     the URL; the upload is re-checked when the form is submitted.
 *
 * Nothing here touches the database except the rate counters: an upload is not
 * a request until the form is submitted.
 */

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const LIMITS = { perIpHour: 40, perIpDay: 150 };

const TOO_MANY =
  "That's a lot of uploads from one place in a short time. Give it a little while, or email the files to the shop.";

export async function POST(req: NextRequest) {
  try {
    // Off until the bucket's CORS rule is in place — see DIRECT_UPLOADS.
    if (!DIRECT_UPLOADS) {
      return NextResponse.json({ error: "Direct uploads are not enabled." }, { status: 404 });
    }

    let body: Record<string, unknown>;
    try {
      const parsed = await req.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("shape");
      body = parsed as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    // --- Who is asking -----------------------------------------------------
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    let scope: string;
    if (userId) {
      scope = `user:${userId}`;
    } else {
      const token = typeof body.formToken === "string" ? body.formToken : null;
      const verdict = verifyFormToken(token, GUEST_ESTIMATE_TOKEN_SCOPE);
      if (!verdict.ok) {
        return NextResponse.json({ error: describeFormTokenFailure(verdict.reason) }, { status: 400 });
      }
      scope = "guest";
    }

    // --- How often ---------------------------------------------------------
    const ipHash = hashIdentifier(clientIp(req.headers));
    const rate = await consumeRateLimits([
      {
        scope: "uploads:presign-ip-hour",
        subject: ipHash,
        limit: LIMITS.perIpHour,
        windowMs: HOUR_MS,
        message: TOO_MANY,
      },
      {
        scope: "uploads:presign-ip-day",
        subject: ipHash,
        limit: LIMITS.perIpDay,
        windowMs: DAY_MS,
        message: TOO_MANY,
      },
    ]);
    if (!rate.ok) {
      return NextResponse.json(
        { error: rate.rule?.message || TOO_MANY },
        {
          status: 429,
          headers: rate.retryAfterSeconds ? { "Retry-After": String(rate.retryAfterSeconds) } : undefined,
        }
      );
    }

    // --- What is being asked for ------------------------------------------
    const request = validateUploadRequest({
      kind: body.kind,
      fileName: body.fileName,
      size: body.size,
    });
    if ("error" in request) {
      return NextResponse.json({ error: request.error }, { status: 400 });
    }

    const ticket = await createUploadTicket(request, scope);
    if (!ticket) {
      return NextResponse.json({ error: "Uploads are not available right now." }, { status: 503 });
    }

    // Abandoned uploads are deleted from here, on the path that creates them.
    // Awaited, because a serverless function may be frozen the moment it
    // responds; it is throttled, bounded and cannot throw.
    await sweepStalePending();

    return NextResponse.json(ticket);
  } catch (error) {
    console.error("Failed to issue an upload URL:", error);
    return NextResponse.json({ error: "Failed to prepare the upload." }, { status: 500 });
  }
}
