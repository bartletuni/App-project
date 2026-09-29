/**
 * A page's questions and answers, written once and used twice: rendered on
 * the page by `<FaqList>`, and published as FAQPage structured data by
 * `faqPageSchema`. One source means the markup can never say something the
 * page does not — which is the search engines' rule for FAQ markup, and ours.
 *
 * An answer is a run of text and links rather than JSX because the structured
 * data needs it as text. Rendered, a link is a link; flattened, it is its
 * words, so the published answer reads exactly as the visible one does.
 */

export type FaqLink = { href: string; text: string };

export type FaqItem = {
  q: string;
  a: (string | FaqLink)[];
};

/** The answer as plain text, links reduced to their words. */
export function faqAnswerText(answer: FaqItem["a"]): string {
  return answer.map((part) => (typeof part === "string" ? part : part.text)).join("");
}
