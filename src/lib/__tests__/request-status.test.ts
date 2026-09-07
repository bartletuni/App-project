import {
  ALL_STATUSES,
  CANCELLED_STATUS,
  CONVERTED_STATUS,
  DEFAULT_ESTIMATE_STATUS,
  DEFAULT_QUOTE_STATUS,
  DEFAULT_REQUEST_STATUS,
  ESTIMATE_STATUSES,
  KIND_ESTIMATE,
  KIND_QUOTE,
  KIND_REQUEST,
  PROMOTED_QUOTE_STATUS,
  QUOTE_STATUSES,
  REQUEST_STATUSES,
  canConvert,
  canPromoteToQuote,
  convertability,
  isEstimate,
  isPricing,
  isQuote,
  isUntouched,
  isValidStatus,
  kindLabel,
  pricingKindFor,
  qualifiesForQuote,
  quoteBlocker,
  requestKind,
  statusOptionsFor,
  statusTone,
  statusesFor,
} from "../request-status";

/** The one shape that earns a guaranteed price: an account, and a part file. */
const QUALIFIED = { guestEmail: null, fileId: "r2-object-1" };
/** Came in through the public form — no account to hold a price against. */
const GUEST = { guestEmail: "someone@example.com", fileId: "r2-object-1" };
/** Signed in, but we still have to model the part before we can price it. */
const DESCRIBED = { guestEmail: null, fileId: null };

describe("qualifiesForQuote", () => {
  it("needs both an account and a part file", () => {
    expect(qualifiesForQuote(QUALIFIED)).toBe(true);
    expect(qualifiesForQuote(GUEST)).toBe(false);
    expect(qualifiesForQuote(DESCRIBED)).toBe(false);
    expect(qualifiesForQuote({ guestEmail: "a@b.c", fileId: null })).toBe(false);
    expect(qualifiesForQuote(null)).toBe(false);
  });

  it("says which half is missing", () => {
    expect(quoteBlocker(QUALIFIED)).toBeNull();
    expect(quoteBlocker(GUEST)).toMatch(/no account/i);
    expect(quoteBlocker(DESCRIBED)).toMatch(/no part file/i);
  });
});

describe("pricingKindFor", () => {
  it("quotes a signed-in upload and estimates everything else", () => {
    expect(pricingKindFor({ isGuest: false, hasFile: true })).toBe(KIND_QUOTE);
    expect(pricingKindFor({ isGuest: false, hasFile: false })).toBe(KIND_ESTIMATE);
    expect(pricingKindFor({ isGuest: true, hasFile: true })).toBe(KIND_ESTIMATE);
    expect(pricingKindFor({ isGuest: true, hasFile: false })).toBe(KIND_ESTIMATE);
  });
});

describe("requestKind", () => {
  it("reads the kind column when it is set", () => {
    expect(requestKind({ kind: "ESTIMATE" })).toBe(KIND_ESTIMATE);
    expect(requestKind({ kind: "QUOTE", ...QUALIFIED })).toBe(KIND_QUOTE);
    expect(requestKind({ kind: "REQUEST" })).toBe(KIND_REQUEST);
  });

  it("never calls a row a quote when it could not have carried one", () => {
    // Rows written before the estimate track existed say QUOTE for both kinds.
    expect(requestKind({ kind: "QUOTE", ...GUEST })).toBe(KIND_ESTIMATE);
    expect(requestKind({ kind: "QUOTE", ...DESCRIBED })).toBe(KIND_ESTIMATE);
  });

  it("leaves the stored kind alone when the row is only a projection", () => {
    // A report line or a ledger entry may not carry fileId at all, and a
    // missing key is not evidence of a missing file.
    expect(requestKind({ kind: "QUOTE" })).toBe(KIND_QUOTE);
  });

  it("falls back to quoteRequested on rows written before kind existed", () => {
    expect(requestKind({ quoteRequested: true, ...QUALIFIED })).toBe(KIND_QUOTE);
    expect(requestKind({ quoteRequested: true, ...GUEST })).toBe(KIND_ESTIMATE);
    expect(requestKind({ quoteRequested: false })).toBe(KIND_REQUEST);
    expect(requestKind({})).toBe(KIND_REQUEST);
    expect(requestKind(null)).toBe(KIND_REQUEST);
  });

  it("lets kind win over quoteRequested once a row has been converted", () => {
    // Converting keeps quoteRequested true as a record of how the job started.
    expect(isPricing({ kind: "REQUEST", quoteRequested: true })).toBe(false);
  });

  it("treats an unrecognised kind as a build request", () => {
    expect(requestKind({ kind: "SOMETHING ELSE" })).toBe(KIND_REQUEST);
  });

  it("names each track for the screen", () => {
    expect(kindLabel(KIND_ESTIMATE)).toBe("Estimate");
    expect(kindLabel(KIND_QUOTE)).toBe("Quote");
    expect(kindLabel(KIND_REQUEST)).toBe("Request");
  });

  it("groups the two pricing tracks against the build track", () => {
    expect(isPricing({ kind: "ESTIMATE" })).toBe(true);
    expect(isPricing({ kind: "QUOTE", ...QUALIFIED })).toBe(true);
    expect(isPricing({ kind: "REQUEST" })).toBe(false);
    expect(isEstimate({ kind: "ESTIMATE" })).toBe(true);
    expect(isQuote({ kind: "ESTIMATE" })).toBe(false);
  });
});

