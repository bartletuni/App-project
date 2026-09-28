import { issueFormToken } from "@/lib/form-token";
import {
  GUEST_EMAIL_TOKEN_MAX_AGE_MS,
  guestEmailLinks,
  isDisownable,
  issueGuestEmailToken,
  verifyGuestEmailToken,
} from "@/lib/guest-email";

/**
 * The links in the estimate form's confirmation email are the only thing that
 * lets anyone confirm — or delete — a no-account estimate, so the token behind
 * them has to be unforgeable, tied to one request, and short-lived.
 */
describe("guest email confirmation tokens", () => {
  const REQUEST = "clx000000000abcdef";
  const ISSUED = 1_700_000_000_000;

  beforeAll(() => {
    process.env.NEXTAUTH_SECRET = "test-secret-for-guest-email";
  });

  it("accepts its own token and says which request it is for", () => {
    const token = issueGuestEmailToken(REQUEST, ISSUED)!;
    expect(verifyGuestEmailToken(token, ISSUED + 60_000)).toEqual({ ok: true, requestId: REQUEST });
  });

  it("works straight away — there is no dwell time on a link", () => {
    const token = issueGuestEmailToken(REQUEST, ISSUED)!;
    expect(verifyGuestEmailToken(token, ISSUED).ok).toBe(true);
  });

  it("stops working once the link is old", () => {
    const token = issueGuestEmailToken(REQUEST, ISSUED)!;
    expect(verifyGuestEmailToken(token, ISSUED + GUEST_EMAIL_TOKEN_MAX_AGE_MS + 1)).toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it("cannot be pointed at another request", () => {
    const token = issueGuestEmailToken(REQUEST, ISSUED)!;
    const [, issued, signature] = token.split(".");
    const retargeted = `clx999999999zzzzzz.${issued}.${signature}`;
    expect(verifyGuestEmailToken(retargeted, ISSUED + 1_000)).toEqual({ ok: false, reason: "unsigned" });
  });

  it("cannot have its issue time moved to dodge expiry", () => {
    const token = issueGuestEmailToken(REQUEST, ISSUED)!;
    const parts = token.split(".");
    parts[1] = String(ISSUED + GUEST_EMAIL_TOKEN_MAX_AGE_MS);
    expect(verifyGuestEmailToken(parts.join("."), ISSUED + GUEST_EMAIL_TOKEN_MAX_AGE_MS + 10).ok).toBe(false);
  });

  it("rejects a token issued in the future", () => {
    const token = issueGuestEmailToken(REQUEST, ISSUED + 60_000)!;
    expect(verifyGuestEmailToken(token, ISSUED)).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects a forged signature, a missing token, and anything shaped wrong", () => {
    const token = issueGuestEmailToken(REQUEST, ISSUED)!;
    const forged = `${token.split(".").slice(0, 2).join(".")}.notarealsignature`;
    expect(verifyGuestEmailToken(forged, ISSUED).ok).toBe(false);
    expect(verifyGuestEmailToken("", ISSUED)).toEqual({ ok: false, reason: "missing" });
    expect(verifyGuestEmailToken(null, ISSUED)).toEqual({ ok: false, reason: "missing" });
    expect(verifyGuestEmailToken("nonsense", ISSUED)).toEqual({ ok: false, reason: "malformed" });
    expect(verifyGuestEmailToken(`../etc.${ISSUED}.sig`, ISSUED)).toEqual({ ok: false, reason: "malformed" });
  });

  it("is not interchangeable with a form token", () => {
    // Same secret, same HMAC — but a different scope in what is signed.
    const formToken = issueFormToken("guest-quote", ISSUED)!;
    const [, issued, , signature] = formToken.split(".");
    expect(verifyGuestEmailToken(`${REQUEST}.${issued}.${signature}`, ISSUED + 1_000).ok).toBe(false);
  });

  it("fails closed when the deployment has no secret to sign with", () => {
    const secret = process.env.NEXTAUTH_SECRET;
    const token = issueGuestEmailToken(REQUEST, ISSUED)!;
    delete process.env.NEXTAUTH_SECRET;
    try {
      expect(issueGuestEmailToken(REQUEST, ISSUED)).toBeNull();
      expect(verifyGuestEmailToken(token, ISSUED)).toEqual({ ok: false, reason: "no-secret" });
    } finally {
      process.env.NEXTAUTH_SECRET = secret;
    }
  });

  it("builds both links on the canonical origin, landing on a page rather than an API", () => {
    const token = issueGuestEmailToken(REQUEST, ISSUED)!;
    const links = guestEmailLinks(token);
    expect(links.confirm).toBe(`https://takomoco.com/estimate/confirm?a=confirm&t=${token}`);
    expect(links.disown).toBe(`https://takomoco.com/estimate/confirm?a=disown&t=${token}`);
  });
});

describe("which estimates a disowning click may delete", () => {
  it("deletes an estimate the shop has not moved on", () => {
    expect(isDisownable({ kind: "ESTIMATE", guestEmail: "a@b.co", convertedAt: null })).toBe(true);
  });

  it("leaves anything already on the build queue for a person", () => {
    expect(
      isDisownable({ kind: "REQUEST", guestEmail: "a@b.co", convertedAt: new Date("2026-09-01") })
    ).toBe(false);
    expect(isDisownable({ kind: "REQUEST", guestEmail: "a@b.co", convertedAt: null })).toBe(false);
  });
});
