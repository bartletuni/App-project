/**
 * Direct uploads: what keeps a file sent straight to storage honest.
 *
 * The signed URL is not trusted on its own — the storage service may or may not
 * enforce what was signed — so most of these tests are about the server reading
 * the upload back and refusing what does not match.
 */

const readObjectStart = jest.fn();
const copyWithinR2 = jest.fn();
const deleteFromR2 = jest.fn();
const listObjectsInR2 = jest.fn();
const presignPutUrl = jest.fn();

jest.mock("@/lib/r2", () => ({
  readObjectStart: (...a: unknown[]) => readObjectStart(...a),
  copyWithinR2: (...a: unknown[]) => copyWithinR2(...a),
  deleteFromR2: (...a: unknown[]) => deleteFromR2(...a),
  listObjectsInR2: (...a: unknown[]) => listObjectsInR2(...a),
  presignPutUrl: (...a: unknown[]) => presignPutUrl(...a),
  // The real one, so keys are generated as they are in production.
  newObjectKey: (fileName: string, prefix = "") =>
    `${prefix}00000000-0000-4000-8000-000000000000-${fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`,
}));

type DirectUpload = typeof import("@/lib/direct-upload");

/** The module under test, loaded with direct uploads on, as a deployment that enables them would have it. */
function load(): DirectUpload {
  let mod!: DirectUpload;
  jest.isolateModules(() => {
    process.env.NEXT_PUBLIC_DIRECT_UPLOADS = "1";
    mod = require("@/lib/direct-upload");
  });
  return mod;
}

const MB = 1024 * 1024;

/** The first bytes of a binary STL declaring `triangles` triangles. */
const stlHead = (triangles: number) => {
  const head = Buffer.alloc(1024);
  head.writeUInt32LE(triangles, 80);
  return head;
};

