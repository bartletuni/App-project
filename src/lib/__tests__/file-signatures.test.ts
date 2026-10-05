import {
  expectedModelMime,
  expectedReferenceMime,
  modelMimeType,
  referenceMimeType,
} from "@/lib/file-signatures";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const GIF = Buffer.from("GIF89a-------");
const PDF = Buffer.from("%PDF-1.7\n...");
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP")]);
const HEIC = Buffer.concat([Buffer.alloc(4), Buffer.from("ftyp"), Buffer.from("heic")]);

describe("referenceMimeType", () => {
  it("names the type when the bytes back up the extension", () => {
    expect(referenceMimeType("photo.png", PNG)).toBe("image/png");
    expect(referenceMimeType("photo.JPG", JPEG)).toBe("image/jpeg");
    expect(referenceMimeType("photo.jpeg", JPEG)).toBe("image/jpeg");
    expect(referenceMimeType("photo.webp", WEBP)).toBe("image/webp");
    expect(referenceMimeType("photo.gif", GIF)).toBe("image/gif");
    expect(referenceMimeType("photo.heic", HEIC)).toBe("image/heic");
    expect(referenceMimeType("drawing.pdf", PDF)).toBe("application/pdf");
  });

  it("refuses a file whose bytes contradict its name", () => {
    expect(referenceMimeType("photo.png", JPEG)).toBeNull();
    expect(referenceMimeType("drawing.pdf", PNG)).toBeNull();
  });

  it("refuses types that are not references at all", () => {
    expect(referenceMimeType("script.exe", PNG)).toBeNull();
    expect(referenceMimeType("part.stl", Buffer.from("solid part"))).toBeNull();
  });
});

describe("modelMimeType", () => {
  it("accepts ASCII and binary STL, and ZIP", () => {
    expect(modelMimeType("part.stl", Buffer.from("solid part"))).toBe("application/sla");

    const binary = Buffer.alloc(84);
    binary.writeUInt32LE(0, 80);
    expect(modelMimeType("part.stl", binary)).toBe("application/sla");

    expect(modelMimeType("part.zip", Buffer.from([0x50, 0x4b, 0x03, 0x04]))).toBe("application/zip");
  });

  it("refuses polyglots and mismatched content", () => {
    expect(modelMimeType("part.zip", Buffer.from("solid part"))).toBeNull();
    expect(modelMimeType("part.stl", Buffer.from([0x50, 0x4b, 0x03, 0x04]))).toBeNull();
    expect(modelMimeType("photo.png", PNG)).toBeNull();
  });

  describe("STEP", () => {
    const step = "ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('part'),'2;1');\nENDSEC;\nDATA;\nENDSEC;\nEND-ISO-10303-21;\n";

    it("accepts a STEP export under either extension, in any case", () => {
      expect(modelMimeType("bracket.step", Buffer.from(step))).toBe("model/step");
      expect(modelMimeType("BRACKET.STP", Buffer.from(step))).toBe("model/step");
    });

    it("tolerates a byte-order mark and leading white space", () => {
      const bom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(`\r\n  ${step}`)]);
      expect(modelMimeType("bracket.step", bom)).toBe("model/step");
    });

    it("refuses a file that only claims to be one", () => {
      expect(modelMimeType("bracket.step", Buffer.from("solid part"))).toBeNull();
      expect(modelMimeType("bracket.stp", Buffer.from([0x4d, 0x5a, 0x90, 0x00]))).toBeNull();
      expect(modelMimeType("bracket.step", Buffer.from("// ISO-10303-21;"))).toBeNull();
      expect(modelMimeType("bracket.step", Buffer.alloc(0))).toBeNull();
    });

    it("does not let STEP bytes ride in under another model extension", () => {
      expect(modelMimeType("bracket.stl", Buffer.from(step))).toBeNull();
      expect(modelMimeType("bracket.zip", Buffer.from(step))).toBeNull();
    });
  });

  describe("IGES", () => {
    /** One 80-column record: 72 columns of text, a section letter, a sequence number. */
    const record = (text: string, section: string, n: number) =>
      `${text.padEnd(72)}${section}${String(n).padStart(7)}`;
    const iges = [
      record("Exported by a CAD package", "S", 1),
      record(",,31HBracket,4Hpart,7Hsystem,32,38,6,308,15,4Hpart,1.0,2,2HMM,1,0.01,", "G", 1),
      record("", "T", 1),
    ].join("\n");

    it("accepts an IGES export under either extension", () => {
      expect(modelMimeType("bracket.iges", Buffer.from(iges))).toBe("model/iges");
      expect(modelMimeType("bracket.IGS", Buffer.from(iges))).toBe("model/iges");
    });

    it("accepts a blank start-section line, which is what most exporters write", () => {
      expect(modelMimeType("bracket.igs", Buffer.from(record("", "S", 1)))).toBe("model/iges");
    });

    it("refuses a file that only claims to be one", () => {
      expect(modelMimeType("bracket.iges", Buffer.from("solid part"))).toBeNull();
      expect(modelMimeType("bracket.iges", Buffer.from(record("", "S", 2)))).toBeNull();
      expect(modelMimeType("bracket.iges", Buffer.from(record("", "G", 1)))).toBeNull();
      expect(modelMimeType("bracket.iges", Buffer.from(record("", "S", 1).slice(0, 79)))).toBeNull();
    });

    it("accepts accented text in the free-text columns", () => {
      const accented = Buffer.from(record("Pièce n° 4 - Bracket", "S", 1), "latin1");
      expect(modelMimeType("bracket.iges", accented)).toBe("model/iges");
    });

    it("refuses control bytes in the text columns", () => {
      const binary = Buffer.from(record("", "S", 1));
      binary[10] = 0x00;
      expect(modelMimeType("bracket.iges", binary)).toBeNull();
    });

    it("does not let IGES bytes ride in under another model extension", () => {
      expect(modelMimeType("bracket.step", Buffer.from(iges))).toBeNull();
      expect(modelMimeType("bracket.stl", Buffer.from(iges))).toBeNull();
    });
  });
});

