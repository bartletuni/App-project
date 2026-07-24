import { NextResponse } from "next/server";
import { getPricingContent } from "@/lib/pricing-store";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET() {
  const content = await getPricingContent();
  return NextResponse.json(content, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
