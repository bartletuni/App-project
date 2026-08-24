import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { emailFrom, sendEmail } from "@/lib/email";

// See the note in api/download/[fileId]: reads must not be served from cache.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

/**
 * Reports how transactional email is configured, and — with `?send=1` — makes a
 * real send to ADMIN_EMAIL and returns exactly what Resend answered.
 *
 * Notification sends are deliberately non-fatal, so a misconfiguration is
 * invisible from the outside: registration still succeeds and no email arrives.
 * This surfaces the reason on demand. Admin-only, since it can trigger sends.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY || "";
  const from = emailFrom();
  const adminEmail = process.env.ADMIN_EMAIL || "";
  const usingSandboxSender = from.includes("onboarding@resend.dev");

  const config = {
    resendApiKeySet: Boolean(apiKey),
    resendApiKeyLength: apiKey.length,
    // Not secrets — these are the addresses mail is sent from and to.
    from,
    adminEmail: adminEmail || null,
    usingSandboxSender,
    notes: [
      !apiKey && "RESEND_API_KEY is not set — every send is skipped.",
      !adminEmail &&
        "ADMIN_EMAIL is not set — new-user notifications are skipped and new-request notifications fall back to the submitting user.",
      usingSandboxSender &&
        "EMAIL_FROM is unset, so sends use Resend's shared sandbox sender, which only delivers to the address that owns the Resend account. Verify your domain in Resend and set EMAIL_FROM to an address on it.",
    ].filter(Boolean),
  };

  if (req.nextUrl.searchParams.get("send") !== "1") {
    return NextResponse.json({
      config,
      hint: "Add ?send=1 to attempt a real send to ADMIN_EMAIL and see Resend's response.",
    });
  }

  if (!adminEmail) {
    return NextResponse.json(
      { config, testSend: { ok: false, error: "ADMIN_EMAIL is not set, so there is nowhere to send." } },
      { status: 400 }
    );
  }

  const result = await sendEmail({
    to: adminEmail,
    subject: "TakomoCo email configuration test",
    html: `<p>This is a test send from the TakomoCo app.</p>
           <p>If you are reading it, transactional email is working:
           <strong>${from}</strong> &rarr; <strong>${adminEmail}</strong>.</p>`,
    label: "email configuration test",
  });

  return NextResponse.json({ config, testSend: result });
}
