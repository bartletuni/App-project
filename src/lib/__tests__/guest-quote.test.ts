import { addDays } from "date-fns";
import {
  DEFAULT_LEAD_DAYS,
  MIN_LEAD_DAYS,
  emptyGuestContact,
  normalizeEmail,
  quoteReference,
  resolveDateNeeded,
  validateGuestContact,
  validateGuestNotes,
} from "@/lib/guest-quote";

const contact = (overrides: Partial<ReturnType<typeof emptyGuestContact>> = {}) => ({
  ...emptyGuestContact(),
  name: "Alex Rivera",
  email: "alex@example.com",
  phone: "(385) 695-4178",
  ...overrides,
});

describe("guest quote contact", () => {
  it("accepts the four things the form actually requires", () => {
    expect(validateGuestContact(contact())).toBeNull();
  });

  it("requires a name, an email, and a phone number", () => {
    expect(validateGuestContact(contact({ name: "  " }))).toMatch(/who to send/i);
    expect(validateGuestContact(contact({ email: "" }))).toMatch(/email address/i);
    expect(validateGuestContact(contact({ phone: "" }))).toMatch(/phone number/i);
  });

  it("rejects an address that cannot be one", () => {
    expect(validateGuestContact(contact({ email: "alex-at-example" }))).toMatch(/doesn't look right/);
  });

  it("rejects a phone number with nothing to dial", () => {
    expect(validateGuestContact(contact({ phone: "call me" }))).toMatch(/doesn't look right/);
  });

  it("accepts a number however it is punctuated", () => {
    for (const phone of ["385-695-4178", "+1 385 695 4178", "3856954178", "385.695.4178 x12"]) {
      expect(validateGuestContact(contact({ phone }))).toBeNull();
    }
  });

  it("holds the register route's line on what counts as the same address", () => {
    expect(normalizeEmail("  Alex@Example.COM ")).toBe("alex@example.com");
  });

  it("caps the free text a stranger can send", () => {
    expect(validateGuestNotes("x".repeat(2001))).toMatch(/2000 characters or fewer/);
    expect(validateGuestNotes("x".repeat(2000))).toBeNull();
  });
});

describe("when the part is needed", () => {
  const now = new Date("2026-03-01T12:00:00Z");

  it("books a default rather than demanding a date nobody has yet", () => {
    const result = resolveDateNeeded("", now);
    expect("date" in result && result.date).toEqual(addDays(now, DEFAULT_LEAD_DAYS));
  });

  it("takes a date that clears the shop's minimum lead time", () => {
    const wanted = addDays(now, MIN_LEAD_DAYS + 1);
    const result = resolveDateNeeded(wanted.toISOString(), now);
    expect("date" in result).toBe(true);
  });

  it("refuses a date inside the minimum, and says to call instead", () => {
    const result = resolveDateNeeded(addDays(now, 1).toISOString(), now);
    expect("error" in result && result.error).toMatch(/Call the shop/i);
  });

  it("refuses a date that is not one", () => {
    expect("error" in resolveDateNeeded("next tuesday", now)).toBe(true);
  });
});

describe("the reference a guest is given", () => {
  it("is derived from the row it names, so it cannot drift from it", () => {
    expect(quoteReference("clx1234abcd5f2a9c")).toBe("Q-5F2A9C");
    expect(quoteReference("clx1234abcd5f2a9c")).toBe(quoteReference("clx1234abcd5f2a9c"));
  });
});
