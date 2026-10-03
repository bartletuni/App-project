import {
  EstimateDisownedEmailHTML,
  EstimateReceivedEmailHTML,
  NewRequestEmailHTML,
  NewUserAdminNotificationEmailHTML,
  WelcomeUserEmailHTML,
  InvoiceSentEmailHTML,
  StatusUpdateEmailHTML,
} from "@/lib/email-templates";

const details = { name: "N", email: "e@e.com", phone: "1", shippingAddress: "a", billingAddress: "b" };

const links = {
  confirmUrl: "https://takomoco.com/estimate/confirm?a=confirm&t=clx1.1.sig",
  disownUrl: "https://takomoco.com/estimate/confirm?a=disown&t=clx1.1.sig",
};

const everyTemplate = () => [
  NewRequestEmailHTML({ customerName: "c", customerEmail: "e@e.com", fileName: "f.stl", quantity: 1, material: "m", dateNeeded: "today" }),
  NewUserAdminNotificationEmailHTML(details),
  WelcomeUserEmailHTML(details),
  InvoiceSentEmailHTML({ customerName: "c", fileName: "f.stl", invoiceNumber: "1" }),
  StatusUpdateEmailHTML({ customerName: "c", fileName: "f.stl", status: "s", message: "m" }),
  EstimateReceivedEmailHTML({ reference: "E-ABCDEF", ...links }),
  EstimateDisownedEmailHTML({ reference: "E-ABCDEF", email: "e@e.com", removed: true }),
];

describe("email template links", () => {
  it("points at the canonical origin, never a deployment URL", () => {
    for (const html of everyTemplate()) {
      expect(html).not.toContain("undefined/");
      expect(html).not.toContain("vercel.app");
      const links = html.match(/href="([^"]+)"/g) || [];
      for (const l of links) {
        if (l.includes("mailto:") || l.includes("tel:")) continue;
        expect(l).toContain("https://takomoco.com/");
      }
    }
  });
});

describe("email templates carry the site's design", () => {
  it("uses the espresso ground on every message", () => {
    for (const html of everyTemplate()) {
      // Page and card backgrounds, set as CSS *and* as the bgcolor attribute
      // Outlook actually reads.
      expect(html).toContain("#15100c"); // espresso-950 page
      expect(html).toContain("#1c1611"); // espresso-900 card
      expect(html).toMatch(/bgcolor="#15100c"/);
    }
  });

  it("keeps no trace of the old indigo theme", () => {
    for (const html of everyTemplate()) {
      expect(html.toLowerCase()).not.toContain("#4f46e5");
      expect(html.toLowerCase()).not.toContain("#f7fafc");
    }
  });

  it("mastheads every message and tells clients not to invert it", () => {
    for (const html of everyTemplate()) {
      expect(html).toContain("TAKOMO");
      expect(html).toContain('name="color-scheme" content="dark"');
    }
  });

  it("gives every message inbox preview text", () => {
    for (const html of everyTemplate()) {
      expect(html).toMatch(/mso-hide:all/);
    }
  });
});

describe("email templates escape everything a person can type", () => {
  const XSS = '<script>alert("x")</script>';

  it("never emits a raw tag from user input", () => {
    const pages = [
      WelcomeUserEmailHTML({ ...details, name: XSS, shippingAddress: XSS }),
      NewUserAdminNotificationEmailHTML({ ...details, name: XSS, email: XSS }),
      NewRequestEmailHTML({
        customerName: XSS, customerEmail: XSS, fileName: XSS,
        submissionType: "DESCRIPTION", partDescription: XSS, dimensions: XSS,
        notes: XSS, printSettings: XSS, quantity: 1, material: XSS, dateNeeded: XSS,
      }),
      InvoiceSentEmailHTML({ customerName: XSS, fileName: XSS, invoiceNumber: XSS }),
      StatusUpdateEmailHTML({ customerName: XSS, fileName: XSS, status: XSS, message: XSS, trackingNumber: XSS }),
      EstimateReceivedEmailHTML({ reference: XSS, confirmUrl: XSS, disownUrl: XSS }),
      EstimateDisownedEmailHTML({ reference: XSS, email: XSS, removed: false }),
    ];
    for (const html of pages) {
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    }
  });

  it("keeps line breaks in a part description without losing the escaping", () => {
    const html = NewRequestEmailHTML({
      customerName: "c", customerEmail: "e@e.com", fileName: "f",
      submissionType: "DESCRIPTION", partDescription: "line one\nline <two>",
      quantity: 1, material: "m", dateNeeded: "today",
    });
    expect(html).toContain("line one<br>line &lt;two&gt;");
  });
});

describe("the email the public estimate form sends to the address it was given", () => {
  // Its inputs are the whole of what it can say: a reference derived from the
  // row id and two links. There is no field for anything the sender typed, so
  // nothing they typed can reach a stranger's inbox through it.
  const html = EstimateReceivedEmailHTML({ reference: "E-ABCDEF", ...links });

  it("offers both answers, with the ampersands in each link escaped", () => {
    expect(html).toContain("E-ABCDEF");
    expect(html).toContain("Confirm it&#039;s me");
    expect(html).toContain('href="https://takomoco.com/estimate/confirm?a=confirm&amp;t=clx1.1.sig"');
    expect(html).toContain('href="https://takomoco.com/estimate/confirm?a=disown&amp;t=clx1.1.sig"');
  });

  it("does not claim the reader asked for anything", () => {
    expect(html).not.toContain("because you asked us");
    expect(html).toContain("Someone asked TakomoCo for an estimate");
  });

  it("still says what comes back is an estimate, not a guaranteed price", () => {
    expect(html).toContain("What comes back is an estimate");
  });
});

