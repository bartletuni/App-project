import { POST } from "../route";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";

jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    phoneNumber: {
      findFirst: jest.fn().mockResolvedValue({ id: "phone-1" }),
      create: jest.fn().mockResolvedValue({ id: "phone-1" })
    },
    partRequest: { create: jest.fn().mockResolvedValue({ id: "req-1" }) },
  }
}));

jest.mock("@/lib/r2", () => ({
  uploadToR2: jest.fn().mockResolvedValue("test-file-id"),
}));

jest.mock("resend", () => {
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: { send: jest.fn() }
    }))
  };
});

describe("POST /api/requests", () => {
  beforeEach(() => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: "user-1", email: "test@example.com", name: "Test" } });
  });

  const createRequest = (filename: string, fileContent: Buffer) => {
    const formData = new FormData();
    const file = new File([fileContent], filename, { type: "application/octet-stream" });
    formData.append("file", file);
    formData.append("quantity", "1");
    formData.append("material", "PLA");
    formData.append("dateNeeded", new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()); // 5 days from now
    formData.append("phoneNumber", "1234567890");

    return new NextRequest("http://localhost/api/requests", {
      method: "POST",
      body: formData,
    });
  };

  it("should accept valid ZIP files", async () => {
    const req = createRequest("test.zip", Buffer.from([0x50, 0x4B, 0x03, 0x04]));
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("should accept valid ASCII STL files", async () => {
    const req = createRequest("test.stl", Buffer.from("solid test"));
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("should accept valid binary STL files", async () => {
    const b = Buffer.alloc(84);
    b.writeUInt32LE(0, 80);
    const req = createRequest("test.stl", b);
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("should reject files with valid extension but invalid content", async () => {
    const req = createRequest("malicious.stl", Buffer.from("console.log('pwned')"));
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Only valid .STL and .ZIP files are allowed");
  });

  it("should reject files with invalid extension but valid magic numbers", async () => {
    const req = createRequest("malicious.txt", Buffer.from("solid test"));
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Only .STL and .ZIP files are allowed");
  });
});
