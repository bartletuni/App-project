import {
  MAX_EQUIPMENT_CHARS,
  MAX_PART_NUMBER_CHARS,
  MAX_REFERENCE_FILES,
  MAX_REFERENCE_TOTAL_BYTES,
  MAX_INLINE_BYTES,
  SUBMISSION_DESCRIPTION,
  SUBMISSION_MODEL,
  appendPartSource,
  composeNotes,
  emptyPartSource,
  isPreviewableImage,
  parseSubmissionType,
  pricingIsForced,
  requestTitle,
  splitNotes,
  validatePartSource,
} from "@/lib/part-source";

const fakeFile = (name: string, size = 1024) =>
  Object.defineProperty(new File(["x"], name), "size", { value: size }) as File;

describe("parseSubmissionType", () => {
  it("only treats the literal DESCRIPTION as a described part", () => {
    expect(parseSubmissionType("DESCRIPTION")).toBe(SUBMISSION_DESCRIPTION);
    expect(parseSubmissionType("MODEL")).toBe(SUBMISSION_MODEL);
    expect(parseSubmissionType("description")).toBe(SUBMISSION_MODEL);
    expect(parseSubmissionType(null)).toBe(SUBMISSION_MODEL);
  });
});

describe("validatePartSource — model lane", () => {
  it("requires a file, and names every format it takes", () => {
    expect(validatePartSource(emptyPartSource())).toMatch(/STL, STEP, IGES, or ZIP/);
  });

  it("accepts an STL within the size limit", () => {
    const state = { ...emptyPartSource(), file: fakeFile("part.stl") };
    expect(validatePartSource(state)).toBeNull();
  });

  it.each(["part.step", "part.STP", "part.iges", "part.igs", "part.zip"])(
    "accepts %s",
    (name) => {
      expect(validatePartSource({ ...emptyPartSource(), file: fakeFile(name) })).toBeNull();
    }
  );

  it.each(["part.exe", "part.obj", "part.3mf", "part.stl.exe", "part.stepx"])(
    "rejects %s",
    (name) => {
      const state = { ...emptyPartSource(), file: fakeFile(name) };
      expect(validatePartSource(state)).toMatch(/Only .STL, .STEP\/.STP, .IGES\/.IGS, and .ZIP/);
    }
  );

  it("accepts the file on record from an earlier order in place of an upload", () => {
    const state = {
      ...emptyPartSource(),
      carried: { fileId: "orig-key.stl", fileName: "bracket.stl" },
    };
    expect(validatePartSource(state)).toBeNull();
  });

  it("still holds a newly picked file to the rules, even with one on record", () => {
    const state = {
      ...emptyPartSource(),
      carried: { fileId: "orig-key.stl", fileName: "bracket.stl" },
      file: fakeFile("part.exe"),
    };
    expect(validatePartSource(state)).toMatch(/Only .STL/);
  });

  it("does not send the file on record — the server finds it from the order", () => {
    const formData = new FormData();
    appendPartSource(formData, {
      ...emptyPartSource(),
      carried: { fileId: "orig-key.stl", fileName: "bracket.stl" },
    });
    expect(formData.get("file")).toBeNull();
    expect(formData.get("submissionType")).toBe("MODEL");
  });

  it("rejects a file over the limit, and says where larger ones go", () => {
    const state = { ...emptyPartSource(), file: fakeFile("part.stl", MAX_INLINE_BYTES + 1) };
    expect(validatePartSource(state)).toMatch(/4MB/);
    expect(validatePartSource(state)).toMatch(/email it to info@takomoco\.com/);
  });

  it("accepts a file exactly at the limit", () => {
    const state = { ...emptyPartSource(), file: fakeFile("part.stl", MAX_INLINE_BYTES) };
    expect(validatePartSource(state)).toBeNull();
  });

  it("holds the limit under what the host will take", () => {
    // Vercel rejects a request body over ~4.5MB; the form's own fields ride in it too.
    expect(MAX_INLINE_BYTES).toBeLessThan(4.5 * 1000 * 1000);
  });
});

