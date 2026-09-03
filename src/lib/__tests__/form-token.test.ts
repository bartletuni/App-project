import {
  MAX_TOKEN_AGE_MS,
  MIN_FILL_MS,
  issueFormToken,
  verifyFormToken,
} from "@/lib/form-token";

/**
 * The form token is the check that costs the customer nothing and stops the
 * traffic that never loaded a page. These are the properties it has to hold.
 */
describe("form tokens", () => {
  const SCOPE = "guest-quote";
  const ISSUED = 1_700_000_000_000;

  beforeAll(() => {
    process.env.NEXTAUTH_SECRET = "test-secret-for-form-tokens";
  });

  it("accepts its own token once a plausible amount of time has passed", () => {
    const token = issueFormToken(SCOPE, ISSUED)!;
    expect(verifyFormToken(token, SCOPE, ISSUED + 10_000)).toEqual({ ok: true });
  });

  it("rejects a submission that arrives faster than a person can fill the form", () => {
    const token = issueFormToken(SCOPE, ISSUED)!;
    expect(verifyFormToken(token, SCOPE, ISSUED + MIN_FILL_MS - 1)).toEqual({
      ok: false,
      reason: "too-fast",
    });
  });

  it("rejects a token harvested and replayed later", () => {
    const token = issueFormToken(SCOPE, ISSUED)!;
    expect(verifyFormToken(token, SCOPE, ISSUED + MAX_TOKEN_AGE_MS + 1)).toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it("rejects a token minted for another form", () => {
    const token = issueFormToken("some-other-form", ISSUED)!;
    expect(verifyFormToken(token, SCOPE, ISSUED + 10_000)).toEqual({
      ok: false,
      reason: "unsigned",
    });
  });

  it("rejects a forged signature", () => {
    const token = issueFormToken(SCOPE, ISSUED)!;
    const forged = `${token.split(".").slice(0, 3).join(".")}.notarealsignature`;
    expect(verifyFormToken(forged, SCOPE, ISSUED + 10_000).ok).toBe(false);
  });

  it("rejects a token whose issue time has been backdated to dodge expiry", () => {
    const token = issueFormToken(SCOPE, ISSUED)!;
    const parts = token.split(".");
    parts[1] = String(ISSUED + 60_000);
    expect(verifyFormToken(parts.join("."), SCOPE, ISSUED + 90_000).ok).toBe(false);
  });

  it("rejects a blind post that carries no token at all", () => {
    expect(verifyFormToken("", SCOPE, ISSUED)).toEqual({ ok: false, reason: "missing" });
    expect(verifyFormToken(null, SCOPE, ISSUED)).toEqual({ ok: false, reason: "missing" });
  });

  it("rejects anything shaped wrong", () => {
    expect(verifyFormToken("nonsense", SCOPE, ISSUED)).toEqual({ ok: false, reason: "malformed" });
  });

  it("fails closed when the deployment has no secret to sign with", () => {
    const secret = process.env.NEXTAUTH_SECRET;
    const token = issueFormToken(SCOPE, ISSUED)!;
    delete process.env.NEXTAUTH_SECRET;
    try {
      expect(issueFormToken(SCOPE, ISSUED)).toBeNull();
      expect(verifyFormToken(token, SCOPE, ISSUED + 10_000)).toEqual({
        ok: false,
        reason: "no-secret",
      });
    } finally {
      process.env.NEXTAUTH_SECRET = secret;
    }
  });
});
