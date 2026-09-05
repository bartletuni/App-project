/**
 * Cloudflare Turnstile — optional, and off until a deployment configures it.
 *
 * The other defences on the quote form (a signed form token, a honeypot, and
 * database-backed rate limits) cost the customer nothing and stop the traffic
 * that actually shows up: scripted posts and crude form-fillers. They will not
 * stop somebody who has decided to target this shop specifically. Turnstile
 * will, and in its managed mode it is invisible to almost every real visitor —
 * no puzzles, no "select the traffic lights", usually not even a click.
 *
 * It stays optional because it is a third-party dependency and an account to
 * hold: set both keys and it is enforced; leave them unset and the form works
 * exactly as before, with the other layers standing. Nothing is loaded in the
 * browser when it is not configured.
 *
 *   NEXT_PUBLIC_TURNSTILE_SITE_KEY — the widget's public key (browser). Read
 *                                    from src/lib/guest-quote.ts, which the
 *                                    form imports; nothing in this file is
 *                                    meant to reach a browser bundle.
 *   TURNSTILE_SECRET_KEY           — verification key (server only, never sent).
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** True when this deployment holds the secret and will therefore enforce it. */
export function isTurnstileEnforced(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

export interface TurnstileResult {
  ok: boolean;
  /** For the server log — never shown to the customer. */
  detail?: string;
}

/**
 * Verify a widget response with Cloudflare.
 *
 * A network failure reaching Cloudflare fails OPEN, deliberately: an outage at
 * a third party must not take the shop's front door down with it. A response
 * that Cloudflare actively rejects fails closed, which is the case that matters.
 */
export async function verifyTurnstile(
  token: string | null | undefined,
  remoteIp?: string
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true, detail: "not configured" };

  if (!token) return { ok: false, detail: "no token submitted" };

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(`[turnstile] verification endpoint returned ${res.status}; allowing through`);
      return { ok: true, detail: `siteverify http ${res.status}` };
    }

    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (data.success) return { ok: true };

    return { ok: false, detail: (data["error-codes"] || []).join(",") || "rejected" };
  } catch (error) {
    console.error("[turnstile] could not reach verification endpoint; allowing through:", error);
    return { ok: true, detail: "unreachable" };
  }
}
