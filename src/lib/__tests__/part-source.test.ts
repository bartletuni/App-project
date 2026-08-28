import {
  MAX_REFERENCE_BYTES,
  MAX_REFERENCE_FILES,
  SUBMISSION_DESCRIPTION,
  SUBMISSION_MODEL,
  appendPartSource,
  emptyPartSource,
  isPreviewableImage,
  parseSubmissionType,
  quoteIsForced,
  requestTitle,
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
  it("requires a file", () => {
    expect(validatePartSource(emptyPartSource())).toMatch(/STL or ZIP/);
  });

  it("accepts an STL within the size limit", () => {
    const state = { ...emptyPartSource(), file: fakeFile("part.stl") };
    expect(validatePartSource(state)).toBeNull();
  });

  it("rejects a file that is not an STL or ZIP", () => {
    const state = { ...emptyPartSource(), file: fakeFile("part.step") };
    expect(validatePartSource(state)).toMatch(/Only .STL and .ZIP/);
  });

  it("rejects a file over 20MB", () => {
    const state = { ...emptyPartSource(), file: fakeFile("part.stl", 21 * 1024 * 1024) };
    expect(validatePartSource(state)).toMatch(/20MB/);
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

  it("rejects an oversized reference", () => {
    const references = [fakeFile("photo.jpg", MAX_REFERENCE_BYTES + 1)];
    expect(validatePartSource({ ...described(), references })).toMatch(/10MB/);
  });

  it("rejects an unsupported reference type", () => {
    const references = [fakeFile("photo.exe")];
    expect(validatePartSource({ ...described(), references })).toMatch(/not a supported/);
  });
});

describe("quoteIsForced", () => {
  it("forces a quote on a described part only", () => {
    expect(quoteIsForced(SUBMISSION_DESCRIPTION)).toBe(true);
    expect(quoteIsForced(SUBMISSION_MODEL)).toBe(false);
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
