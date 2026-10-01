import {
  faqPageSchema,
  organizationSchema,
  replacementPartsServiceSchema,
  rushPrintingServiceSchema,
} from "@/lib/structured-data";
import { faqAnswerText, type FaqItem } from "@/lib/faq";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/seo";

describe("the homepage's search listing", () => {
  // Past these, a result listing cuts the text off — and the words that do
  // the work for someone in a hurry are the ones that would go.
  it("keeps the title inside the ~60 characters a listing shows", () => {
    expect(`${SITE_NAME} — ${SITE_TAGLINE}`.length).toBeLessThanOrEqual(60);
  });

  it("keeps the description inside the ~160 characters a listing shows", () => {
    expect(SITE_DESCRIPTION.length).toBeLessThanOrEqual(160);
  });
});

describe("FAQ structured data", () => {
  const items: FaqItem[] = [
    {
      q: "How fast is it?",
      a: ["Call ", { href: "tel:+1-385-695-4178", text: "385-695-4178" }, " and ask."],
    },
    { q: "Do you ship?", a: ["Anywhere in the United States."] },
  ];

  it("reduces a link to its words, so the markup reads as the page does", () => {
    expect(faqAnswerText(items[0].a)).toBe("Call 385-695-4178 and ask.");
  });

  it("publishes every question, in order, with its visible answer", () => {
    const schema = faqPageSchema(items) as {
      "@type": string;
      mainEntity: { name: string; acceptedAnswer: { text: string } }[];
    };

    expect(schema["@type"]).toBe("FAQPage");
    expect(schema.mainEntity.map((q) => q.name)).toEqual(items.map((i) => i.q));
    expect(schema.mainEntity.map((q) => q.acceptedAnswer.text)).toEqual(
      items.map((i) => faqAnswerText(i.a))
    );
  });
});

describe("the shop's services", () => {
  // Each service page describes itself under an @id and the Organization lists
  // it by that @id, so a search engine reads one entity rather than two copies
  // that could drift. A service page whose @id is not in the catalog is an
  // orphan the shop does not appear to offer.
  it.each([
    ["replacement parts", replacementPartsServiceSchema],
    ["rush printing", rushPrintingServiceSchema],
  ])("lists %s in the Organization's offer catalog", (_, schema) => {
    const catalog = organizationSchema().hasOfferCatalog as {
      itemListElement: { itemOffered: Record<string, unknown> }[];
    };
    const offered = catalog.itemListElement.map((offer) => offer.itemOffered["@id"]);

    expect(offered).toContain(schema()["@id"]);
  });
});
