import { NextRequest } from "next/server";
import { GET } from "../route";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

jest.mock("next-auth/next");
jest.mock("@/lib/prisma", () => ({
  prisma: {
    partRequest: {
      findFirst: jest.fn(),
    },
    material: {
      findFirst: jest.fn(),
    },
  },
}));
jest.mock("@aws-sdk/s3-request-presigner");
jest.mock("@/lib/r2", () => ({
  s3Client: {},
}));

const mockGetServerSession = getServerSession as jest.Mock;
const mockPrismaPartRequestFindFirst = prisma.partRequest.findFirst as jest.Mock;
const mockPrismaMaterialFindFirst = prisma.material.findFirst as jest.Mock;
const mockGetSignedUrl = getSignedUrl as jest.Mock;

describe("GET /api/download/[fileId]", () => {
  let req: NextRequest;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    req = new NextRequest("http://localhost/api/download/test-file-id");
    process.env = { ...originalEnv, R2_BUCKET_NAME: "test-bucket" };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns 401 if unauthenticated", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);

    const res = await GET(req, { params: { fileId: "test-file-id" } });
    expect(res.status).toBe(401);

    const data = await res.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 if authenticated but requesting another user's part request (non-admin)", async () => {
    mockGetServerSession.mockResolvedValueOnce({
      user: { id: "user-1", isAdmin: false },
    });
    mockPrismaPartRequestFindFirst.mockResolvedValueOnce({
      fileId: "test-file-id",
      userId: "user-2", // different user
    });

    const res = await GET(req, { params: { fileId: "test-file-id" } });
    expect(res.status).toBe(403);

    const data = await res.json();
    expect(data.error).toBe("Forbidden");
  });

  it("returns presigned URL if authenticated and requesting own part request", async () => {
    mockGetServerSession.mockResolvedValueOnce({
      user: { id: "user-1", isAdmin: false },
    });
    mockPrismaPartRequestFindFirst.mockResolvedValueOnce({
      fileId: "test-file-id",
      userId: "user-1", // same user
    });
    mockGetSignedUrl.mockResolvedValueOnce("https://presigned-url.com/");

    const res = await GET(req, { params: { fileId: "test-file-id" } });
    expect(res.status).toBe(307); // NextResponse.redirect defaults to 307
    expect(res.headers.get("Location")).toBe("https://presigned-url.com/");
  });

  it("returns presigned URL if authenticated and requesting material file", async () => {
    mockGetServerSession.mockResolvedValueOnce({
      user: { id: "user-1", isAdmin: false },
    });
    mockPrismaPartRequestFindFirst.mockResolvedValueOnce(null); // not a part request
    mockPrismaMaterialFindFirst.mockResolvedValueOnce({
      imageId: "test-material-id",
    });
    mockGetSignedUrl.mockResolvedValueOnce("https://presigned-url.com/material");

    const res = await GET(req, { params: { fileId: "test-material-id" } });
    expect(res.status).toBe(307);
    expect(res.headers.get("Location")).toBe("https://presigned-url.com/material");
  });

  it("returns 404 if file not found in part requests or materials", async () => {
    mockGetServerSession.mockResolvedValueOnce({
      user: { id: "user-1", isAdmin: false },
    });
    mockPrismaPartRequestFindFirst.mockResolvedValueOnce(null);
    mockPrismaMaterialFindFirst.mockResolvedValueOnce(null);

    const res = await GET(req, { params: { fileId: "missing-file-id" } });
    expect(res.status).toBe(404);

    const data = await res.json();
    expect(data.error).toBe("File not found");
  });
});