describe("direct uploads", () => {
  let du: DirectUpload;
  const NOW = 1_800_000_000_000;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
    process.env.NEXTAUTH_SECRET = "test-secret-for-direct-uploads";
    deleteFromR2.mockResolvedValue(undefined);
    copyWithinR2.mockResolvedValue(undefined);
    presignPutUrl.mockResolvedValue("https://bucket.example/signed");
    du = load();
    du.resetSweepThrottle();
  });

  afterAll(() => {
    delete process.env.NEXT_PUBLIC_DIRECT_UPLOADS;
  });

  const receipt = (over: Partial<import("@/lib/direct-upload").UploadReceipt> = {}) => ({
    key: "pending/abc-bracket.stl",
    fileName: "bracket.stl",
    size: 84 + 1000 * 50,
    mimeType: "application/sla",
    kind: "model" as const,
    scope: "user:u1",
    expiresAt: NOW + 60_000,
    ...over,
  });

  describe("receipts", () => {
    it("round-trip for the caller they were issued to", () => {
      const token = du.issueReceipt(receipt())!;
      const read = du.readReceipt(token, "user:u1", "model", NOW);
      expect("receipt" in read && read.receipt.key).toBe("pending/abc-bracket.stl");
    });

    it("are no use to anyone else: another customer, or a guest", () => {
      const token = du.issueReceipt(receipt())!;
      expect("error" in du.readReceipt(token, "user:someone-else", "model", NOW)).toBe(true);
      expect("error" in du.readReceipt(token, "guest", "model", NOW)).toBe(true);
    });

    it("are no use in the wrong slot", () => {
      const token = du.issueReceipt(receipt())!;
      expect("error" in du.readReceipt(token, "user:u1", "reference", NOW)).toBe(true);
    });

    it("cannot be edited: a changed key, size or name fails the signature", () => {
      const token = du.issueReceipt(receipt())!;
      const [encoded, signature] = token.split(".");
      const forged = JSON.parse(Buffer.from(encoded, "base64url").toString());
      forged.key = "pending/someone-elses-file.stl";
      const forgedToken = `${Buffer.from(JSON.stringify(forged)).toString("base64url")}.${signature}`;
      expect("error" in du.readReceipt(forgedToken, "user:u1", "model", NOW)).toBe(true);
    });

    it("expire", () => {
      const token = du.issueReceipt(receipt({ expiresAt: NOW - 1 }))!;
      const read = du.readReceipt(token, "user:u1", "model", NOW);
      expect("error" in read && read.error).toMatch(/expired/);
    });

    it("must name a pending object, so a receipt cannot point at a stored file", () => {
      const token = du.issueReceipt(receipt({ key: "11111111-real-customer-file.stl" }))!;
      expect("error" in du.readReceipt(token, "user:u1", "model", NOW)).toBe(true);
    });

    it("are refused outright when the deployment has no secret to sign with", () => {
      const token = du.issueReceipt(receipt())!;
      delete process.env.NEXTAUTH_SECRET;
      expect(du.issueReceipt(receipt())).toBeNull();
      expect("error" in du.readReceipt(token, "user:u1", "model", NOW)).toBe(true);
    });

    it("reject junk", () => {
      for (const junk of ["", "a.b.c", "nodot", "e30.AAAA"]) {
        expect("error" in du.readReceipt(junk, "user:u1", "model", NOW)).toBe(true);
      }
    });
  });

  describe("validateUploadRequest", () => {
    it("accepts a model and a photo of a size within the limits, naming the type they promise", () => {
      expect(du.validateUploadRequest({ kind: "model", fileName: "a.stl", size: 30 * MB })).toEqual({
        kind: "model",
        fileName: "a.stl",
        size: 30 * MB,
        mimeType: "application/sla",
      });
      expect(du.validateUploadRequest({ kind: "reference", fileName: "p.heic", size: 8 * MB })).toMatchObject({
        mimeType: "image/heic",
      });
    });

    it("holds the limits direct uploads advertise: 50MB a model, 10MB a photo", () => {
      expect("error" in du.validateUploadRequest({ kind: "model", fileName: "a.stl", size: 50 * MB + 1 })).toBe(true);
      expect("error" in du.validateUploadRequest({ kind: "reference", fileName: "p.jpg", size: 10 * MB + 1 })).toBe(true);
      expect("error" in du.validateUploadRequest({ kind: "model", fileName: "a.stl", size: 50 * MB })).toBe(false);
    });

    it("refuses the wrong kind of file for the slot", () => {
      expect("error" in du.validateUploadRequest({ kind: "model", fileName: "p.png", size: 10 })).toBe(true);
      expect("error" in du.validateUploadRequest({ kind: "reference", fileName: "a.stl", size: 10 })).toBe(true);
      expect("error" in du.validateUploadRequest({ kind: "model", fileName: "a.exe", size: 10 })).toBe(true);
    });

    it("refuses nonsense: no size, a fractional or negative one, a missing or huge name, an unknown kind", () => {
      const bad: Record<string, unknown>[] = [
        { kind: "model", fileName: "a.stl", size: 0 },
        { kind: "model", fileName: "a.stl", size: -5 },
        { kind: "model", fileName: "a.stl", size: 1.5 },
        { kind: "model", fileName: "a.stl", size: "10" },
        { kind: "model", fileName: "a.stl" },
        { kind: "model", fileName: "", size: 10 },
        { kind: "model", fileName: `${"x".repeat(256)}.stl`, size: 10 },
        { kind: "avatar", fileName: "a.stl", size: 10 },
        { kind: "model", fileName: { toString: () => "a.stl" }, size: 10 },
      ];
      for (const input of bad) expect("error" in du.validateUploadRequest({ kind: input.kind, fileName: input.fileName, size: input.size })).toBe(true);
    });
  });

  describe("createUploadTicket", () => {
    it("signs a URL for exactly the declared size and type, at a pending key, and returns a receipt for it", async () => {
      const ticket = await du.createUploadTicket(
        { kind: "model", fileName: "my bracket.stl", size: 5 * MB, mimeType: "application/sla" },
        "guest",
        NOW
      );

      const args = presignPutUrl.mock.calls[0][0];
      expect(args.key).toMatch(/^pending\/.+-my_bracket\.stl$/);
      expect(args.contentType).toBe("application/sla");
      expect(args.contentLength).toBe(5 * MB);
      expect(ticket!.url).toBe("https://bucket.example/signed");
      expect(ticket!.headers).toEqual({ "Content-Type": "application/sla" });

      // The receipt names that same key, for the caller it was issued to.
      const read = du.readReceipt(ticket!.token, "guest", "model", NOW);
      expect("receipt" in read && read.receipt.key).toBe(args.key);
    });

    it("gives nothing when it cannot sign a receipt", async () => {
      delete process.env.NEXTAUTH_SECRET;
      const ticket = await du.createUploadTicket(
        { kind: "model", fileName: "a.stl", size: 10, mimeType: "application/sla" },
        "guest"
      );
      expect(ticket).toBeNull();
      expect(presignPutUrl).not.toHaveBeenCalled();
    });
  });

  describe("inspectUpload — what actually arrived", () => {
    const triangles = 1000;

    it("accepts a file of the declared size that begins as its extension promises", async () => {
      readObjectStart.mockResolvedValue({ head: stlHead(triangles), totalSize: 84 + triangles * 50 });
      expect(await du.inspectUpload(receipt())).toEqual({ mimeType: "application/sla" });
      expect(deleteFromR2).not.toHaveBeenCalled();
    });

    it("refuses and deletes an upload larger than it was declared, which the signature should have prevented", async () => {
      readObjectStart.mockResolvedValue({ head: stlHead(triangles), totalSize: 84 + triangles * 50 + 400 * MB });
      const result = await du.inspectUpload(receipt());
      expect("error" in result && result.error).toMatch(/size/);
      expect(deleteFromR2).toHaveBeenCalledWith("pending/abc-bracket.stl");
    });

    it("refuses and deletes an upload over the limit even if it was somehow declared", async () => {
      const big = 60 * MB;
      readObjectStart.mockResolvedValue({ head: stlHead((big - 84) / 50), totalSize: big });
      const result = await du.inspectUpload(receipt({ size: big }));
      expect("error" in result).toBe(true);
      expect(deleteFromR2).toHaveBeenCalled();
    });

    it("refuses and deletes a file that is not what its extension says", async () => {
      readObjectStart.mockResolvedValue({ head: Buffer.from("MZ\u0090\u0000 not a model"), totalSize: 84 + triangles * 50 });
      const result = await du.inspectUpload(receipt({ fileName: "bracket.step", mimeType: "model/step" }));
      expect("error" in result && result.error).toBe("File content does not match its extension");
      expect(deleteFromR2).toHaveBeenCalledWith("pending/abc-bracket.stl");
    });

    it("says so, and deletes nothing, when there is no such upload", async () => {
      readObjectStart.mockResolvedValue(null);
      const result = await du.inspectUpload(receipt());
      expect("error" in result && result.error).toMatch(/couldn't find/);
      expect(deleteFromR2).not.toHaveBeenCalled();
    });

    it("does not mistake a storage outage for a bad file: it reports the outage and deletes nothing", async () => {
      readObjectStart.mockRejectedValue(new Error("R2 unreachable"));
      const result = await du.inspectUpload(receipt());
      expect("error" in result && result.error).toMatch(/try again in a moment/);
      expect(deleteFromR2).not.toHaveBeenCalled();
    });

    it("checks a photo the same way", async () => {
      readObjectStart.mockResolvedValue({
        head: Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(100)]),
        totalSize: 2 * MB,
      });
      const photo = receipt({ key: "pending/p.png", fileName: "p.png", size: 2 * MB, mimeType: "image/png", kind: "reference" });
      expect(await du.inspectUpload(photo)).toEqual({ mimeType: "image/png" });

      readObjectStart.mockResolvedValue({ head: Buffer.from("not a png at all"), totalSize: 2 * MB });
      const result = await du.inspectUpload(photo);
      expect("error" in result && result.error).toMatch(/Reference file content/);
    });
  });

  describe("promoteUpload", () => {
    it("copies the pending object to a permanent key with no prefix, then removes the pending one", async () => {
      const key = await du.promoteUpload(receipt());
      expect(key).toMatch(/^[^/]+-bracket\.stl$/);
      expect(copyWithinR2).toHaveBeenCalledWith("pending/abc-bracket.stl", key);
      expect(deleteFromR2).toHaveBeenCalledWith("pending/abc-bracket.stl");
      expect(copyWithinR2.mock.invocationCallOrder[0]).toBeLessThan(deleteFromR2.mock.invocationCallOrder[0]);
    });

    it("fails the request when the copy fails — there is nothing permanent to point at", async () => {
      copyWithinR2.mockRejectedValue(new Error("copy failed"));
      await expect(du.promoteUpload(receipt())).rejects.toThrow("copy failed");
      expect(deleteFromR2).not.toHaveBeenCalled();
    });

    it("does not fail the request when only the cleanup fails; the sweep will find it", async () => {
      deleteFromR2.mockRejectedValue(new Error("delete failed"));
      await expect(du.promoteUpload(receipt())).resolves.toMatch(/-bracket\.stl$/);
    });
  });

  describe("sweepStalePending", () => {
    const hours = (n: number) => new Date(NOW - n * 60 * 60 * 1000);

    it("deletes uploads older than a day and leaves newer ones alone", async () => {
      listObjectsInR2.mockResolvedValue([
        { key: "pending/old-1", lastModified: hours(30) },
        { key: "pending/fresh", lastModified: hours(2) },
        { key: "pending/old-2", lastModified: hours(25) },
      ]);
      expect(await du.sweepStalePending(NOW)).toBe(2);
      expect(listObjectsInR2).toHaveBeenCalledWith("pending/", expect.any(Number));
      expect(deleteFromR2.mock.calls.map((c) => c[0]).sort()).toEqual(["pending/old-1", "pending/old-2"]);
    });

    it("runs at most once in a while per instance", async () => {
      listObjectsInR2.mockResolvedValue([]);
      await du.sweepStalePending(NOW);
      await du.sweepStalePending(NOW + 60_000);
      expect(listObjectsInR2).toHaveBeenCalledTimes(1);
      await du.sweepStalePending(NOW + 11 * 60_000);
      expect(listObjectsInR2).toHaveBeenCalledTimes(2);
    });

    it("never throws, because it runs on a customer's upload", async () => {
      listObjectsInR2.mockRejectedValue(new Error("list failed"));
      await expect(du.sweepStalePending(NOW)).resolves.toBe(0);
    });
  });
});
