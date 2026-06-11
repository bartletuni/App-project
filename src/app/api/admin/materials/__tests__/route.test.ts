import { POST } from "../route";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";

// Mock the dependencies
jest.mock("@/lib/prisma", () => ({
  prisma: {
    material: {
      create: jest.fn(),
    },
  },
}));

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/r2", () => ({
  uploadToR2: jest.fn(),
}));

describe("POST /api/admin/materials", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return a generic error message when database creation fails, not leaking details", async () => {
    // 1. Mock session to be an admin
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: "admin-id",
        isAdmin: true,
      },
    });

    // 2. Mock prisma to throw a generic error
    const rawErrorMessage = "Secret Database Path Error or Schema Leak";
    (prisma.material.create as jest.Mock).mockRejectedValue(new Error(rawErrorMessage));

    // 3. Construct a dummy request with required form data
    const formData = new FormData();
    formData.append("name", "Test Material");

    const req = new NextRequest("http://localhost:3000/api/admin/materials", {
      method: "POST",
      body: formData,
    });

    // 4. Call the POST handler
    const response = await POST(req);

    // 5. Check response status and parsed body
    expect(response.status).toBe(500);

    const data = await response.json();

    // The returned error should NOT include the sensitive info
    expect(data.error).not.toContain(rawErrorMessage);
    expect(data.error).toBe("Failed to create material");
  });
});
