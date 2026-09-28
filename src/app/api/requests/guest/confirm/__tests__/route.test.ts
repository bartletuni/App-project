import { NextRequest } from "next/server";
import { POST } from "../route";
import { prisma } from "@/lib/prisma";
import { deleteFromR2 } from "@/lib/r2";
import { hashIdentifier } from "@/lib/rate-limit";
import { issueGuestEmailToken } from "@/lib/guest-email";
import { BUSINESS } from "@/lib/seo";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    partRequest: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    requestAttachment: {
      deleteMany: jest.fn(),
    },
    phoneNumber: {
      deleteMany: jest.fn(),
    },
    emailSuppression: {
      upsert: jest.fn(),
    },
    rateLimit: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    // The batch form: every operation passed in was already issued above.
    $transaction: jest.fn((operations: unknown[]) => Promise.all(operations)),
  },
}));

jest.mock("@/lib/r2", () => ({
  deleteFromR2: jest.fn(),
}));

const mockSend = jest.fn();
jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: mockSend } })),
}));

/**
 * The two buttons on /estimate/confirm. Holding a link is proof of reading the
 * inbox it was sent to — so a good link must do exactly what its owner asked,
 * and nothing else may do anything at all.
 */
describe("POST /api/requests/guest/confirm", () => {
  const ID = "clx000000000abcdef";

  const estimate = (overrides: Record<string, unknown> = {}) => ({
    id: ID,
    guestEmail: "alex@example.com",
    guestEmailConfirmedAt: null,
    kind: "ESTIMATE",
    quoteRequested: true,
    fileId: "model-key.stl",
    convertedAt: null,
    phoneNumberId: "phone-1",
    attachments: [{ fileId: "photo-key.jpg" }],
    ...overrides,
  });

  const post = (body: unknown) =>
    POST(
      new NextRequest("http://localhost/api/requests/guest/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
    );

  const token = () => issueGuestEmailToken(ID)!;

  beforeAll(() => {
    process.env.NEXTAUTH_SECRET = "test-secret-for-guest-email";
    process.env.RESEND_API_KEY = "re_test";
    delete process.env.ADMIN_EMAIL;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.partRequest.findUnique as jest.Mock).mockResolvedValue(estimate());
    (prisma.partRequest.update as jest.Mock).mockResolvedValue({});
    (prisma.partRequest.delete as jest.Mock).mockResolvedValue({});
    (prisma.requestAttachment.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.phoneNumber.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.emailSuppression.upsert as jest.Mock).mockResolvedValue({});
    (prisma.rateLimit.upsert as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.rateLimit.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
    (deleteFromR2 as jest.Mock).mockResolvedValue(undefined);
    mockSend.mockResolvedValue({ data: { id: "email-1" }, error: null });
  });

  // --- a link that is not good does nothing ---------------------------------

  it("rejects a missing, forged, or retargeted link before touching the database", async () => {
    const good = token();
    const [, issued, signature] = good.split(".");

    for (const body of [
      { action: "confirm" },
      { token: "clx.1.forged", action: "confirm" },
      { token: `clx999999999zzzzzz.${issued}.${signature}`, action: "disown" },
      { token: good, action: "delete-everything" },
    ]) {
      const res = await post(body);
      expect(res.status).toBe(400);
    }
    expect(prisma.partRequest.findUnique).not.toHaveBeenCalled();
  });

  it("rejects an expired link", async () => {
    const old = issueGuestEmailToken(ID, Date.now() - 31 * 24 * 60 * 60 * 1000)!;
    const res = await post({ token: old, action: "confirm" });
    expect(res.status).toBe(400);
    expect(prisma.partRequest.findUnique).not.toHaveBeenCalled();
  });

  it("acts only on a no-account estimate", async () => {
    (prisma.partRequest.findUnique as jest.Mock).mockResolvedValue(estimate({ guestEmail: null }));
    const res = await post({ token: token(), action: "disown" });
    expect(res.status).toBe(404);
    expect(prisma.emailSuppression.upsert).not.toHaveBeenCalled();
    expect(prisma.partRequest.delete).not.toHaveBeenCalled();
  });

  it("says so when the estimate is already gone", async () => {
    (prisma.partRequest.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await post({ token: token(), action: "disown" });
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/already been removed/);
  });

  // --- confirm ----------------------------------------------------------------

  it("records the confirmation", async () => {
    const res = await post({ token: token(), action: "confirm" });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, action: "confirm", reference: "E-ABCDEF" });
    const update = (prisma.partRequest.update as jest.Mock).mock.calls[0][0];
    expect(update.where).toEqual({ id: ID });
    expect(update.data.guestEmailConfirmedAt).toBeInstanceOf(Date);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("keeps the first confirmation time when clicked twice", async () => {
    (prisma.partRequest.findUnique as jest.Mock).mockResolvedValue(
      estimate({ guestEmailConfirmedAt: new Date("2026-09-01") })
    );
    const res = await post({ token: token(), action: "confirm" });
    expect(res.status).toBe(200);
    expect(prisma.partRequest.update).not.toHaveBeenCalled();
  });

  // --- disown -----------------------------------------------------------------

  it("deletes the estimate and every file with it, and stops all further email", async () => {
    const res = await post({ token: token(), action: "disown" });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, action: "disown", reference: "E-ABCDEF", removed: true });

    // The address, as a digest — never in the clear.
    const suppressed = (prisma.emailSuppression.upsert as jest.Mock).mock.calls[0][0];
    expect(suppressed.where.key).toBe(hashIdentifier("alex@example.com"));
    expect(JSON.stringify(suppressed)).not.toContain("alex@example.com");

    expect((deleteFromR2 as jest.Mock).mock.calls.map((c) => c[0])).toEqual([
      "model-key.stl",
      "photo-key.jpg",
    ]);
    expect(prisma.requestAttachment.deleteMany).toHaveBeenCalledWith({ where: { requestId: ID } });
    expect(prisma.partRequest.delete).toHaveBeenCalledWith({ where: { id: ID } });
    expect(prisma.phoneNumber.deleteMany).toHaveBeenCalledWith({
      where: { id: "phone-1", requests: { none: {} } },
    });
  });

  it("tells the shop, and only the shop", async () => {
    await post({ token: token(), action: "disown" });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const mail = mockSend.mock.calls[0][0];
    expect(mail.to).toBe(BUSINESS.email);
    expect(mail.subject).toContain("E-ABCDEF");
    expect(mail.html).toContain("Already deleted");
  });

  it("leaves the row in place when storage will not delete the files, so a retry can finish", async () => {
    (deleteFromR2 as jest.Mock).mockRejectedValue(new Error("R2 down"));

    const res = await post({ token: token(), action: "disown" });

    expect(res.status).toBe(503);
    // The promise not to email is kept regardless.
    expect(prisma.emailSuppression.upsert).toHaveBeenCalled();
    expect(prisma.partRequest.delete).not.toHaveBeenCalled();
  });

  it("does not delete an estimate the shop has already moved onto the build queue", async () => {
    (prisma.partRequest.findUnique as jest.Mock).mockResolvedValue(
      estimate({
        kind: "REQUEST",
        convertedAt: new Date("2026-09-10"),
        guestEmailConfirmedAt: new Date("2026-09-09"),
      })
    );

    const res = await post({ token: token(), action: "disown" });

    expect(res.status).toBe(200);
    expect((await res.json()).removed).toBe(false);
    expect(prisma.emailSuppression.upsert).toHaveBeenCalled();
    expect(deleteFromR2).not.toHaveBeenCalled();
    expect(prisma.partRequest.delete).not.toHaveBeenCalled();
    // No longer vouched for.
    expect(prisma.partRequest.update).toHaveBeenCalledWith({
      where: { id: ID },
      data: { guestEmailConfirmedAt: null },
    });
    expect(mockSend.mock.calls[0][0].html).toContain("Not deleted");
  });

  it("does not let a replayed link fill the shop's inbox", async () => {
    (prisma.partRequest.findUnique as jest.Mock).mockResolvedValue(
      estimate({ kind: "REQUEST", convertedAt: new Date("2026-09-10") })
    );
    (prisma.rateLimit.upsert as jest.Mock).mockResolvedValue({ count: 2 });

    const res = await post({ token: token(), action: "disown" });

    expect(res.status).toBe(200);
    expect(mockSend).not.toHaveBeenCalled();
  });
});
