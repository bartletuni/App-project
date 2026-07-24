import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sanitizePricingContent } from "@/lib/pricing";
import { getPricingContent, savePricingContent } from "@/lib/pricing-store";

export const dynamic = "force-dynamic";

/** Reject oversized bodies before parsing them. */
const MAX_BODY_BYTES = 256 * 1024;

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return Boolean(session && (session.user as any)?.isAdmin);
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const content = await getPricingContent();
  return NextResponse.json(content, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function PUT(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentLength = req.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const content = sanitizePricingContent(body);
  if (!content) {
    return NextResponse.json({ error: "Invalid pricing content" }, { status: 400 });
  }

  try {
    await savePricingContent(content);
  } catch (error) {
    console.error("Failed to save pricing content:", error);
    return NextResponse.json(
      {
        error:
          "Failed to save pricing content. If this is a fresh deployment, run `npx prisma db push` to create the pricing tables.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ...content, isDefault: false });
}
