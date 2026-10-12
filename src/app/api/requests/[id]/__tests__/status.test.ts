import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { PATCH } from "../status/route";
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

const mockSend = jest.fn();
jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: mockSend } })),
}));

const admin = { user: { id: "admin-1", email: "admin@example.com", isAdmin: true } };
const params = { params: { id: "req-1" } };

const patch = (status: string) =>
  new NextRequest("http://localhost/api/requests/req-1/status", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

const row = (overrides: Record<string, unknown> = {}) => ({
  id: "req-1",
  kind: "REQUEST",
  status: "ACTIVE",
  userId: "user-1",
  fileId: "model-key.stl",
  fileName: "bracket.stl",
  partName: null,
  invoiceNumber: null,
  trackingNumber: null,
  shippingCarrier: "USPS",
  shippingService: null,
  guestEmail: null,
  quoteRequested: false,
  user: { id: "user-1", email: "sam@example.com", name: "Sam", isGuest: false },
  ...overrides,
});

/**
 * A status change emails the customer it belongs to — when it is a moment they
 * would want to hear about, and never at an address typed into the public form.
 */
describe("PATCH /api/requests/[id]/status — customer email", () => {
  const ORIGINAL_KEY = process.env.RESEND_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test";
    (getServerSession as jest.Mock).mockResolvedValue(admin);
    (prisma.partRequest.update as jest.Mock).mockImplementation(({ data }) =>
      Promise.resolve({ id: "req-1", ...data })
    );
    mockSend.mockResolvedValue({ data: { id: "email-1" }, error: null });
  });

  afterAll(() => {
    process.env.RESEND_API_KEY = ORIGINAL_KEY;
  });

  it("emails the account holder when their part ships, with the tracking number", async () => {
    (prisma.partRequest.findUnique as jest.Mock).mockResolvedValue(
      row({ status: "COMPLETED", trackingNumber: "9400100000000000000000" })
    );

    const res = await PATCH(patch("SHIPPED"), params);

    expect(res.status).toBe(200);
    expect(mockSend).toHaveBeenCalledTimes(1);
    const sent = mockSend.mock.calls[0][0];
    expect(sent.to).toBe("sam@example.com");
    expect(sent.subject).toBe("Status update: SHIPPED — bracket.stl");
    expect(sent.html).toContain("9400100000000000000000");
  });

  it("sends the invoice email, number and all, when the status is INVOICE SENT", async () => {
    (prisma.partRequest.findUnique as jest.Mock).mockResolvedValue(
      row({ status: "ACTIVE", invoiceNumber: "INV-0042" })
    );

    await PATCH(patch("INVOICE SENT"), params);

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend.mock.calls[0][0].subject).toBe("Invoice INV-0042 for bracket.stl");
    expect(mockSend.mock.calls[0][0].html).toContain("INV-0042");
  });

  it("labels an estimate as an estimate, not a build", async () => {
    (prisma.partRequest.findUnique as jest.Mock).mockResolvedValue(
      row({ kind: "ESTIMATE", status: "ESTIMATE IN REVIEW", fileId: null, fileName: null, partName: "Hinge" })
    );

    await PATCH(patch("ESTIMATE SENT"), params);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const sent = mockSend.mock.calls[0][0];
    expect(sent.subject).toBe("Status update: ESTIMATE SENT — Hinge");
    expect(sent.html).toContain("Estimate ⁄ Update");
    expect(sent.html).toContain("not a guaranteed price");
  });

  it("says nothing when the status did not change", async () => {
    (prisma.partRequest.findUnique as jest.Mock).mockResolvedValue(row({ status: "SHIPPED" }));

    await PATCH(patch("SHIPPED"), params);

    expect(prisma.partRequest.update).toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("says nothing for a status the customer has no reason to hear about", async () => {
    (prisma.partRequest.findUnique as jest.Mock).mockResolvedValue(row({ status: "ACTIVE" }));

    await PATCH(patch("PENDING"), params);

    expect(mockSend).not.toHaveBeenCalled();
  });

  it("never emails a no-account estimate", async () => {
    (prisma.partRequest.findUnique as jest.Mock).mockResolvedValue(
      row({
        kind: "ESTIMATE",
        status: "ESTIMATE IN REVIEW",
        guestEmail: "typed@example.com",
        user: { id: "guest", email: "estimates@guest.invalid", name: "Guest", isGuest: true },
      })
    );

    const res = await PATCH(patch("ESTIMATE SENT"), params);

    expect(res.status).toBe(200);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("keeps the status change when the email is refused", async () => {
    (prisma.partRequest.findUnique as jest.Mock).mockResolvedValue(row({ status: "ACTIVE" }));
    mockSend.mockResolvedValue({ data: null, error: { message: "domain not verified" } });
    jest.spyOn(console, "error").mockImplementation(() => {});

    const res = await PATCH(patch("COMPLETED"), params);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "req-1", status: "COMPLETED" });
  });
});