describe("validatePartSource — description lane", () => {
  const described = () => ({
    ...emptyPartSource(),
    mode: SUBMISSION_DESCRIPTION,
    partName: "Dryer door catch",
    description: "A small nylon catch that holds the dryer door shut; the tab snapped off.",
  });

  it("accepts a named, described part with no file at all", () => {
    expect(validatePartSource(described())).toBeNull();
  });

  it("requires a name", () => {
    expect(validatePartSource({ ...described(), partName: "  " })).toMatch(/name/i);
  });

  it("requires a description of some substance", () => {
    expect(validatePartSource({ ...described(), description: "broken" })).toMatch(/at least 20/);
  });

  it("caps the number of reference files", () => {
    const references = Array.from({ length: MAX_REFERENCE_FILES + 1 }, (_, i) =>
      fakeFile(`photo-${i}.jpg`)
    );
    expect(validatePartSource({ ...described(), references })).toMatch(/at most/);
  });

  it("rejects photos that are over the limit together, not just one by one", () => {
    const half = Math.floor(MAX_REFERENCE_TOTAL_BYTES / 2);
    const references = [fakeFile("a.jpg", half), fakeFile("b.jpg", half), fakeFile("c.jpg", 10)];
    expect(validatePartSource({ ...described(), references })).toMatch(/total 4MB per request/);
  });

  it("accepts several photos that fit under the limit together", () => {
    const references = [fakeFile("a.jpg", 1024 * 1024), fakeFile("b.jpg", 1024 * 1024)];
    expect(validatePartSource({ ...described(), references })).toBeNull();
  });

  it("rejects an unsupported reference type", () => {
    const references = [fakeFile("photo.exe")];
    expect(validatePartSource({ ...described(), references })).toMatch(/not a supported/);
  });
});

describe("pricingIsForced", () => {
  it("forces pricing on a described part only", () => {
    expect(pricingIsForced(SUBMISSION_DESCRIPTION)).toBe(true);
    expect(pricingIsForced(SUBMISSION_MODEL)).toBe(false);
  });
});

describe("appendPartSource", () => {
  it("sends the file and nothing else in model mode", () => {
    const formData = new FormData();
    appendPartSource(formData, { ...emptyPartSource(), file: fakeFile("part.stl") });
    expect(formData.get("submissionType")).toBe("MODEL");
    expect(formData.get("file")).toBeInstanceOf(File);
    expect(formData.get("partName")).toBeNull();
  });

  it("sends the trimmed description and every reference in description mode", () => {
    const formData = new FormData();
    appendPartSource(formData, {
      ...emptyPartSource(),
      mode: SUBMISSION_DESCRIPTION,
      partName: "  Dryer door catch  ",
      description: "  Holds the dryer door shut; the tab snapped off.  ",
      dimensions: " 80 x 40 x 12 mm ",
      references: [fakeFile("a.jpg"), fakeFile("b.png")],
    });
    expect(formData.get("submissionType")).toBe("DESCRIPTION");
    expect(formData.get("partName")).toBe("Dryer door catch");
    expect(formData.get("partDescription")).toBe("Holds the dryer door shut; the tab snapped off.");
    expect(formData.get("dimensions")).toBe("80 x 40 x 12 mm");
    expect(formData.getAll("references")).toHaveLength(2);
    expect(formData.get("file")).toBeNull();
  });
});

describe("requestTitle", () => {
  it("prefers the file name, falls back to the part name", () => {
    expect(requestTitle({ fileName: "bracket.stl", partName: "Bracket" })).toBe("bracket.stl");
    expect(requestTitle({ fileName: null, partName: "Dryer door catch" })).toBe("Dryer door catch");
    expect(requestTitle({ fileName: null, partName: null })).toBe("Untitled part");
  });
});

describe("isPreviewableImage", () => {
  it("only claims the formats a browser will actually draw", () => {
    expect(isPreviewableImage("image/jpeg")).toBe(true);
    expect(isPreviewableImage("image/heic")).toBe(false);
    expect(isPreviewableImage("application/pdf")).toBe(false);
  });
});

describe("equipment and part number", () => {
  const withBoth = (over = {}) => ({
    ...emptyPartSource(),
    file: fakeFile("part.stl"),
    equipment: "Bosch WTG86",
    partNumber: "00 4.1.12",
    ...over,
  });

  it("are optional on both lanes", () => {
    expect(validatePartSource({ ...emptyPartSource(), file: fakeFile("part.stl") })).toBeNull();
  });

  it("are capped, on both lanes", () => {
    expect(
      validatePartSource(withBoth({ equipment: "x".repeat(MAX_EQUIPMENT_CHARS + 1) }))
    ).toMatch(/Equipment make and model/);
    expect(
      validatePartSource(withBoth({ partNumber: "x".repeat(MAX_PART_NUMBER_CHARS + 1) }))
    ).toMatch(/Part number/);

    const described = {
      ...emptyPartSource(),
      mode: SUBMISSION_DESCRIPTION,
      partName: "Dryer door catch",
      description: "A small nylon catch that holds the dryer door shut.",
      partNumber: "x".repeat(MAX_PART_NUMBER_CHARS + 1),
    };
    expect(validatePartSource(described)).toMatch(/Part number/);
  });

  it("are sent with either lane, trimmed", () => {
    const model = new FormData();
    appendPartSource(model, withBoth({ equipment: "  Bosch WTG86  " }));
    expect(model.get("equipment")).toBe("Bosch WTG86");
    expect(model.get("partNumber")).toBe("00 4.1.12");

    const described = new FormData();
    appendPartSource(described, withBoth({ mode: SUBMISSION_DESCRIPTION }));
    expect(described.get("equipment")).toBe("Bosch WTG86");
  });
});

