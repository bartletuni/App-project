import { GET } from "../route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    material: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

describe("GET /api/materials", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (url: string) => {
    return new NextRequest(url, { method: "GET" });
  };

  it("should apply default pagination (limit 50, offset 0)", async () => {
    const req = createRequest("http://localhost/api/materials");
    await GET(req);

    expect(prisma.material.findMany).toHaveBeenCalledWith({
      orderBy: { name: "asc" },
      take: 50,
      skip: 0,
    });
  });

  it("should apply custom pagination within limits", async () => {
    const req = createRequest("http://localhost/api/materials?limit=20&offset=10");
    await GET(req);

    expect(prisma.material.findMany).toHaveBeenCalledWith({
      orderBy: { name: "asc" },
      take: 20,
      skip: 10,
    });
  });

  it("should cap limit at 100", async () => {
    const req = createRequest("http://localhost/api/materials?limit=200&offset=5");
    await GET(req);

    expect(prisma.material.findMany).toHaveBeenCalledWith({
      orderBy: { name: "asc" },
      take: 100,
      skip: 5,
    });
  });

  it("should handle invalid pagination parameters gracefully", async () => {
    const req = createRequest("http://localhost/api/materials?limit=abc&offset=xyz");
    await GET(req);

    expect(prisma.material.findMany).toHaveBeenCalledWith({
      orderBy: { name: "asc" },
      take: 50,
      skip: 0,
    });
  });
});
