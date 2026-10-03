import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { PATCH } from "../tracking/route";
import { prisma } from "@/lib/prisma";

jest.mock("next-auth/next", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    partRequest: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const admin = { user: { id: "admin-1", email: "admin@example.com", isAdmin: true } };
const customer = { user: { id: "user-1", email: "user@example.com", isAdmin: false } };
const params = { params: { id: "req-1" } };

const patch = (body: unknown) =>
  new NextRequest("http://localhost/api/requests/req-1/tracking", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("PATCH /api/requests/[id]/tracking", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.partRequest.findUnique as jest.Mock).mockResolvedValue({ id: "req-1" });
    (prisma.partRequest.update as jest.Mock).mockImplementation(({ data }) => Promise.resolve({ id: "req-1", ...data }));
  });

  it("refuses anyone but an admin", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    expect((await PATCH(patch({ trackingNumber: "1" }), params)).status).toBe(401);

    (getServerSession as jest.Mock).mockResolvedValue(customer);
    expect((await PATCH(patch({ trackingNumber: "1" }), params)).status).toBe(403);

    expect(prisma.partRequest.update).not.toHaveBeenCalled();
  });

  it("leaves carrier and service alone when only a tracking number is sent", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(admin);

    const res = await PATCH(patch({ trackingNumber: " 9400100000000000000000 " }), params);

    expect(res.status).toBe(200);
    expect(prisma.partRequest.update).toHaveBeenCalledWith({
      where: { id: "req-1" },
      data: { trackingNumber: "9400100000000000000000" },
    });
  });

  it("stores carrier and service with the tracking number", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(admin);

    const res = await PATCH(
      patch({ trackingNumber: "1Z999AA10123456784", carrier: "UPS", service: " Ground " }),
      params
    );

    expect(res.status).toBe(200);
    expect(prisma.partRequest.update).toHaveBeenCalledWith({
      where: { id: "req-1" },
      data: { trackingNumber: "1Z999AA10123456784", shippingCarrier: "UPS", shippingService: "Ground" },
    });
  });

  it("clears the tracking number and service with empty strings", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(admin);

    await PATCH(patch({ trackingNumber: "", carrier: "USPS", service: "" }), params);

    expect(prisma.partRequest.update).toHaveBeenCalledWith({
      where: { id: "req-1" },
      data: { trackingNumber: null, shippingCarrier: "USPS", shippingService: null },
    });
  });

  it("rejects a carrier outside the closed set", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(admin);

    for (const carrier of ["usps", "Pony Express", null, 7]) {
      const res = await PATCH(patch({ trackingNumber: "1", carrier }), params);
      expect(res.status).toBe(400);
    }
    expect(prisma.partRequest.update).not.toHaveBeenCalled();
  });

  it("rejects a service that is not a string, or too long", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(admin);

    expect((await PATCH(patch({ trackingNumber: "1", service: 5 }), params)).status).toBe(400);
    expect((await PATCH(patch({ trackingNumber: "1", service: "x".repeat(61) }), params)).status).toBe(400);
    expect(prisma.partRequest.update).not.toHaveBeenCalled();
  });

  it("still requires the tracking number key", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(admin);

    const res = await PATCH(patch({ carrier: "UPS" }), params);

    expect(res.status).toBe(400);
    expect(prisma.partRequest.update).not.toHaveBeenCalled();
  });

  it("returns 404 for a request that does not exist", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(admin);
    (prisma.partRequest.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await PATCH(patch({ trackingNumber: "1" }), params);

    expect(res.status).toBe(404);
    expect(prisma.partRequest.update).not.toHaveBeenCalled();
  });
});
