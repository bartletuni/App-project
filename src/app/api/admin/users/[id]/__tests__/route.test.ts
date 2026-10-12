import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { DELETE } from "../route";
import { prisma } from "@/lib/prisma";
import { deleteFromR2 } from "@/lib/r2";

jest.mock("next-auth/next", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    partRequest: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    requestAttachment: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    phoneNumber: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((operations: unknown[]) => Promise.all(operations)),
  },
}));

jest.mock("@/lib/r2", () => ({ deleteFromR2: jest.fn() }));

const admin = { user: { id: "admin-1", isAdmin: true } };
const params = { params: { id: "user-1" } };
const del = () => new NextRequest("http://localhost/api/admin/users/user-1", { method: "DELETE" });

/**
 * Closing an account removes the files attached to it — the promise in
 * /file-retention §03 — and the system row that owns guest estimates is never
 * an account to close.
 */
describe("DELETE /api/admin/users/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(admin);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ isGuest: false });
    // Two requests sharing one model (a reorder), plus a reference photo.
    (prisma.partRequest.findMany as jest.Mock).mockResolvedValue([
      { fileId: "model-key.stl" },
      { fileId: "model-key.stl" },
    ]);
    (prisma.requestAttachment.findMany as jest.Mock).mockResolvedValue([{ fileId: "photo-key.jpg" }]);
    (deleteFromR2 as jest.Mock).mockResolvedValue(undefined);
  });

  it("refuses anyone but an admin", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: "user-2", isAdmin: false } });

    expect((await DELETE(del(), params)).status).toBe(403);
    expect(deleteFromR2).not.toHaveBeenCalled();
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it("deletes every file the customer stored, each once, then the account", async () => {
    const res = await DELETE(del(), params);

    expect(res.status).toBe(200);
    expect((deleteFromR2 as jest.Mock).mock.calls.map((c) => c[0]).sort()).toEqual([
      "model-key.stl",
      "photo-key.jpg",
    ]);
    expect(prisma.requestAttachment.deleteMany).toHaveBeenCalledWith({
      where: { request: { userId: "user-1" } },
    });
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: "user-1" } });
  });

  it("keeps the account when storage refuses, so a retry can finish", async () => {
    (deleteFromR2 as jest.Mock).mockRejectedValue(new Error("R2 down"));
    jest.spyOn(console, "error").mockImplementation(() => {});

    const res = await DELETE(del(), params);

    expect(res.status).toBe(503);
    expect(prisma.user.delete).not.toHaveBeenCalled();
    expect(prisma.partRequest.deleteMany).not.toHaveBeenCalled();
  });

  it("will not delete the system row that owns guest estimates", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ isGuest: true });

    const res = await DELETE(del(), params);

    expect(res.status).toBe(400);
    expect(deleteFromR2).not.toHaveBeenCalled();
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it("answers 404 for an account that does not exist", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    expect((await DELETE(del(), params)).status).toBe(404);
    expect(deleteFromR2).not.toHaveBeenCalled();
  });
});
