import { NextRequest } from "next/server";
import { POST } from "../route";
import { prisma } from "@/lib/prisma";

// Mock the prisma client and NextResponse
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    phoneNumber: {
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
});
