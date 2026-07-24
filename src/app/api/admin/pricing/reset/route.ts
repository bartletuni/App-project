import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DEFAULT_PRICING } from "@/lib/pricing";
import { savePricingContent } from "@/lib/pricing-store";

export const dynamic = "force-dynamic";

/** Restore the built-in catalog, discarding any saved edits. */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await savePricingContent(DEFAULT_PRICING);
  } catch (error) {
    console.error("Failed to restore default pricing content:", error);
    return NextResponse.json(
      { error: "Failed to restore default pricing content" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ...DEFAULT_PRICING, isDefault: false });
}
