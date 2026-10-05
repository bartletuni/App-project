import { NextRequest } from "next/server";

/**
 * A request submitted with receipts for files that were sent straight to
 * storage, instead of the files themselves. The route must believe a receipt
 * only if it was issued to this very caller and the object behind it checks
 * out — and must leave nothing behind when anything fails.
 */

const getServerSession = jest.fn();
const partRequestCreate = jest.fn();
const readObjectStart = jest.fn();
const copyWithinR2 = jest.fn();
const deleteFromR2 = jest.fn();
const uploadToR2 = jest.fn();

jest.mock("next-auth/next", () => ({ getServerSession: (...a: unknown[]) => getServerSession(...a) }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    phoneNumber: {
      findFirst: jest.fn().mockResolvedValue({ id: "phone-1" }),
      create: jest.fn().mockResolvedValue({ id: "phone-1" }),
    },
    partRequest: {
      create: (...a: unknown[]) => partRequestCreate(...a),
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: "customer-1", email: "c@example.com", name: "Customer" }),
      create: jest.fn().mockResolvedValue({ id: "guest-owner" }),
    },
    rateLimit: {
      upsert: jest.fn().mockResolvedValue({ count: 1 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    emailSuppression: { findUnique: jest.fn().mockResolvedValue(null) },
  },
}));
jest.mock("@/lib/r2", () => ({
  readObjectStart: (...a: unknown[]) => readObjectStart(...a),
  copyWithinR2: (...a: unknown[]) => copyWithinR2(...a),
  deleteFromR2: (...a: unknown[]) => deleteFromR2(...a),
  uploadToR2: (...a: unknown[]) => uploadToR2(...a),
  objectExistsInR2: jest.fn().mockResolvedValue(true),
  newObjectKey: (name: string, prefix = "") => `${prefix}${Math.random().toString(36).slice(2, 10)}-${name}`,
}));
jest.mock("resend", () => ({ Resend: jest.fn().mockImplementation(() => ({ emails: { send: jest.fn() } })) }));

type Route = typeof import("../route");
type DirectUpload = typeof import("@/lib/direct-upload");

function load(enabled: boolean): { POST: Route["POST"]; du: DirectUpload } {
  let route!: Route;
  let du!: DirectUpload;
  jest.isolateModules(() => {
    if (enabled) process.env.NEXT_PUBLIC_DIRECT_UPLOADS = "1";
    else delete process.env.NEXT_PUBLIC_DIRECT_UPLOADS;
    route = require("../route");
    du = require("@/lib/direct-upload");
  });
  return { POST: route.POST, du };
}

const MB = 1024 * 1024;
const NOW = Date.now();
const PNG_HEAD = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);
const stlHead = (triangles: number) => {
  const head = Buffer.alloc(1024);
  head.writeUInt32LE(triangles, 80);
  return head;
};

