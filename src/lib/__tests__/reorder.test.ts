import { prisma } from "@/lib/prisma";
import { objectExistsInR2 } from "@/lib/r2";
import {
  REORDER_CHECK_FAILED,
  REORDER_FILE_GONE,
  REORDER_NOT_FOUND,
  confirmStoredFile,
  loadReorder,
} from "@/lib/reorder";

jest.mock("@/lib/prisma", () => ({
  prisma: { partRequest: { findFirst: jest.fn() } },
}));
jest.mock("@/lib/r2", () => ({ objectExistsInR2: jest.fn() }));

const findFirst = prisma.partRequest.findFirst as jest.Mock;

describe("loadReorder", () => {
  beforeEach(() => {
    findFirst.mockReset();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  it("asks for the order among the owner's own, never by id alone", async () => {
    findFirst.mockResolvedValue({
      id: "orig-1",
      fileId: "key.stl",
      fileName: "bracket.stl",
      partName: null,
      createdAt: new Date("2026-09-03T12:00:00Z"),
    });

    const result = await loadReorder("orig-1", "user-1");
    expect(findFirst.mock.calls[0][0].where).toEqual({ id: "orig-1", userId: "user-1" });
    expect(result).toEqual({
      reorder: {
        id: "orig-1",
        title: "bracket.stl",
        note: "bracket.stl (Sep 3, 2026)",
        fileId: "key.stl",
        fileName: "bracket.stl",
      },
    });
  });

  it("names a described part by its part name", async () => {
    findFirst.mockResolvedValue({
      id: "orig-2",
      fileId: null,
      fileName: null,
      partName: "Dryer door catch",
      createdAt: new Date("2026-09-03T12:00:00Z"),
    });

    const result = await loadReorder("orig-2", "user-1");
    expect("reorder" in result && result.reorder.title).toBe("Dryer door catch");
  });

  it("answers an order that is not there, or not theirs, with the same not-found", async () => {
    findFirst.mockResolvedValue(null);
    expect(await loadReorder("someone-elses", "user-1")).toEqual({
      error: REORDER_NOT_FOUND,
      status: 404,
    });
  });

  it("does not query at all for an id that cannot be one", async () => {
    expect(await loadReorder("   ", "user-1")).toEqual({ error: REORDER_NOT_FOUND, status: 404 });
    expect(await loadReorder("x".repeat(65), "user-1")).toEqual({
      error: REORDER_NOT_FOUND,
      status: 404,
    });
    expect(findFirst).not.toHaveBeenCalled();
  });
});

describe("confirmStoredFile", () => {
  const exists = objectExistsInR2 as jest.Mock;

  beforeEach(() => {
    exists.mockReset();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  it("accepts a file that is still in the bucket", async () => {
    exists.mockResolvedValue(true);
    expect(await confirmStoredFile("key.stl")).toEqual({ ok: true });
  });

  it("says so when the file has been deleted", async () => {
    exists.mockResolvedValue(false);
    expect(await confirmStoredFile("key.stl")).toEqual({ error: REORDER_FILE_GONE, status: 409 });
  });

  it("reports a failure to look as that, not as a deletion", async () => {
    exists.mockRejectedValue(new Error("unreachable"));
    expect(await confirmStoredFile("key.stl")).toEqual({ error: REORDER_CHECK_FAILED, status: 503 });
  });
});
