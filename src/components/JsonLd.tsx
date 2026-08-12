/**
 * Emits a JSON-LD block for search engines.
 *
 * The payload is built server-side from our own constants — never from user
 * input — so `dangerouslySetInnerHTML` is safe here. `</` is still escaped so
 * a stray sequence inside a string can't close the script tag early.
 */
export default function JsonLd({
  id,
  data,
}: {
  id: string;
  data: Record<string, unknown>;
}) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
