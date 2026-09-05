import { createHmac } from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * Fixed-window ceilings for the public, unauthenticated endpoints.
 *
 * A counter in module scope is worthless here: every serverless cold start
 * gets a fresh copy of it, so the ceiling it enforces is "per instance", which
 * is no ceiling at all. These counters live in the database instead.
 *
 * The window is encoded in the key, so a new window is simply a row that does
 * not exist yet and counting is a single upsert. Nothing has to expire on
 * schedule; old rows are swept opportunistically.
 *
 * Two rules this module holds to:
 *
 *   * Addresses are never stored in the clear. A key holds an HMAC of the IP,
 *     keyed by the deployment secret — enough to count repeat senders, useless
 *     as a record of who visited.
 *   * It fails OPEN. If the database is unreachable, a real customer's quote
 *     still goes through; the honeypot, the form token, and Turnstile (where
 *     configured) are all still standing. Losing work beats losing a customer.
 */

export interface RateLimitRule {
  /** Stable identifier for what is being limited, e.g. "guest-quote:ip". */
  scope: string;
  /** The already-hashed or otherwise non-identifying subject. */
  subject: string;
  /** How many are allowed inside one window. */
  limit: number;
  windowMs: number;
  /** Shown to the customer when this is the rule that tripped. */
  message: string;
}

export interface RateLimitVerdict {
  ok: boolean;
  /** The rule that rejected, when one did. */
  rule?: RateLimitRule;
  /** Seconds until the offending window rolls over. */
  retryAfterSeconds?: number;
}

export const MINUTE_MS = 60 * 1000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

/**
 * One-way, deployment-scoped digest of an identifier. Truncated to 32 hex
 * characters: still far beyond collision range for this purpose, and a shorter
 * key to store.
 */
export function hashIdentifier(value: string): string {
  const key = process.env.NEXTAUTH_SECRET || "takomoco-rate-limit";
  return createHmac("sha256", key).update(value).digest("hex").slice(0, 32);
}

/**
 * The client's address as the platform reports it. Vercel and every ordinary
 * reverse proxy set `x-forwarded-for`; the leftmost entry is the client.
 * Unknown addresses all share one bucket, which is the safe direction: a
 * request we cannot attribute is counted against everything else we cannot
 * attribute.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Count one hit against every rule, and report the first that is over its
 * ceiling. Every rule is counted even after one trips, so a caller hammering
 * the endpoint keeps climbing every window they are in rather than parking
 * just under the wider limits.
 */
export async function consumeRateLimits(
  rules: RateLimitRule[],
  now: number = Date.now()
): Promise<RateLimitVerdict> {
  let verdict: RateLimitVerdict = { ok: true };

  for (const rule of rules) {
    const windowIndex = Math.floor(now / rule.windowMs);
    const key = `${rule.scope}:${rule.subject}:${windowIndex}`;
    const expiresAt = new Date((windowIndex + 1) * rule.windowMs);

    try {
      const row = await prisma.rateLimit.upsert({
        where: { key },
        create: { key, count: 1, expiresAt },
        update: { count: { increment: 1 } },
      });

      if (row.count > rule.limit && verdict.ok) {
        verdict = {
          ok: false,
          rule,
          retryAfterSeconds: Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000)),
        };
      }
    } catch (error) {
      // Fail open — see the note at the top of this file.
      console.error(`[rate-limit] ${rule.scope} could not be counted:`, error);
    }
  }

  await sweep(now);
  return verdict;
}

/**
 * Drop windows that have rolled over. Done on roughly one call in ten rather
 * than on a schedule: the table only ever holds live windows plus whatever has
 * accumulated since the last sweep, and a cron job for three rows would be
 * more machinery than the problem deserves.
 */
async function sweep(now: number): Promise<void> {
  if (Math.random() > 0.1) return;
  try {
    await prisma.rateLimit.deleteMany({ where: { expiresAt: { lt: new Date(now) } } });
  } catch (error) {
    console.error("[rate-limit] sweep failed:", error);
  }
}
