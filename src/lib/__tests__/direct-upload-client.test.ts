/**
 * The browser half of direct uploads. `fetch` and `XMLHttpRequest` are faked:
 * what matters is the sequence (ask for a URL, PUT to it, keep the receipt) and
 * what the customer is told when a step fails.
 */

import { SUBMISSION_DESCRIPTION, emptyPartSource } from "@/lib/part-source";

type Client = typeof import("@/lib/direct-upload-client");

function load(enabled: boolean): Client {
  let mod!: Client;
  jest.isolateModules(() => {
    if (enabled) process.env.NEXT_PUBLIC_DIRECT_UPLOADS = "1";
    else delete process.env.NEXT_PUBLIC_DIRECT_UPLOADS;
    mod = require("@/lib/direct-upload-client");
  });
  return mod;
}

const MB = 1024 * 1024;
const file = (name: string, size: number) =>
  Object.defineProperty(new File(["x"], name), "size", { value: size }) as File;

afterAll(() => {
  delete process.env.NEXT_PUBLIC_DIRECT_UPLOADS;
});

describe("needsDirectUpload", () => {
  it("is never true while direct uploads are off, however big the file", () => {
    const client = load(false);
    expect(client.needsDirectUpload({ ...emptyPartSource(), file: file("a.stl", 40 * MB) })).toBe(false);
  });

  describe("with direct uploads on", () => {
    const client = () => load(true);

    it("lets a small model ride in the post, which needs no storage set-up", () => {
      expect(client().needsDirectUpload({ ...emptyPartSource(), file: file("a.stl", 2 * MB) })).toBe(false);
    });

    it("sends a model over the threshold straight to storage", () => {
      expect(client().needsDirectUpload({ ...emptyPartSource(), file: file("a.stl", 3 * MB + 1) })).toBe(true);
    });

    it("counts a described part's photos together", () => {
      const state = {
        ...emptyPartSource(),
        mode: SUBMISSION_DESCRIPTION,
        references: [file("a.jpg", 2 * MB), file("b.jpg", 2 * MB)],
      };
      expect(client().needsDirectUpload(state)).toBe(true);
      expect(client().needsDirectUpload({ ...state, references: [file("a.jpg", 2 * MB)] })).toBe(false);
    });

    it("looks only at the lane in use: a leftover big model does not drag a described part's tiny photo along", () => {
      const state = {
        ...emptyPartSource(),
        mode: SUBMISSION_DESCRIPTION,
        file: file("leftover.stl", 40 * MB),
        references: [file("a.jpg", MB)],
      };
      expect(client().needsDirectUpload(state)).toBe(false);
    });

    it("sends nothing for a reorder that reuses the file on record", () => {
      const state = { ...emptyPartSource(), carried: { fileId: "k", fileName: "bracket.stl" } };
      expect(client().needsDirectUpload(state)).toBe(false);
    });
  });
});

describe("prepareUploads", () => {
  let client: Client;
  const events: string[] = [];

  /** A stand-in XMLHttpRequest that reports progress and then succeeds or fails as told. */
  let putOutcome: "ok" | "error" | "status500" = "ok";
  class FakeXHR {
    upload: { onprogress: ((e: unknown) => void) | null } = { onprogress: null };
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    onabort: (() => void) | null = null;
    status = 200;
    private url = "";
    private headers: Record<string, string> = {};
    open(_method: string, url: string) {
      this.url = url;
    }
    setRequestHeader(name: string, value: string) {
      this.headers[name] = value;
    }
    send(body: File) {
      events.push(`PUT ${this.url} ${JSON.stringify(this.headers)} ${body.name}`);
      this.upload.onprogress?.({ lengthComputable: true, loaded: body.size / 2, total: body.size });
      if (putOutcome === "error") return void this.onerror?.();
      this.status = putOutcome === "status500" ? 500 : 200;
      this.onload?.();
    }
  }

  beforeEach(() => {
    events.length = 0;
    putOutcome = "ok";
    client = load(true);
    (global as any).XMLHttpRequest = FakeXHR;
    (global as any).fetch = jest.fn(async (url: string, init: { body: string }) => {
      const body = JSON.parse(init.body);
      events.push(`presign ${body.kind} ${body.fileName} ${body.size}${body.formToken ? " +token" : ""}`);
      return new Response(
        JSON.stringify({
          url: `https://bucket.example/${body.fileName}`,
          headers: { "Content-Type": "application/sla" },
          token: `receipt-for-${body.fileName}`,
        }),
        { status: 200 }
      );
    });
  });

  it("asks for a URL, PUTs the file to it with the signed header, and keeps the receipt", async () => {
    const result = await client.prepareUploads({ ...emptyPartSource(), file: file("bracket.stl", 20 * MB) }, {});
    expect(result).toEqual({ modelUpload: "receipt-for-bracket.stl", referenceUploads: [] });
    expect(events).toEqual([
      "presign model bracket.stl 20971520",
      'PUT https://bucket.example/bracket.stl {"Content-Type":"application/sla"} bracket.stl',
    ]);
  });

  it("sends the public form's token, and uploads photos one after another in order", async () => {
    const state = {
      ...emptyPartSource(),
      mode: SUBMISSION_DESCRIPTION,
      references: [file("a.jpg", 2 * MB), file("b.jpg", 2 * MB)],
    };
    const result = await client.prepareUploads(state, { formToken: "tok" });
    expect(result.referenceUploads).toEqual(["receipt-for-a.jpg", "receipt-for-b.jpg"]);
    expect(events.filter((e) => e.startsWith("presign"))).toEqual([
      "presign reference a.jpg 2097152 +token",
      "presign reference b.jpg 2097152 +token",
    ]);
    // a is fully sent before b is asked for.
    expect(events.findIndex((e) => e.includes("PUT") && e.includes("a.jpg"))).toBeLessThan(
      events.findIndex((e) => e.startsWith("presign reference b.jpg"))
    );
  });

  it("reports progress with which file it is on", async () => {
    const seen: string[] = [];
    const state = {
      ...emptyPartSource(),
      mode: SUBMISSION_DESCRIPTION,
      references: [file("a.jpg", 2 * MB), file("b.jpg", 2 * MB)],
    };
    await client.prepareUploads(state, {}, (p) => seen.push(client.describeProgress(p)));
    expect(seen).toEqual(["Uploading 1 of 2 — 50%", "Uploading 2 of 2 — 50%"]);
  });

  it("says plainly what the server said when it will not issue a URL", async () => {
    (global as any).fetch = jest.fn(
      async () => new Response(JSON.stringify({ error: "That file is over the size limit." }), { status: 400 })
    );
    await expect(
      client.prepareUploads({ ...emptyPartSource(), file: file("a.stl", 20 * MB) }, {})
    ).rejects.toThrow("That file is over the size limit.");
  });

  it("tells the customer where to send the file instead when storage refuses it", async () => {
    putOutcome = "status500";
    await expect(
      client.prepareUploads({ ...emptyPartSource(), file: file("a.stl", 20 * MB) }, {})
    ).rejects.toThrow(/couldn't send “a\.stl”.*email it to info@takomoco\.com/);
  });

  it("says the same when the connection drops, or the browser is not allowed to reach storage", async () => {
    putOutcome = "error";
    await expect(
      client.prepareUploads({ ...emptyPartSource(), file: file("a.stl", 20 * MB) }, {})
    ).rejects.toThrow(/Check your connection/);
  });
});
