import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { GET, POST } from "../route";
import { prisma } from "@/lib/prisma";

jest.mock("next-auth/next", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const customer = { user: { id: "user-1", email: "user@example.com" } };

const post = (body: unknown) =>
  new NextRequest("http://localhost/api/user/addresses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("/api/user/addresses", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("refuses both methods without a session", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    expect((await GET()).status).toBe(401);
    expect((await POST(post({ shippingAddress: "a", billingAddress: "b" }))).status).toBe(401);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("returns only the session's own addresses", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(customer);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      shippingAddress: "1 Main St, Murray, UT 84107",
      billingAddress: null,
    });

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      shippingAddress: "1 Main St, Murray, UT 84107",
      billingAddress: "",
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { shippingAddress: true, billingAddress: true },
    });
  });

  it("rejects values that are not strings", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(customer);

    const res = await POST(post({ shippingAddress: 42, billingAddress: "x" }));

    expect(res.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("rejects a blank address", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(customer);

    const res = await POST(post({ shippingAddress: "   ", billingAddress: "1 Main St" }));

    expect(res.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("rejects an address over 500 characters", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(customer);

    const res = await POST(post({ shippingAddress: "a".repeat(501), billingAddress: "1 Main St" }));

    expect(res.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("stores trimmed addresses on the session's own row", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(customer);
    (prisma.user.update as jest.Mock).mockResolvedValue({});

    const res = await POST(
      post({ shippingAddress: "  PSC 1234, Box 5678, APO AE 09204 ", billingAddress: "1 Main St\n" })
    );

    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { shippingAddress: "PSC 1234, Box 5678, APO AE 09204", billingAddress: "1 Main St" },
    });
  });
});
