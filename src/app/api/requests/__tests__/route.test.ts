import { POST } from "../route";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { objectExistsInR2, uploadToR2 } from "@/lib/r2";

jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    phoneNumber: {
      findFirst: jest.fn().mockResolvedValue({ id: "phone-1" }),
      create: jest.fn().mockResolvedValue({ id: "phone-1" })
    },
    partRequest: {
      create: jest.fn().mockResolvedValue({ id: "req-1", attachments: [] }),
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn(),
    },
  }
}));

jest.mock("@/lib/r2", () => ({
  uploadToR2: jest.fn().mockResolvedValue("test-file-id"),
  objectExistsInR2: jest.fn().mockResolvedValue(true),
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
    (prisma.partRequest.count as jest.Mock).mockReset().mockResolvedValue(0);
    (uploadToR2 as jest.Mock).mockClear();
    (objectExistsInR2 as jest.Mock).mockReset().mockResolvedValue(true);
    (prisma.partRequest.findFirst as jest.Mock).mockReset().mockResolvedValue(null);
  });

  const createRequest = (
    filename: string,
    fileContent: Buffer,
    quoteRequested?: string,
    extra?: { quantity?: string; material?: string; isFreeSample?: string }
  ) => {
    const formData = new FormData();
    const file = new File([fileContent], filename, { type: "application/octet-stream" });
    formData.append("file", file);
    formData.append("quantity", extra?.quantity ?? "1");
    formData.append("material", extra?.material ?? "PLA");
    formData.append("dateNeeded", new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()); // 5 days from now
    formData.append("phoneNumber", "1234567890");
    if (quoteRequested !== undefined) formData.append("quoteRequested", quoteRequested);
    if (extra?.isFreeSample !== undefined) formData.append("isFreeSample", extra.isFreeSample);

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
    expect(body.error).toBe("Only .STL, .STEP/.STP, .IGES/.IGS, and .ZIP files are accepted");
  });

  it("should accept a STEP export, stored under its own media type", async () => {
    const req = createRequest("bracket.step", Buffer.from("ISO-10303-21;\nHEADER;\nENDSEC;\n"));
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(createdRequestData().fileName).toBe("bracket.step");
    expect(uploadToR2).toHaveBeenCalledWith("bracket.step", "model/step", expect.any(Buffer));
  });

  it("should accept an IGES export", async () => {
    const start = `${"".padEnd(72)}S${"1".padStart(7)}`;
    const req = createRequest("bracket.igs", Buffer.from(start));
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(uploadToR2).toHaveBeenCalledWith("bracket.igs", "model/iges", expect.any(Buffer));
  });

  it("stores the equipment and part number as labelled lines ahead of the notes", async () => {
    const formData = new FormData();
    formData.append("file", new File([Buffer.from("solid test")], "test.stl"));
    formData.append("quantity", "1");
    formData.append("material", "PLA");
    formData.append("notes", "Black, if you have it.");
    formData.append("equipment", "Bosch WTG86");
    formData.append("partNumber", "00 4.1.12");
    formData.append("dateNeeded", new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString());
    formData.append("phoneNumber", "1234567890");
    const res = await POST(
      new NextRequest("http://localhost/api/requests", { method: "POST", body: formData })
    );
    expect(res.status).toBe(201);
    expect(createdRequestData().notes).toBe(
      "Equipment: Bosch WTG86\nPart number: 00 4.1.12\nBlack, if you have it."
    );
  });

  it("should refuse a model over the size limit, and point to email", async () => {
    const big = Buffer.concat([Buffer.from("solid big"), Buffer.alloc(4 * 1024 * 1024)]);
    const res = await POST(createRequest("big.stl", big));
    expect(res.status).toBe(400);
    const { error } = await res.json();
    expect(error).toMatch(/exceeds the 4MB limit/);
    expect(error).toMatch(/info@takomoco\.com/);
    expect(uploadToR2).not.toHaveBeenCalled();
  });

  it("should refuse described-part photos that are over the limit together", async () => {
    const photo = { name: "p.png", content: Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(2.5 * 1024 * 1024)]) };
    const res = await POST(
      createDescriptionRequest({
        references: [photo, { ...photo, name: "q.png" }],
      })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/total 4MB per request/);
    expect(uploadToR2).not.toHaveBeenCalled();
  });

  it("should reject a STEP file whose content is something else", async () => {
    const res = await POST(createRequest("bracket.step", Buffer.from("MZ not a model")));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("File content does not match its extension");
    expect(uploadToR2).not.toHaveBeenCalled();
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
      isFreeSample?: string;
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
    if (overrides.isFreeSample !== undefined) formData.append("isFreeSample", overrides.isFreeSample);
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
    expect((await res.json()).error).toBe("STL, STEP, IGES, or ZIP file is required");
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

  it("always prices a described part, even when the flag says otherwise", async () => {
    const res = await POST(createDescriptionRequest({ quoteRequested: "false" }));
    expect(res.status).toBe(201);
    expect(createdRequestData().quoteRequested).toBe(true);
  });

  it("files a described part as an estimate — there is no model to guarantee against", async () => {
    const res = await POST(createDescriptionRequest());
    expect(res.status).toBe(201);

    const data = createdRequestData();
    expect(data.kind).toBe("ESTIMATE");
    expect(data.status).toBe("ESTIMATE REQUESTED");
  });

  it("files a signed-in customer's priced upload as a quote", async () => {
    // The one submission that earns a guaranteed price: an account holder, and
    // the part file we would actually print.
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

  describe("free PLA 2.0 sample", () => {
    it("pins material and quantity, waives the quote, and marks the row when eligible", async () => {
      (prisma.partRequest.count as jest.Mock).mockResolvedValue(0);
      const req = createRequest(
        "test.stl",
        Buffer.from("solid test"),
        "true", // even a ticked quote box is overridden — nothing to price
        { quantity: "5", material: "Carbon Fiber PLA", isFreeSample: "true" }
      );
      const res = await POST(req);
      expect(res.status).toBe(201);

      const data = createdRequestData();
      expect(data.isFreeSample).toBe(true);
      expect(data.material).toBe("PLA 2.0");
      expect(data.quantity).toBe(1);
      expect(data.quoteRequested).toBe(false);
      expect(data.kind).toBe("REQUEST");
      expect(data.status).toBe("PENDING");
      expect(data.quotedPrice).toBe("$0.00 — Free sample");
    });

    it("rejects a second free sample from the same account", async () => {
      (prisma.partRequest.count as jest.Mock).mockResolvedValue(1);
      const req = createRequest("test.stl", Buffer.from("solid test"), undefined, {
        isFreeSample: "true",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe("You've already claimed your free PLA 2.0 sample.");
      expect(prisma.partRequest.create).not.toHaveBeenCalled();
    });

    it("still estimates a described free sample, since it still needs modelling", async () => {
      (prisma.partRequest.count as jest.Mock).mockResolvedValue(0);
      const res = await POST(
        createDescriptionRequest({ quoteRequested: "false", isFreeSample: "true" })
      );
      expect(res.status).toBe(201);

      const data = createdRequestData();
      expect(data.isFreeSample).toBe(true);
      expect(data.material).toBe("PLA 2.0");
      expect(data.quantity).toBe(1);
      expect(data.quoteRequested).toBe(true);
      expect(data.kind).toBe("ESTIMATE");
    });

    it("does not enforce eligibility, pin material/quantity, or waive quoting when the flag is absent", async () => {
      const req = createRequest("test.stl", Buffer.from("solid test"), "true", {
        quantity: "3",
        material: "PETG",
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
      expect(prisma.partRequest.count).not.toHaveBeenCalled();

      const data = createdRequestData();
      expect(data.isFreeSample).toBe(false);
      expect(data.material).toBe("PETG");
      expect(data.quantity).toBe(3);
      expect(data.quoteRequested).toBe(true);
      expect(data.quotedPrice).toBeUndefined();
    });
  });

  // --- Reordering ----------------------------------------------------------
  // "The same again": a new request whose file is the one already on record.
  describe("reordering a part", () => {
    const earlier = {
      id: "orig-1",
      fileId: "orig-key-bracket.stl",
      fileName: "bracket.stl",
      partName: null,
      createdAt: new Date("2026-09-03T12:00:00Z"),
    };

    const reorderRequest = (
      fields: Record<string, string | File> = {},
      options: { file?: { name: string; content: Buffer } } = {}
    ) => {
      const formData = new FormData();
      formData.append("submissionType", "MODEL");
      if (options.file) {
        // A plain Uint8Array: a Buffer is not a BlobPart under this tsconfig.
        formData.append("file", new File([new Uint8Array(options.file.content)], options.file.name));
      }
      formData.append("quantity", "12");
      formData.append("material", "PLA");
      formData.append("dateNeeded", new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString());
      formData.append("phoneNumber", "1234567890");
      formData.append("reorderOf", "orig-1");
      for (const [key, value] of Object.entries(fields)) formData.set(key, value);
      return new NextRequest("http://localhost/api/requests", { method: "POST", body: formData });
    };

    it("reuses the file on record instead of asking for it again", async () => {
      (prisma.partRequest.findFirst as jest.Mock).mockResolvedValue(earlier);

      const res = await POST(reorderRequest({ quoteRequested: "true" }));
      expect(res.status).toBe(201);

      const row = createdRequestData();
      expect(row.fileId).toBe("orig-key-bracket.stl");
      expect(row.fileName).toBe("bracket.stl");
      expect(row.quantity).toBe(12);
      // Nothing was uploaded: the key is shared, not copied.
      expect(uploadToR2).not.toHaveBeenCalled();
      expect(objectExistsInR2).toHaveBeenCalledWith("orig-key-bracket.stl");
      // It has an account and the part file, so a price it asks for is a quote.
      expect(row.kind).toBe("QUOTE");
    });

    it("looks for the order among this customer's own, in the same query", async () => {
      (prisma.partRequest.findFirst as jest.Mock).mockResolvedValue(earlier);

      await POST(reorderRequest());
      expect((prisma.partRequest.findFirst as jest.Mock).mock.calls[0][0].where).toEqual({
        id: "orig-1",
        userId: "user-1",
      });
    });

    it("tells the shop what it repeats", async () => {
      (prisma.partRequest.findFirst as jest.Mock).mockResolvedValue(earlier);

      await POST(
        reorderRequest({ notes: "Black, please.", equipment: "Bosch WTG86", partNumber: "00 4.1.12" })
      );
      expect(createdRequestData().notes).toBe(
        "Reorder of: bracket.stl (Sep 3, 2026)\nEquipment: Bosch WTG86\nPart number: 00 4.1.12\nBlack, please."
      );
    });

    it("answers the same way for an order that is missing and one that is someone else's", async () => {
      // Ownership is in the query, so another customer's order simply is not found.
      (prisma.partRequest.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await POST(reorderRequest());
      expect(res.status).toBe(404);
      expect((await res.json()).error).toBe("We couldn't find the order to reorder from.");
      expect(prisma.partRequest.create).not.toHaveBeenCalled();
      expect(objectExistsInR2).not.toHaveBeenCalled();
    });

    it("refuses when the file has since been deleted, and creates nothing", async () => {
      (prisma.partRequest.findFirst as jest.Mock).mockResolvedValue(earlier);
      (objectExistsInR2 as jest.Mock).mockResolvedValue(false);

      const res = await POST(reorderRequest());
      expect(res.status).toBe(409);
      expect((await res.json()).error).toMatch(/no longer on record/);
      expect(prisma.partRequest.create).not.toHaveBeenCalled();
    });

    it("does not mistake a storage outage for a deleted file", async () => {
      (prisma.partRequest.findFirst as jest.Mock).mockResolvedValue(earlier);
      (objectExistsInR2 as jest.Mock).mockRejectedValue(new Error("R2 unreachable"));

      const res = await POST(reorderRequest());
      expect(res.status).toBe(503);
      expect(prisma.partRequest.create).not.toHaveBeenCalled();
    });

    it("takes a new upload over the old file, and does not look for the old one", async () => {
      (prisma.partRequest.findFirst as jest.Mock).mockResolvedValue(earlier);

      const res = await POST(
        reorderRequest({}, { file: { name: "bracket-rev2.stl", content: Buffer.from("solid rev2") } })
      );
      expect(res.status).toBe(201);
      expect(createdRequestData().fileName).toBe("bracket-rev2.stl");
      expect(createdRequestData().fileId).toBe("test-file-id");
      expect(objectExistsInR2).not.toHaveBeenCalled();
    });

    it("still needs a file when the order it names never had one", async () => {
      (prisma.partRequest.findFirst as jest.Mock).mockResolvedValue({
        ...earlier,
        fileId: null,
        fileName: null,
        partName: "Dryer door catch",
      });

      const res = await POST(reorderRequest());
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe("STL, STEP, IGES, or ZIP file is required");
      expect(prisma.partRequest.create).not.toHaveBeenCalled();
    });

    it("lets a described part be reordered too, with the pointer in the notes", async () => {
      (prisma.partRequest.findFirst as jest.Mock).mockResolvedValue({
        ...earlier,
        fileId: null,
        fileName: null,
        partName: "Dryer door catch",
      });

      const res = await POST(
        reorderRequest({
          submissionType: "DESCRIPTION",
          partName: "Dryer door catch",
          partDescription: "A small nylon catch that holds the dryer door shut.",
        })
      );
      expect(res.status).toBe(201);
      const row = createdRequestData();
      expect(row.fileId).toBeNull();
      expect(row.notes).toBe("Reorder of: Dryer door catch (Sep 3, 2026)");
      expect(row.kind).toBe("ESTIMATE");
    });

    it("rejects a reorder id that is not text", async () => {
      const res = await POST(reorderRequest({ reorderOf: new File(["x"], "x.txt") }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe("Invalid input types");
    });

    it("still checks the order named when the request uploads a file of its own", async () => {
      (prisma.partRequest.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await POST(
        reorderRequest({}, { file: { name: "new.stl", content: Buffer.from("solid new") } })
      );
      expect(res.status).toBe(404);
      expect(uploadToR2).not.toHaveBeenCalled();
    });
  });
});
