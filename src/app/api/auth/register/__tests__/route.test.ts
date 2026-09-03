import { NextRequest } from "next/server";
import { POST } from "../route";
import { prisma } from "@/lib/prisma";

// Mock the prisma client and NextResponse
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
  },
}));

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn(),
    },
  })),
}));

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (body: any) => {
    return new NextRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    });
  };

  const validBody = {
    name: "Test User",
    email: "test@example.com",
    password: "Password123!",
    shippingAddress: "123 Test St",
    billingAddress: "123 Test St",
    phone: "1234567890",
  };

  it("should return 400 if password does not meet complexity requirements", async () => {
    const invalidPasswords = [
      "short1!",        // too short
      "password123!",   // no uppercase
      "PASSWORD123!",   // no lowercase
      "Passwordabc!",   // no numbers
      "Password123",    // no special characters
    ];

    for (const invalidPassword of invalidPasswords) {
      const req = createRequest({ ...validBody, password: invalidPassword });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Password must be at least 8 characters and include uppercase, lowercase, numbers, and special characters");
    }
  });

  it("should pass validation for valid passwords", async () => {
    // Mock user creation successful
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({ id: "1", email: "test@example.com" });
    (prisma.phoneNumber.findFirst as jest.Mock).mockResolvedValue(null);

    const validPasswords = [
      "Password123!",
      "MyP@ssw0rd!",
      "V3ryS3cur3#Pwd",
    ];

    for (const validPassword of validPasswords) {
      const req = createRequest({ ...validBody, password: validPassword });
      const res = await POST(req);
      expect(res.status).toBe(201);
    }
  });

  // Someone who asked for a quote without signing up already has a row: an
  // unclaimed account opened by POST /api/requests/guest. Registering the same
  // address has to claim it, not collide with it, or the quotes they already
  // sent are stranded on an account they can never sign into.
  describe("claiming a no-account quote", () => {
    it("upgrades the unclaimed row in place instead of rejecting the address", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "guest-1", isGuest: true });
      (prisma.user.update as jest.Mock).mockResolvedValue({
        id: "guest-1",
        email: "test@example.com",
        name: "Test User",
      });
      (prisma.phoneNumber.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await POST(createRequest(validBody));

      expect(res.status).toBe(201);
      expect(prisma.user.create).not.toHaveBeenCalled();
      const update = (prisma.user.update as jest.Mock).mock.calls[0][0];
      expect(update.where).toEqual({ id: "guest-1" });
      expect(update.data.isGuest).toBe(false);
      expect(update.data.password).not.toBe(validBody.password);
    });

    it("does not duplicate a phone number the quote already recorded", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "guest-1", isGuest: true });
      (prisma.user.update as jest.Mock).mockResolvedValue({ id: "guest-1", email: "test@example.com" });
      (prisma.phoneNumber.findFirst as jest.Mock).mockResolvedValue({ id: "phone-1" });

      const res = await POST(createRequest(validBody));

      expect(res.status).toBe(201);
      expect(prisma.phoneNumber.create).not.toHaveBeenCalled();
    });

    it("still rejects an address that belongs to a real account", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "user-1", isGuest: false });

      const res = await POST(createRequest(validBody));

      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe("User with this email already exists");
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });
});