describe("checking a file from its first bytes and its total size", () => {
  /** A binary STL header declaring `triangles` triangles, and nothing after it. */
  const binaryHead = (triangles: number) => {
    const head = Buffer.alloc(84);
    head.writeUInt32LE(triangles, 80);
    return head;
  };

  it("accepts a binary STL when the total size matches its triangle count", () => {
    const triangles = 200_000;
    const total = 84 + triangles * 50;
    expect(modelMimeType("part.stl", binaryHead(triangles), total)).toBe("application/sla");
  });

  it("refuses a binary STL whose total size does not match, even if the head looks right", () => {
    expect(modelMimeType("part.stl", binaryHead(200_000), 84 + 199_999 * 50)).toBeNull();
    expect(modelMimeType("part.stl", binaryHead(200_000), 5_000_000_000)).toBeNull();
  });

  it("needs nothing but the head for the other formats", () => {
    expect(modelMimeType("p.zip", Buffer.from([0x50, 0x4b, 0x03, 0x04]), 40_000_000)).toBe("application/zip");
    expect(modelMimeType("p.step", Buffer.from("ISO-10303-21;\nHEADER;"), 9_000_000)).toBe("model/step");
    expect(referenceMimeType("p.png", Buffer.concat([PNG, Buffer.alloc(1012)]))).toBe("image/png");
  });
});

describe("expectedModelMime / expectedReferenceMime", () => {
  it("name the type an extension promises, case-insensitively", () => {
    expect(expectedModelMime("a.STL")).toBe("application/sla");
    expect(expectedModelMime("a.stp")).toBe("model/step");
    expect(expectedModelMime("a.igs")).toBe("model/iges");
    expect(expectedModelMime("a.zip")).toBe("application/zip");
    expect(expectedReferenceMime("a.JPEG")).toBe("image/jpeg");
    expect(expectedReferenceMime("a.heic")).toBe("image/heic");
    expect(expectedReferenceMime("a.pdf")).toBe("application/pdf");
  });

  it("refuse an extension that is not that kind of file", () => {
    expect(expectedModelMime("a.png")).toBeNull();
    expect(expectedModelMime("a.exe")).toBeNull();
    expect(expectedReferenceMime("a.stl")).toBeNull();
    expect(expectedReferenceMime("a")).toBeNull();
  });

  it("agree with what the sniffers return for a genuine file", () => {
    expect(modelMimeType("p.stl", Buffer.from("solid x"))).toBe(expectedModelMime("p.stl"));
    expect(modelMimeType("p.zip", Buffer.from([0x50, 0x4b, 3, 4]))).toBe(expectedModelMime("p.zip"));
    expect(referenceMimeType("p.png", PNG)).toBe(expectedReferenceMime("p.png"));
    expect(referenceMimeType("p.jpg", JPEG)).toBe(expectedReferenceMime("p.jpg"));
    expect(referenceMimeType("p.pdf", PDF)).toBe(expectedReferenceMime("p.pdf"));
  });
});
