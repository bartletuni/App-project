import { modelMimeType, referenceMimeType } from "@/lib/file-signatures";

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
});
