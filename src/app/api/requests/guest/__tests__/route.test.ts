import { NextRequest } from "next/server";
import { POST } from "../route";
import { prisma } from "@/lib/prisma";
import { issueFormToken } from "@/lib/form-token";
import {
  GUEST_OWNER_EMAIL,
  GUEST_QUOTE_TOKEN_SCOPE,
  HONEYPOT_FIELD,
  FORM_TOKEN_FIELD,
} from "@/lib/guest-quote";
import { MIN_FILL_MS } from "@/lib/form-token";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    phoneNumber: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    partRequest: {
      create: jest.fn(),
    },
    rateLimit: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/r2", () => ({
  uploadToR2: jest.fn().mockResolvedValue("test-file-id"),
}));

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: jest.fn().mockResolvedValue({ data: { id: "email-1" }, error: null }) },
  })),
}));

/**
 * The public quote endpoint. Every test here is either "a real customer gets
 * through" or "a bot does not" — those are the only two things this route has
 * to get right.
 */
describe("POST /api/requests/guest", () => {
  beforeAll(() => {
    process.env.NEXTAUTH_SECRET = "test-secret-for-guest-quotes";
    process.env.RESEND_API_KEY = "re_test";
    delete process.env.TURNSTILE_SECRET_KEY;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // No system owner row yet, so the first quote creates one.
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({ id: "guest-owner" });
    (prisma.phoneNumber.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.phoneNumber.create as jest.Mock).mockResolvedValue({ id: "phone-1" });
    (prisma.partRequest.create as jest.Mock).mockResolvedValue({
      id: "clx000000000abcdef",
      fileName: null,
      partName: "Dryer door catch",
    });
    // Under every ceiling unless a test says otherwise.
    (prisma.rateLimit.upsert as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.rateLimit.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
  });

  /** A described part — the fast path, and the one with no file to fake. */
  const buildForm = (overrides: Record<string, string> = {}) => {
    const formData = new FormData();
    formData.append("submissionType", "DESCRIPTION");
    formData.append("partName", "Dryer door catch");
    formData.append(
      "partDescription",
      "A small nylon catch that holds the dryer door shut. The tab snapped off."
    );
    formData.append("name", "Alex Rivera");
    formData.append("email", "Alex@Example.com");
    formData.append("phone", "(385) 695-4178");
    formData.append(
      FORM_TOKEN_FIELD,
      issueFormToken(GUEST_QUOTE_TOKEN_SCOPE, Date.now() - MIN_FILL_MS - 1_000)!
    );
    for (const [key, value] of Object.entries(overrides)) formData.set(key, value);
    return new NextRequest("http://localhost/api/requests/guest", {
      method: "POST",
      body: formData,
    });
  };

  const createdRow = () => (prisma.partRequest.create as jest.Mock).mock.calls[0][0].data;

  it("files a quote for someone with no account", async () => {
    const res = await POST(buildForm());
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.reference).toBe("Q-ABCDEF");

    const row = createdRow();
    expect(row.userId).toBe("guest-owner");
    expect(row.quoteRequested).toBe(true);
    expect(row.kind).toBe("QUOTE");
    expect(row.status).toBe("QUOTE REQUESTED");
  });

  it("stores the contact on the request, since it belongs to no account", async () => {
    await POST(buildForm());

    const row = createdRow();
    expect(row.guestName).toBe("Alex Rivera");
    expect(row.guestEmail).toBe("alex@example.com"); // normalized
    expect(row.guestPhone).toBe("(385) 695-4178");
  });

  it("files it under a system row that is not a person and cannot be signed into", async () => {
    await POST(buildForm());

    const created = (prisma.user.create as jest.Mock).mock.calls[0][0].data;
    expect(created.email).toBe(GUEST_OWNER_EMAIL);
    expect(created.isGuest).toBe(true);
    expect(created.password).toMatch(/^\$2[aby]\$/); // a hash of a secret nobody holds
  });

  it("reuses the system row once it exists", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "guest-owner" });

    await POST(buildForm());

    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(createdRow().userId).toBe("guest-owner");
  });

  it("books a default date rather than demanding one", async () => {
    await POST(buildForm());
    expect(createdRow().dateNeeded).toBeInstanceOf(Date);
  });

  // The security property this lane turns on: anyone can type anyone's address
  // into a public form, so a submission must never reach the account that owns
  // that address — not to file against it, and not to reveal it exists.
  it("never looks the submitted address up against the accounts table", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "guest-owner" });

    await POST(buildForm({ email: "someone.elses@example.com" }));

    for (const call of (prisma.user.findUnique as jest.Mock).mock.calls) {
      expect(call[0].where.email).toBe(GUEST_OWNER_EMAIL);
    }
  });

  it("files a quote for a registered address under the system row, not that account", async () => {
    // Whatever this address belongs to, the quote is not going near it.
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "guest-owner" });

    const res = await POST(buildForm({ email: "owner@takomoco.com" }));

    expect(res.status).toBe(201);
    const row = createdRow();
    expect(row.userId).toBe("guest-owner");
    expect(row.guestEmail).toBe("owner@takomoco.com");
  });

  it("never updates an existing account from a public form", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "guest-owner" });

    await POST(buildForm());

    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("keeps the company with the request, without losing the customer's own words", async () => {
    await POST(buildForm({ company: "Rivera Appliance", notes: "Black, if you have it." }));
    expect(createdRow().notes).toBe("Company: Rivera Appliance\nBlack, if you have it.");
  });

  // --- what must not get through -----------------------------------------

  it("drops a submission that filled in the honeypot, without telling it so", async () => {
    const res = await POST(buildForm({ [HONEYPOT_FIELD]: "https://spam.example" }));

    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ ok: true, reference: null });
    expect(prisma.partRequest.create).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("rejects a blind post that never loaded the form", async () => {
    const res = await POST(buildForm({ [FORM_TOKEN_FIELD]: "" }));
    expect(res.status).toBe(400);
    expect(prisma.partRequest.create).not.toHaveBeenCalled();
  });

  it("rejects a forged token", async () => {
    const res = await POST(buildForm({ [FORM_TOKEN_FIELD]: "guest-quote.1.nonce.forged" }));
    expect(res.status).toBe(400);
    expect(prisma.partRequest.create).not.toHaveBeenCalled();
  });

  it("rejects a submission filled in faster than a person can type", async () => {
    const res = await POST(
      buildForm({ [FORM_TOKEN_FIELD]: issueFormToken(GUEST_QUOTE_TOKEN_SCOPE, Date.now())! })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/faster than the form can be filled/i);
    expect(prisma.partRequest.create).not.toHaveBeenCalled();
  });

  it("turns away a flood from one address", async () => {
    (prisma.rateLimit.upsert as jest.Mock).mockResolvedValue({ count: 99 });

    const res = await POST(buildForm());

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect(prisma.partRequest.create).not.toHaveBeenCalled();
  });

  it("still takes the quote when the rate-limit table is unreachable", async () => {
    (prisma.rateLimit.upsert as jest.Mock).mockRejectedValue(new Error("db down"));

    const res = await POST(buildForm());

    expect(res.status).toBe(201);
  });

  it("rejects a description too thin to quote from", async () => {
    const res = await POST(buildForm({ partDescription: "broken" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/at least 20 characters/);
  });

  it("rejects an address that cannot be one, before touching the database", async () => {
    const res = await POST(buildForm({ email: "alex-at-example" }));
    expect(res.status).toBe(400);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