describe("POST /api/requests with receipts for direct uploads", () => {
  let POST: Route["POST"];
  let du: DirectUpload;

  const modelReceipt = (scope = "user:u1", over = {}) =>
    du.issueReceipt({
      key: "pending/abc-bracket.stl",
      fileName: "bracket.stl",
      size: 84 + 400_000 * 50, // ~19MB: far over what a form post can carry
      mimeType: "application/sla",
      kind: "model",
      scope,
      expiresAt: NOW + 60 * 60_000,
      ...over,
    })!;

  const photoReceipt = (n: number, size = 3 * MB, scope = "user:u1") =>
    du.issueReceipt({
      key: `pending/p${n}-photo${n}.png`,
      fileName: `photo${n}.png`,
      size,
      mimeType: "image/png",
      kind: "reference",
      scope,
      expiresAt: NOW + 60 * 60_000,
    })!;

  const build = (fields: Record<string, string | string[]>) => {
    const formData = new FormData();
    formData.append("quantity", "1");
    formData.append("material", "PLA");
    formData.append("dateNeeded", new Date(Date.now() + 5 * 864e5).toISOString());
    formData.append("phoneNumber", "1234567890");
    for (const [k, v] of Object.entries(fields)) {
      for (const value of Array.isArray(v) ? v : [v]) formData.append(k, value);
    }
    return new NextRequest("http://localhost/api/requests", { method: "POST", body: formData });
  };

  beforeAll(() => {
    process.env.NEXTAUTH_SECRET = "test-secret-for-direct-requests";
  });
  afterAll(() => {
    delete process.env.NEXT_PUBLIC_DIRECT_UPLOADS;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    ({ POST, du } = load(true));
    getServerSession.mockResolvedValue({ user: { id: "u1", email: "u1@example.com", name: "U One" } });
    partRequestCreate.mockResolvedValue({ id: "req-1", attachments: [] });
    // By default whatever is asked for is there, intact, and as declared.
    readObjectStart.mockImplementation(async (key: string) =>
      key.endsWith(".stl")
        ? { head: stlHead(400_000), totalSize: 84 + 400_000 * 50 }
        : { head: PNG_HEAD, totalSize: 3 * MB }
    );
    copyWithinR2.mockResolvedValue(undefined);
    deleteFromR2.mockResolvedValue(undefined);
  });

  const row = () => partRequestCreate.mock.calls[0][0].data;

  describe("a model sent straight to storage", () => {
    it("is stored by promoting it — no bytes pass through, and the row points at the permanent key", async () => {
      const res = await POST(build({ submissionType: "MODEL", modelUpload: modelReceipt(), quoteRequested: "true" }));
      expect(res.status).toBe(201);

      expect(uploadToR2).not.toHaveBeenCalled();
      expect(copyWithinR2).toHaveBeenCalledWith("pending/abc-bracket.stl", expect.stringMatching(/^[^/]+-bracket\.stl$/));
      expect(row().fileName).toBe("bracket.stl");
      expect(row().fileId).toBe(copyWithinR2.mock.calls[0][1]);
      expect(row().fileId.startsWith("pending/")).toBe(false);
      // It has an account and the part file, so a price asked for is a quote.
      expect(row().kind).toBe("QUOTE");
      // The pending copy is removed once the permanent one exists.
      expect(deleteFromR2).toHaveBeenCalledWith("pending/abc-bracket.stl");
    });

    it("is refused when the receipt was issued to someone else", async () => {
      const res = await POST(build({ submissionType: "MODEL", modelUpload: modelReceipt("user:another") }));
      expect(res.status).toBe(400);
      expect(partRequestCreate).not.toHaveBeenCalled();
      expect(copyWithinR2).not.toHaveBeenCalled();
    });

    it("is refused when the receipt is a guest's", async () => {
      const res = await POST(build({ submissionType: "MODEL", modelUpload: modelReceipt("guest") }));
      expect(res.status).toBe(400);
      expect(partRequestCreate).not.toHaveBeenCalled();
    });

    it("is refused, and the object deleted, when the bytes are not what the name says", async () => {
      readObjectStart.mockResolvedValue({ head: Buffer.from("MZ not a model"), totalSize: 84 + 400_000 * 50 });
      const res = await POST(
        build({
          submissionType: "MODEL",
          modelUpload: modelReceipt("user:u1", { fileName: "bracket.step", mimeType: "model/step" }),
        })
      );
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe("File content does not match its extension");
      expect(deleteFromR2).toHaveBeenCalledWith("pending/abc-bracket.stl");
      expect(partRequestCreate).not.toHaveBeenCalled();
    });

    it("is refused, and the object deleted, when it is bigger than declared", async () => {
      readObjectStart.mockResolvedValue({ head: stlHead(400_000), totalSize: 84 + 400_000 * 50 + 300 * MB });
      const res = await POST(build({ submissionType: "MODEL", modelUpload: modelReceipt() }));
      expect(res.status).toBe(400);
      expect(deleteFromR2).toHaveBeenCalledWith("pending/abc-bracket.stl");
      expect(partRequestCreate).not.toHaveBeenCalled();
    });

    it("is refused once spent: the second submission finds nothing at the pending key", async () => {
      readObjectStart.mockResolvedValue(null);
      const res = await POST(build({ submissionType: "MODEL", modelUpload: modelReceipt() }));
      expect(res.status).toBe(400);
      expect(partRequestCreate).not.toHaveBeenCalled();
    });

    it("fails the request, creating nothing, when the copy to permanent storage fails", async () => {
      copyWithinR2.mockRejectedValue(new Error("copy failed"));
      const res = await POST(build({ submissionType: "MODEL", modelUpload: modelReceipt() }));
      expect(res.status).toBe(500);
      expect(partRequestCreate).not.toHaveBeenCalled();
    });

    it("works for an admin filing the request for a customer, on the admin's own receipt", async () => {
      getServerSession.mockResolvedValue({ user: { id: "admin-1", email: "a@example.com", isAdmin: true } });
      const res = await POST(
        build({ submissionType: "MODEL", modelUpload: modelReceipt("user:admin-1"), userId: "customer-1" })
      );
      expect(res.status).toBe(201);
      expect(row().userId).toBe("customer-1");
    });

    it("is refused outright when direct uploads are not switched on", async () => {
      const off = load(false);
      const token = modelReceipt();
      const res = await off.POST(build({ submissionType: "MODEL", modelUpload: token }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toMatch(/not available/);
      expect(copyWithinR2).not.toHaveBeenCalled();
    });

    it("is not a way around the file checks: a plain file over the post limit is still refused", async () => {
      const formData = new FormData();
      formData.append("submissionType", "MODEL");
      formData.append("file", new File([new Uint8Array(5 * MB).fill(65)], "big.stl"));
      formData.append("quantity", "1");
      formData.append("dateNeeded", new Date(Date.now() + 5 * 864e5).toISOString());
      formData.append("phoneNumber", "1234567890");
      const res = await POST(new NextRequest("http://localhost/api/requests", { method: "POST", body: formData }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toMatch(/too large to send this way/);
    });
  });

  describe("photos sent straight to storage", () => {
    const described = {
      submissionType: "DESCRIPTION",
      partName: "Dryer door catch",
      partDescription: "A small nylon catch that holds the dryer door shut. The tab snapped off.",
    };

    it("are promoted one by one and attached to the request", async () => {
      const res = await POST(build({ ...described, referenceUploads: [photoReceipt(1), photoReceipt(2)] }));
      expect(res.status).toBe(201);

      const attachments = row().attachments.create;
      expect(attachments).toHaveLength(2);
      expect(attachments.map((a: any) => a.fileName)).toEqual(["photo1.png", "photo2.png"]);
      expect(attachments.every((a: any) => !a.fileId.startsWith("pending/"))).toBe(true);
      expect(attachments[0]).toMatchObject({ mimeType: "image/png", size: 3 * MB });
      expect(copyWithinR2).toHaveBeenCalledTimes(2);
    });

    it("are refused above five, counting any sent in the post", async () => {
      const six = [1, 2, 3, 4, 5, 6].map((n) => photoReceipt(n, MB));
      const res = await POST(build({ ...described, referenceUploads: six }));
      expect(res.status).toBe(400);
      expect(partRequestCreate).not.toHaveBeenCalled();
    });

    it("allow the most that is allowed: five photos, each at the 10MB limit", async () => {
      const heavy = [1, 2, 3, 4, 5].map((n) => photoReceipt(n, 10 * MB));
      readObjectStart.mockResolvedValue({ head: PNG_HEAD, totalSize: 10 * MB });
      const res = await POST(build({ ...described, referenceUploads: heavy }));
      expect(res.status).toBe(201);
    });

    it("are refused when the object behind a receipt is not the size it declared", async () => {
      readObjectStart.mockResolvedValue({ head: PNG_HEAD, totalSize: 40 * MB });
      const res = await POST(build({ ...described, referenceUploads: [photoReceipt(1)] }));
      expect(res.status).toBe(400);
      expect(deleteFromR2).toHaveBeenCalledWith("pending/p1-photo1.png");
      expect(partRequestCreate).not.toHaveBeenCalled();
    });

    it("are refused when one is someone else's, and nothing is stored", async () => {
      const res = await POST(build({ ...described, referenceUploads: [photoReceipt(1), photoReceipt(2, 3 * MB, "user:another")] }));
      expect(res.status).toBe(400);
      expect(partRequestCreate).not.toHaveBeenCalled();
      expect(copyWithinR2).not.toHaveBeenCalled();
    });

    it("take back what was already stored when a later one cannot be", async () => {
      copyWithinR2.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("copy failed"));
      const res = await POST(build({ ...described, referenceUploads: [photoReceipt(1), photoReceipt(2)] }));
      expect(res.status).toBe(500);
      expect(partRequestCreate).not.toHaveBeenCalled();
      // The first photo's permanent copy is deleted rather than left unclaimed.
      const firstPermanent = copyWithinR2.mock.calls[0][1];
      expect(deleteFromR2).toHaveBeenCalledWith(firstPermanent);
    });
  });

  it("still takes a small file in the post, with direct uploads on", async () => {
    const formData = new FormData();
    formData.append("submissionType", "MODEL");
    formData.append("file", new File([Buffer.from("solid tiny")], "tiny.stl"));
    formData.append("quantity", "1");
    formData.append("dateNeeded", new Date(Date.now() + 5 * 864e5).toISOString());
    formData.append("phoneNumber", "1234567890");
    uploadToR2.mockResolvedValue("stored-key");
    const res = await POST(new NextRequest("http://localhost/api/requests", { method: "POST", body: formData }));
    expect(res.status).toBe(201);
    expect(row().fileId).toBe("stored-key");
    expect(copyWithinR2).not.toHaveBeenCalled();
  });

  describe("the public estimate form, with no account", () => {
    let GUEST: (req: NextRequest) => Promise<Response>;

    beforeEach(() => {
      jest.isolateModules(() => {
        process.env.NEXT_PUBLIC_DIRECT_UPLOADS = "1";
        GUEST = require("../guest/route").POST;
      });
      partRequestCreate.mockResolvedValue({ id: "clx000000000abcdef", fileName: "bracket.stl", partName: null });
    });

    const guestForm = (fields: Record<string, string>) => {
      const { issueFormToken, MIN_FILL_MS } = require("@/lib/form-token");
      const { GUEST_ESTIMATE_TOKEN_SCOPE } = require("@/lib/guest-estimate");
      const formData = new FormData();
      formData.append("submissionType", "MODEL");
      formData.append("name", "Alex Rivera");
      formData.append("email", "alex@example.com");
      formData.append("phone", "(385) 695-4178");
      formData.append("formToken", issueFormToken(GUEST_ESTIMATE_TOKEN_SCOPE, Date.now() - MIN_FILL_MS - 1000));
      for (const [k, v] of Object.entries(fields)) formData.append(k, v);
      return new NextRequest("http://localhost/api/requests/guest", { method: "POST", body: formData });
    };

    it("takes a large model by receipt, issued to a guest", async () => {
      const res = await GUEST(guestForm({ modelUpload: modelReceipt("guest") }));
      expect(res.status).toBe(201);
      expect(row().guestEmail).toBe("alex@example.com");
      expect(row().fileName).toBe("bracket.stl");
      expect(row().fileId.startsWith("pending/")).toBe(false);
      // Never a quote, whatever it was sent: no account.
      expect(row().kind).toBe("ESTIMATE");
    });

    it("refuses a signed-in customer's receipt: it is no good to a guest", async () => {
      const res = await GUEST(guestForm({ modelUpload: modelReceipt("user:u1") }));
      expect(res.status).toBe(400);
      expect(partRequestCreate).not.toHaveBeenCalled();
      expect(copyWithinR2).not.toHaveBeenCalled();
    });
  });
});
