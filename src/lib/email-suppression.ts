import { prisma } from "@/lib/prisma";
import { hashIdentifier } from "@/lib/rate-limit";

/**
 * The do-not-email list: addresses whose owner told us, through the "This
 * wasn't me" link in the estimate form's confirmation email, that someone else
 * typed them in. The form never emails them again. See src/lib/guest-email.ts
 * for the flow and `EmailSuppression` in the schema for the storage.
 *
 * Only an HMAC of the address is kept — the same one-way digest the rate
 * limits use — so the list can answer "is this address on it?" and nothing
 * else. It cannot be read back into a list of addresses.
 */

/**
 * "unreadable" is its own answer rather than a guess either way: a caller
 * about to send mail must treat it as "listed" (the promise to the address's
 * owner outweighs one email, which the shop's phone call covers), but the shop
 * should not be told an address was disowned when nobody knows.
 */
export type SuppressionStatus = "listed" | "clear" | "unreadable";

export async function suppressionStatus(email: string): Promise<SuppressionStatus> {
  try {
    const row = await prisma.emailSuppression.findUnique({
      where: { key: hashIdentifier(email) },
      select: { key: true },
    });
    return row ? "listed" : "clear";
  } catch (error) {
    console.error("[email-suppression] list unreadable:", error);
    return "unreadable";
  }
}

/** Put an address on the list. Idempotent — the same address twice is one row. */
export async function suppressEmail(email: string): Promise<void> {
  const key = hashIdentifier(email);
  await prisma.emailSuppression.upsert({ where: { key }, create: { key }, update: {} });
}
