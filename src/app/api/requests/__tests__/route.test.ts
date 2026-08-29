import { POST } from "../route";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";

jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    phoneNumber: {
      findFirst: jest.fn().mockResolvedValue({ id: "phone-1" }),
      create: jest.fn().mockResolvedValue({ id: "phone-1" })
    },
    partRequest: { create: jest.fn().mockResolvedValue({ id: "req-1", attachments: [] }) },
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
    (prisma.partRequest.create as jest.Mock).mockClear();
  });

  const createRequest = (filename: string, fileContent: Buffer, quoteRequested?: string) => {
    const formData = new FormData();
    const file = new File([fileContent], filename, { type: "application/octet-stream" });
    formData.append("file", file);
    formData.append("quantity", "1");
    formData.append("material", "PLA");
    formData.append("dateNeeded", new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()); // 5 days from now
    formData.append("phoneNumber", "1234567890");
    if (quoteRequested !== undefined) formData.append("quoteRequested", quoteRequested);

    return new NextRequest("http://localhost/api/requests", {
      method: "POST",
      body: formData,
    });
  };

  const createdRequestData = () =>
    (prisma.partRequest.create as jest.Mock).mock.calls[0][0].data;

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
    expect(body.error).toBe("File content does not match its extension");
  });

  it("should reject files with invalid extension but valid magic numbers", async () => {
    const req = createRequest("malicious.txt", Buffer.from("solid test"));
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Only .STL and .ZIP files are allowed");
  });

  it("should reject polyglot files (e.g. ZIP extension with STL magic numbers)", async () => {
    const req = createRequest("polyglot.zip", Buffer.from("solid test"));
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("File content does not match its extension");
  });

  it("should reject polyglot files (e.g. STL extension with ZIP magic numbers)", async () => {
    const req = createRequest("polyglot.stl", Buffer.from([0x50, 0x4B, 0x03, 0x04]));
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("File content does not match its extension");
  });

  // A submission with no 3D model: the customer describes the part instead.
  const createDescriptionRequest = (
    overrides: {
      partName?: string;
      partDescription?: string;
      dimensions?: string;
      references?: { name: string; content: Buffer }[];
      quoteRequested?: string;
    } = {}
  ) => {
    const formData = new FormData();
    formData.append("submissionType", "DESCRIPTION");
    formData.append("partName", overrides.partName ?? "Dryer door catch");
    formData.append(
      "partDescription",
      overrides.partDescription ??
        "A small nylon catch that holds the dryer door shut. The tab snapped off."
    );
    if (overrides.dimensions !== undefined) formData.append("dimensions", overrides.dimensions);
    for (const reference of overrides.references ?? []) {
      formData.append(
        "references",
        new File([new Uint8Array(reference.content)], reference.name, { type: "application/octet-stream" })
      );
    }
    formData.append("quantity", "1");
    formData.append("material", "PLA");
    formData.append("dateNeeded", new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString());
    formData.append("phoneNumber", "1234567890");
    if (overrides.quoteRequested !== undefined) {
      formData.append("quoteRequested", overrides.quoteRequested);
    }

    return new NextRequest("http://localhost/api/requests", { method: "POST", body: formData });
  };

  const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);

  it("accepts a request with no model file when the part is described", async () => {
    const res = await POST(createDescriptionRequest());
    expect(res.status).toBe(201);

    const data = createdRequestData();
    expect(data.submissionType).toBe("DESCRIPTION");
    expect(data.fileId).toBeNull();
    expect(data.fileName).toBeNull();
    expect(data.partName).toBe("Dryer door catch");
    expect(data.partDescription).toContain("nylon catch");
  });

  it("still requires a file when no description is offered", async () => {
    const formData = new FormData();
    formData.append("quantity", "1");
    formData.append("dateNeeded", new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString());
    formData.append("phoneNumber", "1234567890");
    const res = await POST(
      new NextRequest("http://localhost/api/requests", { method: "POST", body: formData })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("STL or ZIP file is required");
  });

  it("rejects a described part with no name", async () => {
    const res = await POST(createDescriptionRequest({ partName: "" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Part name is required");
  });

  it("rejects a described part whose description is too thin", async () => {
    const res = await POST(createDescriptionRequest({ partDescription: "broken" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/at least 20 characters/);
  });

  it("always quotes a described part, even when the flag says otherwise", async () => {
    const res = await POST(createDescriptionRequest({ quoteRequested: "false" }));
    expect(res.status).toBe(201);
    expect(createdRequestData().quoteRequested).toBe(true);
  });

  it("files a described part on the quote track", async () => {
    const res = await POST(createDescriptionRequest());
    expect(res.status).toBe(201);

    const data = createdRequestData();
    expect(data.kind).toBe("QUOTE");
    expect(data.status).toBe("QUOTE REQUESTED");
  });

  it("files a quoted upload on the quote track", async () => {
    const res = await POST(createRequest("test.stl", Buffer.from("solid test"), "true"));
    expect(res.status).toBe(201);

    const data = createdRequestData();
    expect(data.kind).toBe("QUOTE");
    expect(data.status).toBe("QUOTE REQUESTED");
  });

  it("files an ordinary upload straight onto the build queue", async () => {
    const res = await POST(createRequest("test.stl", Buffer.from("solid test")));
    expect(res.status).toBe(201);

    const data = createdRequestData();
    expect(data.kind).toBe("REQUEST");
    expect(data.status).toBe("PENDING");
  });

  it("stores reference photos attached to a described part", async () => {
    const res = await POST(
      createDescriptionRequest({ references: [{ name: "catch.png", content: PNG }] })
    );
    expect(res.status).toBe(201);

    const data = createdRequestData();
    expect(data.attachments.create).toEqual([
      expect.objectContaining({ fileName: "catch.png", mimeType: "image/png", fileId: "test-file-id" }),
    ]);
  });

  it("rejects a reference file whose bytes do not match its extension", async () => {
    const res = await POST(
      createDescriptionRequest({ references: [{ name: "catch.png", content: Buffer.from("not a png") }] })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Reference file content does not match its extension");
  });

  it("rejects an unsupported reference file type", async () => {
    const res = await POST(
      createDescriptionRequest({ references: [{ name: "catch.exe", content: PNG }] })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(
      "Reference files must be JPG, PNG, WEBP, GIF, HEIC, or PDF"
    );
  });

  it("stores the quote flag when the composer's checkbox is ticked", async () => {
    const req = createRequest("test.zip", Buffer.from([0x50, 0x4B, 0x03, 0x04]), "true");
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(createdRequestData().quoteRequested).toBe(true);
  });

  it("stores no quote flag when the checkbox is left off", async () => {
    const req = createRequest("test.zip", Buffer.from([0x50, 0x4B, 0x03, 0x04]), "false");
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(createdRequestData().quoteRequested).toBe(false);
  });

  it("defaults the quote flag to false when the field is absent", async () => {
    const req = createRequest("test.zip", Buffer.from([0x50, 0x4B, 0x03, 0x04]));
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(createdRequestData().quoteRequested).toBe(false);
  });
});
