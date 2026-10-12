import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { DELETE } from "../route";
import { prisma } from "@/lib/prisma";
import { deleteFromR2 } from "@/lib/r2";

jest.mock("next-auth/next", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    partRequest: {
      findUnique: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
    requestAttachment: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((operations: unknown[]) => Promise.all(operations)),
  },
}));

jest.mock("@/lib/r2", () => ({ deleteFromR2: jest.fn() }));

const admin = { user: { id: "admin-1", isAdmin: true } };
const params = { params: { id: "req-1" } };
const del = () => new NextRequest("http://localhost/api/requests/req-1", { method: "DELETE" });

const request = {
  id: "req-1",
  userId: "user-1",
  fileId: "model-key.stl",
  attachments: [{ fileId: "photo-key.jpg" }],
};

/** Deleting a request takes its files out of the bucket, not just its row. */
describe("DELETE /api/requests/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(admin);
    (prisma.partRequest.findUnique as jest.Mock).mockResolvedValue(request);
    (prisma.partRequest.count as jest.Mock).mockResolvedValue(0);
    (deleteFromR2 as jest.Mock).mockResolvedValue(undefined);
  });

  it("refuses anyone but an admin", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: "user-1", isAdmin: false } });

    expect((await DELETE(del(), params)).status).toBe(403);
    expect(deleteFromR2).not.toHaveBeenCalled();
    expect(prisma.partRequest.delete).not.toHaveBeenCalled();
  });

  it("deletes the model and every attachment, then the row", async () => {
    const res = await DELETE(del(), params);

    expect(res.status).toBe(200);
    expect(deleteFromR2).toHaveBeenCalledWith("model-key.stl");
    expect(deleteFromR2).toHaveBeenCalledWith("photo-key.jpg");
    expect(prisma.partRequest.delete).toHaveBeenCalledWith({ where: { id: "req-1" } });
  });

  it("keeps a model file that a reorder still points at", async () => {
    (prisma.partRequest.count as jest.Mock).mockResolvedValue(1);

    await DELETE(del(), params);

    expect(prisma.partRequest.count).toHaveBeenCalledWith({
      where: { fileId: "model-key.stl", id: { not: "req-1" } },
    });
    expect(deleteFromR2).not.toHaveBeenCalledWith("model-key.stl");
    expect(deleteFromR2).toHaveBeenCalledWith("photo-key.jpg");
    expect(prisma.partRequest.delete).toHaveBeenCalled();
  });

  it("leaves the row in place when storage refuses, so a retry can finish", async () => {
    (deleteFromR2 as jest.Mock).mockRejectedValue(new Error("R2 down"));
    jest.spyOn(console, "error").mockImplementation(() => {});

    const res = await DELETE(del(), params);

    expect(res.status).toBe(503);
    expect(prisma.partRequest.delete).not.toHaveBeenCalled();
  });
});