describe("statuses", () => {
  it("keeps the three vocabularies apart", () => {
    expect(isValidStatus(KIND_ESTIMATE, "ESTIMATE SENT")).toBe(true);
    expect(isValidStatus(KIND_ESTIMATE, "QUOTE SENT")).toBe(false);
    expect(isValidStatus(KIND_ESTIMATE, "SHIPPED")).toBe(false);
    expect(isValidStatus(KIND_QUOTE, "QUOTE SENT")).toBe(true);
    expect(isValidStatus(KIND_QUOTE, "ESTIMATE SENT")).toBe(false);
    expect(isValidStatus(KIND_REQUEST, "SHIPPED")).toBe(true);
    expect(isValidStatus(KIND_REQUEST, "QUOTE SENT")).toBe(false);
  });

  it("shares only CANCELLED between any two of them", () => {
    const tracks = [ESTIMATE_STATUSES, QUOTE_STATUSES, REQUEST_STATUSES];
    for (const a of tracks) {
      for (const b of tracks) {
        if (a === b) continue;
        const shared = a.filter((s) => (b as readonly string[]).includes(s));
        expect(shared).toEqual([CANCELLED_STATUS]);
      }
    }
  });

  it("offers the right menu for each track", () => {
    expect(statusesFor(KIND_ESTIMATE)).toContain(DEFAULT_ESTIMATE_STATUS);
    expect(statusesFor(KIND_QUOTE)).toContain(DEFAULT_QUOTE_STATUS);
    expect(statusesFor(KIND_REQUEST)).toContain(DEFAULT_REQUEST_STATUS);
  });

  it("gives every status a tone", () => {
    for (const status of ALL_STATUSES) {
      expect(statusTone(status)).not.toBe(undefined);
    }
    expect(statusTone("ESTIMATE ACCEPTED")).toBe("done");
    expect(statusTone("ESTIMATE DECLINED")).toBe("bad");
    expect(statusTone("QUOTE ACCEPTED")).toBe("done");
    expect(statusTone("QUOTE DECLINED")).toBe("bad");
  });

  it("lands a converted row at the front of the build queue", () => {
    expect(isValidStatus(KIND_REQUEST, CONVERTED_STATUS)).toBe(true);
    expect(CONVERTED_STATUS).toBe(DEFAULT_REQUEST_STATUS);
  });

  it("lands a promoted estimate on the quote track", () => {
    expect(isValidStatus(KIND_QUOTE, PROMOTED_QUOTE_STATUS)).toBe(true);
  });
});

describe("statusOptionsFor", () => {
  it("offers the row's own track", () => {
    expect(statusOptionsFor({ kind: "ESTIMATE", status: "ESTIMATE SENT" })).toEqual(
      ESTIMATE_STATUSES
    );
  });

  it("keeps a status the track does not know rather than rewriting it", () => {
    // A pre-estimate guest row: shown as an estimate, still says "QUOTE SENT".
    const options = statusOptionsFor({ kind: "QUOTE", status: "QUOTE SENT", ...GUEST });
    expect(options[0]).toBe("QUOTE SENT");
    expect(options).toContain(DEFAULT_ESTIMATE_STATUS);
  });
});