describe("composeNotes / splitNotes", () => {
  it("puts the labelled lines first, then the customer's own words", () => {
    expect(
      composeNotes({
        company: "Rivera Appliance",
        equipment: "Bosch WTG86",
        partNumber: "00 4.1.12",
        notes: "Black, if you have it.",
      })
    ).toBe(
      "Company: Rivera Appliance\nEquipment: Bosch WTG86\nPart number: 00 4.1.12\nBlack, if you have it."
    );
  });

  it("writes nothing for what was left blank", () => {
    expect(composeNotes({ equipment: "  ", partNumber: null, notes: "" })).toBe("");
    expect(composeNotes({ notes: "Black." })).toBe("Black.");
  });

  it("round-trips, so a refilled form does not write anything twice", () => {
    const stored = composeNotes({
      equipment: "Bosch WTG86",
      partNumber: "00 4.1.12",
      notes: "Black, if you have it.\nSecond line.",
    });
    expect(splitNotes(stored)).toEqual({
      equipment: "Bosch WTG86",
      partNumber: "00 4.1.12",
      notes: "Black, if you have it.\nSecond line.",
    });
  });

  it("only reads the lines it wrote, at the top", () => {
    expect(splitNotes("Black.\nPart number: 12345")).toEqual({
      equipment: "",
      partNumber: "",
      notes: "Black.\nPart number: 12345",
    });
    expect(splitNotes("Equipment: Mixer")).toEqual({ equipment: "Mixer", partNumber: "", notes: "" });
    expect(splitNotes(null)).toEqual({ equipment: "", partNumber: "", notes: "" });
  });

  it("writes the reorder pointer first, and does not carry it into the next reorder", () => {
    const stored = composeNotes({
      reorderOf: "bracket.stl (Sep 3, 2026)",
      equipment: "Bosch WTG86",
      notes: "Black.",
    });
    expect(stored).toBe("Reorder of: bracket.stl (Sep 3, 2026)\nEquipment: Bosch WTG86\nBlack.");
    expect(splitNotes(stored)).toEqual({ equipment: "Bosch WTG86", partNumber: "", notes: "Black." });
  });

  it("reads notes saved with Windows line endings", () => {
    expect(splitNotes("Equipment: Mixer\r\nPart number: 12\r\nBlack.")).toEqual({
      equipment: "Mixer",
      partNumber: "12",
      notes: "Black.",
    });
  });

  it("drops a guest's company line, which is not the customer's to refill", () => {
    expect(splitNotes("Company: Rivera Appliance\nEquipment: Mixer\nBlack.")).toEqual({
      equipment: "Mixer",
      partNumber: "",
      notes: "Black.",
    });
  });
});

describe("appendPartSource with receipts for files sent straight to storage", () => {
  it("sends the receipt instead of the model, and no bytes", () => {
    const formData = new FormData();
    appendPartSource(
      formData,
      { ...emptyPartSource(), file: fakeFile("part.stl", 20 * 1024 * 1024) },
      { modelUpload: "receipt-1", referenceUploads: [] }
    );
    expect(formData.get("modelUpload")).toBe("receipt-1");
    expect(formData.get("file")).toBeNull();
  });

  it("sends a receipt for every photo instead of the photos", () => {
    const formData = new FormData();
    appendPartSource(
      formData,
      {
        ...emptyPartSource(),
        mode: SUBMISSION_DESCRIPTION,
        partName: "Dryer door catch",
        description: "A small nylon catch that holds the dryer door shut.",
        references: [fakeFile("a.jpg"), fakeFile("b.jpg")],
      },
      { modelUpload: null, referenceUploads: ["r1", "r2"] }
    );
    expect(formData.getAll("referenceUploads")).toEqual(["r1", "r2"]);
    expect(formData.getAll("references")).toHaveLength(0);
  });

  it("still sends the file itself when nothing was uploaded ahead", () => {
    const formData = new FormData();
    appendPartSource(formData, { ...emptyPartSource(), file: fakeFile("part.stl") }, null);
    expect(formData.get("file")).toBeInstanceOf(File);
    expect(formData.get("modelUpload")).toBeNull();
  });
});
