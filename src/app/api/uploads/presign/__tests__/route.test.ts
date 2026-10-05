import { NextRequest } from "next/server";

const getServerSession = jest.fn();
const rateUpsert = jest.fn();
const presignPutUrl = jest.fn();
const listObjectsInR2 = jest.fn();
const deleteFromR2 = jest.fn();

jest.mock("next-auth/next", () => ({ getServerSession: (...a: unknown[]) => getServerSession(...a) }));
jest.mock("@/lib/prisma", () => ({
  prisma: { rateLimit: { upsert: (...a: unknown[]) => rateUpsert(...a) } },
}));
jest.mock("@/lib/r2", () => ({
  presignPutUrl: (...a: unknown[]) => presignPutUrl(...a),
  listObjectsInR2: (...a: unknown[]) => listObjectsInR2(...a),
  deleteFromR2: (...a: unknown[]) => deleteFromR2(...a),
  newObjectKey: (name: string, prefix = "") => `${prefix}fixed-uuid-${name}`,
}));

import { issueFormToken, MIN_FILL_MS } from "@/lib/form-token";
import { GUEST_ESTIMATE_TOKEN_SCOPE } from "@/lib/guest-estimate";

type Route = typeof import("../route");

/** The route, loaded as a deployment with direct uploads switched on (or off) would have it. */
function loadRoute(enabled: boolean): Route {
  let route!: Route;
  jest.isolateModules(() => {
    if (enabled) process.env.NEXT_PUBLIC_DIRECT_UPLOADS = "1";
    else delete process.env.NEXT_PUBLIC_DIRECT_UPLOADS;
    route = require("../route");
  });
  return route;
}

const MB = 1024 * 1024;
const validToken = () => issueFormToken(GUEST_ESTIMATE_TOKEN_SCOPE, Date.now() - MIN_FILL_MS - 1_000)!;

const post = (body: unknown, raw = false) =>
  new NextRequest("http://localhost/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.9" },
    body: raw ? (body as string) : JSON.stringify(body),
  });