describe("isUntouched", () => {
  it("covers all three tracks' starting points", () => {
    expect(isUntouched({ kind: "ESTIMATE", status: "ESTIMATE REQUESTED" })).toBe(true);
    expect(isUntouched({ kind: "ESTIMATE", status: "ESTIMATE SENT" })).toBe(false);
    expect(isUntouched({ kind: "QUOTE", status: "QUOTE REQUESTED", ...QUALIFIED })).toBe(true);
    expect(isUntouched({ kind: "QUOTE", status: "QUOTE SENT", ...QUALIFIED })).toBe(false);
    expect(isUntouched({ kind: "REQUEST", status: "PENDING" })).toBe(true);
    expect(isUntouched({ kind: "REQUEST", status: "ACTIVE" })).toBe(false);
  });
});

describe("convertability — onto the build queue", () => {
  it("allows an open estimate or quote through", () => {
    expect(canConvert({ kind: "ESTIMATE", status: "ESTIMATE ACCEPTED" })).toBe(true);
    expect(canConvert({ kind: "ESTIMATE", status: "ESTIMATE REQUESTED" })).toBe(true);
    expect(canConvert({ kind: "QUOTE", status: "QUOTE ACCEPTED", ...QUALIFIED })).toBe(true);
  });

  it("allows a declined or expired one to be revived", () => {
    expect(canConvert({ kind: "ESTIMATE", status: "ESTIMATE DECLINED" })).toBe(true);
    expect(canConvert({ kind: "ESTIMATE", status: "ESTIMATE EXPIRED" })).toBe(true);
    expect(canConvert({ kind: "QUOTE", status: "QUOTE DECLINED", ...QUALIFIED })).toBe(true);
  });

  it("refuses a build request", () => {
    const result = convertability({ kind: "REQUEST", status: "PENDING" });
    expect(result.ok).toBe(false);
    expect((result as { reason: string }).reason).toMatch(/already a build request/);
  });

  it("refuses a cancelled row, and says what it was", () => {
    const result = convertability({ kind: "ESTIMATE", status: CANCELLED_STATUS });
    expect(result.ok).toBe(false);
    expect((result as { reason: string }).reason).toMatch(/cancelled estimate/i);
  });

  it("refuses nothing at all", () => {
    expect(canConvert(null)).toBe(false);
  });
});

describe("convertability — promoting an estimate to a quote", () => {
  it("allows an estimate that has an account and a part file", () => {
    expect(canPromoteToQuote({ kind: "ESTIMATE", status: "ESTIMATE SENT", ...QUALIFIED })).toBe(
      true
    );
  });

  it("refuses a no-account estimate, whatever else it has", () => {
    const result = convertability(
      { kind: "ESTIMATE", status: "ESTIMATE SENT", ...GUEST },
      KIND_QUOTE
    );
    expect(result.ok).toBe(false);
    expect((result as { reason: string }).reason).toMatch(/no account/i);
  });

  it("refuses an estimate with no part file", () => {
    const result = convertability(
      { kind: "ESTIMATE", status: "ESTIMATE SENT", ...DESCRIBED },
      KIND_QUOTE
    );
    expect(result.ok).toBe(false);
    expect((result as { reason: string }).reason).toMatch(/no part file/i);
  });

  it("refuses a cancelled estimate before it even checks qualification", () => {
    const result = convertability(
      { kind: "ESTIMATE", status: CANCELLED_STATUS, ...QUALIFIED },
      KIND_QUOTE
    );
    expect(result.ok).toBe(false);
    expect((result as { reason: string }).reason).toMatch(/cancelled/i);
  });

  it("refuses something that is already a quote or already a build", () => {
    expect(canPromoteToQuote({ kind: "QUOTE", status: "QUOTE SENT", ...QUALIFIED })).toBe(false);
    expect(canPromoteToQuote({ kind: "REQUEST", status: "PENDING", ...QUALIFIED })).toBe(false);
  });
});
