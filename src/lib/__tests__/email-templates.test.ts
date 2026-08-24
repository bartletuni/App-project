import { NewRequestEmailHTML, NewUserAdminNotificationEmailHTML, WelcomeUserEmailHTML, InvoiceSentEmailHTML, StatusUpdateEmailHTML } from "@/lib/email-templates";

describe("email template links", () => {
  const details = { name: "N", email: "e@e.com", phone: "1", shippingAddress: "a", billingAddress: "b" };

  it("points at the canonical origin, never a deployment URL", () => {
    const pages = [
      NewRequestEmailHTML({ customerName: "c", customerEmail: "e@e.com", fileName: "f.stl", quantity: 1, material: "m", dateNeeded: "today" }),
      NewUserAdminNotificationEmailHTML(details),
      WelcomeUserEmailHTML(details),
      InvoiceSentEmailHTML({ customerName: "c", fileName: "f.stl", invoiceNumber: "1" }),
      StatusUpdateEmailHTML({ customerName: "c", fileName: "f.stl", status: "s", message: "m" }),
    ];
    for (const html of pages) {
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
