import {
  GENERIC_SUBMIT_ERROR,
  describeSubmitException,
  readSubmitError,
} from "@/lib/submit-error";

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const htmlResponse = (status: number) =>
  new Response("<!DOCTYPE html><html><body>Request Entity Too Large</body></html>", {
    status,
    headers: { "Content-Type": "text/html" },
  });

describe("readSubmitError", () => {
  it("prefers the API's own message", async () => {
    const res = jsonResponse(400, { error: "Lead time must be at least 3 days" });
    expect(await readSubmitError(res)).toBe("Lead time must be at least 3 days");
  });

  it("names an oversized upload the host rejected before the route ran", async () => {
    expect(await readSubmitError(htmlResponse(413))).toMatch(/too large to send/);
  });

  it("explains an expired session", async () => {
    expect(await readSubmitError(htmlResponse(401))).toMatch(/session has expired/i);
  });

  it("falls back to the status when a 5xx has no JSON body", async () => {
    const message = await readSubmitError(htmlResponse(502));
    expect(message).toContain("502");
    expect(message).toMatch(/Nothing was saved/);
  });

  it("falls back to the status when a 4xx has no JSON body", async () => {
    expect(await readSubmitError(htmlResponse(400))).toContain("400");
  });

  it("never returns an empty message for an empty error field", async () => {
    expect(await readSubmitError(jsonResponse(500, { error: "   " }))).toContain("500");
    expect(await readSubmitError(jsonResponse(500, {}))).toContain("500");
  });
});

describe("describeSubmitException", () => {
  it("translates a failed fetch into plain language", () => {
    expect(describeSubmitException(new TypeError("Failed to fetch"))).toMatch(/Could not reach the server/);
  });

  it("passes through a message we raised ourselves", () => {
    expect(describeSubmitException(new Error("Part name is required"))).toBe("Part name is required");
  });

  it("never returns an empty message for a non-Error throw", () => {
    expect(describeSubmitException(undefined)).toBe(GENERIC_SUBMIT_ERROR);
    expect(describeSubmitException("boom")).toBe(GENERIC_SUBMIT_ERROR);
    expect(describeSubmitException(new Error(""))).toBe(GENERIC_SUBMIT_ERROR);
  });
});
