import { NextResponse } from "next/server";
import { GUEST_QUOTE_TOKEN_SCOPE } from "@/lib/guest-quote";
import { issueFormToken } from "@/lib/form-token";

/**
 * The public quote form asks for one of these when it mounts, and hands it
 * back when it submits. It is what tells the server the submission came from
 * a page that was actually loaded, and roughly when — see src/lib/form-token.ts.
 *
 * Deliberately cheap: no database, no session, nothing stored. Handing a token
 * out costs an HMAC, and holding one is worth nothing on its own — every other
 * check on POST /api/requests/guest still applies.
 */

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET() {
  const token = issueFormToken(GUEST_QUOTE_TOKEN_SCOPE);

  if (!token) {
    return NextResponse.json(
      { error: "The quote form is unavailable right now. Please call or email the shop." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json({ token }, { headers: { "Cache-Control": "no-store" } });
}