describe("the shop hears what became of the confirmation email", () => {
  const guest = (guestConfirmation: "sent" | "suppressed" | "capped" | "not-sent") =>
    NewRequestEmailHTML({
      customerName: "c", customerEmail: "e@e.com", fileName: "Dryer catch",
      guestSubmitted: true, guestConfirmation, quantity: 1, material: "m", dateNeeded: "today",
    });

  it("names each outcome", () => {
    expect(guest("sent")).toContain("Email unconfirmed");
    expect(guest("suppressed")).toContain("Address disowned before");
    expect(guest("capped")).toContain("already had one from the form today");
    expect(guest("not-sent")).toContain("did not go out");
  });

  it("says nothing about confirmation on a signed-in request", () => {
    const html = NewRequestEmailHTML({
      customerName: "c", customerEmail: "e@e.com", fileName: "part.stl",
      quantity: 1, material: "m", dateNeeded: "today",
    });
    expect(html).not.toContain("confirmation");
  });

  it("tells the shop whether a disowned estimate is already gone", () => {
    expect(EstimateDisownedEmailHTML({ reference: "E-1", email: "e@e.com", removed: true })).toContain("Already deleted");
    expect(EstimateDisownedEmailHTML({ reference: "E-1", email: "e@e.com", removed: false })).toContain("Not deleted");
  });
});

describe("spec sheets", () => {
  it("renders no empty panel when a message has nothing to tabulate", () => {
    const withTracking = StatusUpdateEmailHTML({
      customerName: "c", fileName: "f.stl", status: "SHIPPED", message: "m", trackingNumber: "9400",
    });
    const without = StatusUpdateEmailHTML({
      customerName: "c", fileName: "f.stl", status: "ACTIVE", message: "m",
    });
    expect(withTracking).toContain("USPS tracking");
    const byUps = StatusUpdateEmailHTML({
      customerName: "c", fileName: "f.stl", status: "SHIPPED", message: "m", trackingNumber: "1Z",
      shippingCarrier: "UPS", shippingService: "Ground",
    });
    expect(byUps).toContain("UPS · Ground tracking");
    expect(byUps).not.toContain("USPS");
    // The panel background appears only when there is a row to show.
    expect(without).not.toContain("#241d17");
  });

  it("drops an optional row rather than printing a blank one", () => {
    const html = NewRequestEmailHTML({
      customerName: "c", customerEmail: "e@e.com", fileName: "f.stl",
      quantity: 1, material: "m", dateNeeded: "today", // no dimensions, no printSettings
    });
    expect(html).not.toContain("Approximate size");
    expect(html).not.toContain("Print settings");
    expect(html).toContain("Material");
  });
});

describe("the console emails flag what the shop must act on", () => {
  it("calls out a described part and the estimate it can only be", () => {
    const html = NewRequestEmailHTML({
      customerName: "c", customerEmail: "e@e.com", fileName: "Dryer catch",
      submissionType: "DESCRIPTION", referenceCount: 2, pricingKind: "ESTIMATE",
      quantity: 1, material: "m", dateNeeded: "today",
    });
    expect(html).toContain("No 3D file");
    expect(html).toContain("attached 2 reference files");
    expect(html).toContain("Estimate requested");
    expect(html).not.toContain("Quote requested");
  });

  it("calls out a quote when the submission actually qualifies for one", () => {
    const html = NewRequestEmailHTML({
      customerName: "c", customerEmail: "e@e.com", fileName: "part.stl",
      submissionType: "MODEL", pricingKind: "QUOTE",
      quantity: 1, material: "m", dateNeeded: "today",
    });
    expect(html).toContain("Quote requested");
    expect(html).toContain("guaranteed price");
  });

  it("says nothing about pricing when no price was asked for", () => {
    const html = NewRequestEmailHTML({
      customerName: "c", customerEmail: "e@e.com", fileName: "part.stl",
      submissionType: "MODEL", quantity: 1, material: "m", dateNeeded: "today",
    });
    expect(html).not.toContain("Estimate requested");
    expect(html).not.toContain("Quote requested");
  });

  it("says nothing about modelling when a file came with the request", () => {
    const html = NewRequestEmailHTML({
      customerName: "c", customerEmail: "e@e.com", fileName: "part.stl",
      submissionType: "MODEL", quantity: 1, material: "m", dateNeeded: "today",
    });
    expect(html).not.toContain("No 3D file");
    expect(html).toContain("File name");
  });

  it("counts a single reference file in the singular", () => {
    const html = NewRequestEmailHTML({
      customerName: "c", customerEmail: "e@e.com", fileName: "x",
      submissionType: "DESCRIPTION", referenceCount: 1,
      quantity: 1, material: "m", dateNeeded: "today",
    });
    expect(html).toContain("attached 1 reference file.");
  });
});