describe("POST /api/uploads/presign", () => {
  let POST: Route["POST"];

  beforeAll(() => {
    process.env.NEXTAUTH_SECRET = "test-secret-for-presign";
  });
  afterAll(() => {
    delete process.env.NEXT_PUBLIC_DIRECT_UPLOADS;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
    getServerSession.mockResolvedValue(null);
    rateUpsert.mockResolvedValue({ count: 1 });
    presignPutUrl.mockResolvedValue("https://bucket.example/signed-url");
    listObjectsInR2.mockResolvedValue([]);
    POST = loadRoute(true).POST;
  });

  it("does not exist until direct uploads are switched on", async () => {
    const off = loadRoute(false).POST;
    const res = await off(post({ kind: "model", fileName: "a.stl", size: 10 * MB, formToken: validToken() }));
    expect(res.status).toBe(404);
    expect(presignPutUrl).not.toHaveBeenCalled();
  });

  describe("who may ask", () => {
    it("turns away a caller with neither a session nor a form token", async () => {
      const res = await POST(post({ kind: "model", fileName: "a.stl", size: 10 * MB }));
      expect(res.status).toBe(400);
      expect(presignPutUrl).not.toHaveBeenCalled();
    });

    it("turns away a forged or wrongly scoped form token", async () => {
      const wrongScope = issueFormToken("some-other-form", Date.now() - MIN_FILL_MS - 1_000)!;
      for (const formToken of ["garbage", wrongScope]) {
        const res = await POST(post({ kind: "model", fileName: "a.stl", size: 10 * MB, formToken }));
        expect(res.status).toBe(400);
      }
      expect(presignPutUrl).not.toHaveBeenCalled();
    });

    it("turns away a form token that is too fresh to have been filled in by a person", async () => {
      const fresh = issueFormToken(GUEST_ESTIMATE_TOKEN_SCOPE, Date.now())!;
      const res = await POST(post({ kind: "model", fileName: "a.stl", size: 10 * MB, formToken: fresh }));
      expect(res.status).toBe(400);
    });

    it("serves the public form, with a receipt good only for a guest", async () => {
      const res = await POST(post({ kind: "model", fileName: "bracket.stl", size: 10 * MB, formToken: validToken() }));
      expect(res.status).toBe(200);
      const ticket = await res.json();
      expect(ticket.url).toBe("https://bucket.example/signed-url");
      expect(ticket.headers).toEqual({ "Content-Type": "application/sla" });

      jest.resetModules();
      process.env.NEXT_PUBLIC_DIRECT_UPLOADS = "1";
      const fresh = require("@/lib/direct-upload");
      expect("receipt" in fresh.readReceipt(ticket.token, "guest", "model")).toBe(true);
      expect("error" in fresh.readReceipt(ticket.token, "user:u1", "model")).toBe(true);
    });

    it("serves a signed-in customer without a form token, with a receipt good only for them", async () => {
      getServerSession.mockResolvedValue({ user: { id: "u1", email: "c@example.com" } });
      const res = await POST(post({ kind: "reference", fileName: "photo.jpg", size: 8 * MB }));
      expect(res.status).toBe(200);
      const ticket = await res.json();

      jest.resetModules();
      process.env.NEXT_PUBLIC_DIRECT_UPLOADS = "1";
      const fresh = require("@/lib/direct-upload");
      expect("receipt" in fresh.readReceipt(ticket.token, "user:u1", "reference")).toBe(true);
      expect("error" in fresh.readReceipt(ticket.token, "guest", "reference")).toBe(true);
    });
  });

  describe("what may be asked for", () => {
    beforeEach(() => getServerSession.mockResolvedValue({ user: { id: "u1" } }));

    it("signs the declared size and type into the URL it asks storage for", async () => {
      await POST(post({ kind: "model", fileName: "bracket.step", size: 12 * MB }));
      expect(presignPutUrl).toHaveBeenCalledWith(
        expect.objectContaining({ contentType: "model/step", contentLength: 12 * MB })
      );
      expect(presignPutUrl.mock.calls[0][0].key).toMatch(/^pending\//);
    });

    it.each([
      ["a file over the model limit", { kind: "model", fileName: "a.stl", size: 50 * MB + 1 }],
      ["a photo over its limit", { kind: "reference", fileName: "p.jpg", size: 10 * MB + 1 }],
      ["the wrong kind of file for the slot", { kind: "model", fileName: "p.png", size: 100 }],
      ["an executable", { kind: "model", fileName: "a.exe", size: 100 }],
      ["no size", { kind: "model", fileName: "a.stl" }],
      ["an unknown kind", { kind: "avatar", fileName: "a.stl", size: 100 }],
    ])("refuses %s", async (_label, body) => {
      const res = await POST(post(body));
      expect(res.status).toBe(400);
      expect(presignPutUrl).not.toHaveBeenCalled();
    });

    it("refuses a body that is not a JSON object", async () => {
      for (const body of ["not json", "[]", "null", "42"]) {
        const res = await POST(post(body, true));
        expect(res.status).toBe(400);
      }
    });
  });

  describe("how often", () => {
    it("stops a caller who has asked too many times, and says when to try again", async () => {
      getServerSession.mockResolvedValue({ user: { id: "u1" } });
      rateUpsert.mockResolvedValue({ count: 9999 });
      const res = await POST(post({ kind: "model", fileName: "a.stl", size: 1 * MB }));
      expect(res.status).toBe(429);
      expect(res.headers.get("Retry-After")).toBeTruthy();
      expect(presignPutUrl).not.toHaveBeenCalled();
    });

    it("lets a customer through when the counters cannot be read: it fails open, as the estimate form does", async () => {
      getServerSession.mockResolvedValue({ user: { id: "u1" } });
      rateUpsert.mockRejectedValue(new Error("db down"));
      const res = await POST(post({ kind: "model", fileName: "a.stl", size: 1 * MB }));
      expect(res.status).toBe(200);
    });
  });

  describe("housekeeping", () => {
    it("deletes abandoned uploads while it is at it", async () => {
      getServerSession.mockResolvedValue({ user: { id: "u1" } });
      listObjectsInR2.mockResolvedValue([
        { key: "pending/stale", lastModified: new Date(Date.now() - 48 * 60 * 60 * 1000) },
        { key: "pending/fresh", lastModified: new Date() },
      ]);
      await POST(post({ kind: "model", fileName: "a.stl", size: 1 * MB }));
      expect(deleteFromR2).toHaveBeenCalledWith("pending/stale");
      expect(deleteFromR2).not.toHaveBeenCalledWith("pending/fresh");
    });

    it("does not let a failing sweep fail the upload", async () => {
      getServerSession.mockResolvedValue({ user: { id: "u1" } });
      listObjectsInR2.mockRejectedValue(new Error("list failed"));
      const res = await POST(post({ kind: "model", fileName: "a.stl", size: 1 * MB }));
      expect(res.status).toBe(200);
    });
  });

  it("answers a storage failure with a plain error and nothing internal", async () => {
    getServerSession.mockResolvedValue({ user: { id: "u1" } });
    presignPutUrl.mockRejectedValue(new Error("Missing Cloudflare R2 credentials: secret-ish detail"));
    const res = await POST(post({ kind: "model", fileName: "a.stl", size: 1 * MB }));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toMatch(/credentials|secret/i);
  });
});
