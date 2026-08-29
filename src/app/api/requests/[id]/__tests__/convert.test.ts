import { POST } from "../convert/route";
import { PATCH as PATCH_STATUS } from "../status/route";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";

jest.mock("next-auth/next", () => ({ getServerSession: jest.fn() }));

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

const convertRequest = (body?: unknown) =>
  new NextRequest("http://localhost/api/requests/req-1/convert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

const statusRequest = (status: string) =>
  new NextRequest("http://localhost/api/requests/req-1/status", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

const params = { params: { id: "req-1" } };

const openQuote = {
  id: "req-1",
  kind: "QUOTE",
  status: "QUOTE ACCEPTED",
  quoteRequested: true,
  quotedPrice: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  (getServerSession as jest.Mock).mockResolvedValue(admin);
  (prisma.partRequest.update as jest.Mock).mockImplementation(({ data }) => ({ ...openQuote, ...data }));
});

describe("POST /api/requests/[id]/convert", () => {
  it("rejects a signed-out caller", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    expect((await POST(convertRequest({}), params)).status).toBe(401);
  });

  it("rejects a customer", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(customer);
    expect((await POST(convertRequest({}), params)).status).toBe(403);
  });

  it("moves a quote onto the build queue", async () => {
    (prisma.partRequest.findUnique as jest.Mock).mockResolvedValue(openQuote);

    const res = await POST(convertRequest({}), params);
    expect(res.status).toBe(200);

    const { data } = (prisma.partRequest.update as jest.Mock).mock.calls[0][0];
    expect(data.kind).toBe("REQUEST");
    expect(data.status).toBe("PENDING");
    expect(data.convertedAt).toBeInstanceOf(Date);
    // The record that this job was quoted first is not erased.
    expect(data.quoteRequested).toBeUndefined();
  });

  it("records the quoted price when one is sent along", async () => {
    (prisma.partRequest.findUnique as jest.Mock).mockResolvedValue(openQuote);

    await POST(convertRequest({ quotedPrice: "$142.50" }), params);
    expect((prisma.partRequest.update as jest.Mock).mock.calls[0][0].data.quotedPrice).toBe("$142.50");
  });

  it("leaves an existing price alone when none is sent", async () => {
    (prisma.partRequest.findUnique as jest.Mock).mockResolvedValue({ ...openQuote, quotedPrice: "$99" });

    await POST(convertRequest(), params);
    expect((prisma.partRequest.update as jest.Mock).mock.calls[0][0].data).not.toHaveProperty("quotedPrice");
  });

  it("clears the price when an empty string is sent", async () => {
    (prisma.partRequest.findUnique as jest.Mock).mockResolvedValue({ ...openQuote, quotedPrice: "$99" });

    await POST(convertRequest({ quotedPrice: "" }), params);
    expect((prisma.partRequest.update as jest.Mock).mock.calls[0][0].data.quotedPrice).toBeNull();
  });

  it("404s on a request that does not exist", async () => {
    (prisma.partRequest.findUnique as jest.Mock).mockResolvedValue(null);
    expect((await POST(convertRequest({}), params)).status).toBe(404);
  });

  it("refuses to convert something that is already a build request", async () => {
    (prisma.partRequest.findUnique as jest.Mock).mockResolvedValue({
      ...openQuote,
      kind: "REQUEST",
      status: "ACTIVE",
    });

    const res = await POST(convertRequest({}), params);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/already a build request/);
    expect(prisma.partRequest.update).not.toHaveBeenCalled();
  });

  it("refuses to convert a cancelled quote", async () => {
    (prisma.partRequest.findUnique as jest.Mock).mockResolvedValue({ ...openQuote, status: "CANCELLED" });

    const res = await POST(convertRequest({}), params);
    expect(res.status).toBe(400);
    expect(prisma.partRequest.update).not.toHaveBeenCalled();
  });

  it("rejects an over-long price", async () => {
    (prisma.partRequest.findUnique as jest.Mock).mockResolvedValue(openQuote);

    const res = await POST(convertRequest({ quotedPrice: "$".repeat(101) }), params);
    expect(res.status).toBe(400);
    expect(prisma.partRequest.update).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/requests/[id]/status", () => {
  it("accepts a quote status on a quote", async () => {
    (prisma.partRequest.findUnique as jest.Mock).mockResolvedValue(openQuote);
    expect((await PATCH_STATUS(statusRequest("QUOTE SENT"), params)).status).toBe(200);
  });

  it("refuses a build status on a quote", async () => {
    (prisma.partRequest.findUnique as jest.Mock).mockResolvedValue(openQuote);

    const res = await PATCH_STATUS(statusRequest("SHIPPED"), params);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Invalid status for a quote/);
    expect(prisma.partRequest.update).not.toHaveBeenCalled();
  });

  it("refuses a quote status on a build request", async () => {
    (prisma.partRequest.findUnique as jest.Mock).mockResolvedValue({
      ...openQuote,
      kind: "REQUEST",
      status: "PENDING",
    });

    const res = await PATCH_STATUS(statusRequest("QUOTE SENT"), params);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Invalid status for a request/);
  });

  it("still accepts the original build statuses", async () => {
    (prisma.partRequest.findUnique as jest.Mock).mockResolvedValue({
      ...openQuote,
      kind: "REQUEST",
      status: "PENDING",
    });
    expect((await PATCH_STATUS(statusRequest("ACTIVE"), params)).status).toBe(200);
  });
});
