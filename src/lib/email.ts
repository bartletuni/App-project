import { Resend } from "resend";

/**
 * Transactional email through Resend.
 *
 * `resend.emails.send()` resolves to `{ data, error }` — it does NOT throw when
 * the API rejects a send. Awaiting it without reading `error` therefore swallows
 * every rejection: an unverified sending domain, the sandbox sender's
 * restriction to the account owner's own address, a malformed recipient. The
 * caller sees success and nothing reaches the logs. Route these through
 * `sendEmail` so failures are read and reported.
 */

/** The sender, overridable per deployment. */
export function emailFrom(): string {
  return process.env.EMAIL_FROM || "TakomoCo <onboarding@resend.dev>";
}

export interface SendEmailResult {
  ok: boolean;
  /** Resend's id for a delivered send. */
  id?: string;
  /** Resend's rejection, or a thrown transport failure, as a readable line. */
  error?: string;
}

/**
 * Send one email, reporting whatever Resend said. Never throws: callers treat
 * notification failures as non-fatal, but they are always logged.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  /** Names the send in logs, e.g. "new-user admin notification". */
  label: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    const error = "RESEND_API_KEY is not set; skipping send";
    console.warn(`[email] ${opts.label}: ${error}`);
    return { ok: false, error };
  }

  const from = emailFrom();

  try {
    const { data, error } = await new Resend(apiKey).emails.send({
      from,
      // Strip CR/LF to prevent header injection through a stored value.
      to: opts.to.replace(/[\r\n]/g, ""),
      subject: opts.subject.replace(/[\r\n]/g, " "),
      html: opts.html,
    });

    if (error) {
      const detail = `${error.name || "error"}: ${error.message || "unknown"}`;
      console.error(`[email] ${opts.label} rejected by Resend (from=${from} to=${opts.to}): ${detail}`);
      return { ok: false, error: detail };
    }

    return { ok: true, id: data?.id };
  } catch (thrown: any) {
    // Transport-level failure rather than an API rejection.
    const detail = `${thrown?.name || "Error"}: ${thrown?.message || String(thrown)}`;
    console.error(`[email] ${opts.label} failed to reach Resend: ${detail}`);
    return { ok: false, error: detail };
  }
}
