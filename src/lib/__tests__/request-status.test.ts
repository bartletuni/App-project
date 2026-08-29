import {
  CANCELLED_STATUS,
  CONVERTED_STATUS,
  DEFAULT_QUOTE_STATUS,
  DEFAULT_REQUEST_STATUS,
  KIND_QUOTE,
  KIND_REQUEST,
  QUOTE_STATUSES,
  REQUEST_STATUSES,
  canConvert,
  convertability,
  isQuote,
  isUntouched,
  isValidStatus,
  requestKind,
  statusTone,
  statusesFor,
} from "../request-status";

describe("requestKind", () => {
  it("reads the kind column when it is set", () => {
    expect(requestKind({ kind: "QUOTE" })).toBe(KIND_QUOTE);
    expect(requestKind({ kind: "REQUEST" })).toBe(KIND_REQUEST);
  });

  it("falls back to quoteRequested on rows written before kind existed", () => {
    expect(requestKind({ quoteRequested: true })).toBe(KIND_QUOTE);
    expect(requestKind({ quoteRequested: false })).toBe(KIND_REQUEST);
    expect(requestKind({})).toBe(KIND_REQUEST);
    expect(requestKind(null)).toBe(KIND_REQUEST);
  });

  it("lets kind win over quoteRequested once a quote has been converted", () => {
    // Converting keeps quoteRequested true as a record of how the job started.
    expect(isQuote({ kind: "REQUEST", quoteRequested: true })).toBe(false);
  });

  it("treats an unrecognised kind as a build request", () => {
    expect(requestKind({ kind: "SOMETHING ELSE" })).toBe(KIND_REQUEST);
  });
});

describe("statuses", () => {
  it("keeps the two vocabularies apart", () => {
    expect(isValidStatus(KIND_QUOTE, "QUOTE SENT")).toBe(true);
    expect(isValidStatus(KIND_QUOTE, "SHIPPED")).toBe(false);
    expect(isValidStatus(KIND_REQUEST, "SHIPPED")).toBe(true);
    expect(isValidStatus(KIND_REQUEST, "QUOTE SENT")).toBe(false);
  });

  it("shares only CANCELLED between the two", () => {
    const shared = QUOTE_STATUSES.filter((s) => (REQUEST_STATUSES as readonly string[]).includes(s));
    expect(shared).toEqual([CANCELLED_STATUS]);
  });

  it("offers the right menu for each track", () => {
    expect(statusesFor(KIND_QUOTE)).toContain(DEFAULT_QUOTE_STATUS);
    expect(statusesFor(KIND_REQUEST)).toContain(DEFAULT_REQUEST_STATUS);
  });

  it("gives every status a tone", () => {
    for (const status of [...QUOTE_STATUSES, ...REQUEST_STATUSES]) {
      expect(statusTone(status)).not.toBe(undefined);
    }
    expect(statusTone("QUOTE ACCEPTED")).toBe("done");
    expect(statusTone("QUOTE DECLINED")).toBe("bad");
  });

  it("lands a converted quote at the front of the build queue", () => {
    expect(isValidStatus(KIND_REQUEST, CONVERTED_STATUS)).toBe(true);
    expect(CONVERTED_STATUS).toBe(DEFAULT_REQUEST_STATUS);
  });
});

describe("isUntouched", () => {
  it("covers both tracks' starting points", () => {
    expect(isUntouched({ kind: "QUOTE", status: "QUOTE REQUESTED" })).toBe(true);
    expect(isUntouched({ kind: "QUOTE", status: "QUOTE SENT" })).toBe(false);
    expect(isUntouched({ kind: "REQUEST", status: "PENDING" })).toBe(true);
    expect(isUntouched({ kind: "REQUEST", status: "ACTIVE" })).toBe(false);
  });
});

describe("convertability", () => {
  it("allows an open quote through", () => {
    expect(canConvert({ kind: "QUOTE", status: "QUOTE ACCEPTED" })).toBe(true);
    expect(canConvert({ kind: "QUOTE", status: "QUOTE REQUESTED" })).toBe(true);
  });

  it("allows a declined or expired quote to be revived", () => {
    expect(canConvert({ kind: "QUOTE", status: "QUOTE DECLINED" })).toBe(true);
    expect(canConvert({ kind: "QUOTE", status: "QUOTE EXPIRED" })).toBe(true);
  });

  it("refuses a build request", () => {
    const result = convertability({ kind: "REQUEST", status: "PENDING" });
    expect(result.ok).toBe(false);
    expect((result as { reason: string }).reason).toMatch(/already a build request/);
  });

  it("refuses a cancelled quote", () => {
    const result = convertability({ kind: "QUOTE", status: CANCELLED_STATUS });
    expect(result.ok).toBe(false);
    expect((result as { reason: string }).reason).toMatch(/cancelled/i);
  });

  it("refuses nothing at all", () => {
    expect(canConvert(null)).toBe(false);
  });
});
