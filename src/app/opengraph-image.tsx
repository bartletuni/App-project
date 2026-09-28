import { ImageResponse } from "next/og";
import { CLAY, CREAM, DERIVED, ESPRESSO, MARK, WORDMARK } from "@/lib/brand";
import { OG_IMAGE } from "@/lib/seo";

/**
 * The link-preview card: what LinkedIn, Slack, Teams, iMessage and most mail
 * clients show when someone pastes a TakomoCo link — which, for outreach, is
 * the first impression the shop makes.
 *
 * It replaces `banner.png` in that role. The banner is 1794×592, a 3:1 strip,
 * and every one of those platforms crops to roughly 1.91:1, so the card was
 * losing its sides wherever it was shown. This is drawn at the 1200×630 they
 * all expect, from the same palette and the same logo geometry as the email
 * and the PDF (src/lib/brand.ts), so it cannot drift from the site.
 *
 * Every line on it is a claim the site already makes on the page: the 72-hour
 * turnaround (homepage spec sheet), the one-business-day answer (/estimate),
 * nationwide shipping (homepage and footer), the materials and the scanning
 * (homepage capabilities).
 *
 * No dynamic input, so Next renders it once at build time and serves a static
 * PNG. `twitter:image` points at the same file through `OG_IMAGE`.
 */

export const alt = OG_IMAGE.alt;
export const size = { width: OG_IMAGE.width, height: OG_IMAGE.height };
export const contentType = "image/png";

const MARK_HEIGHT = 64;
const MARK_WIDTH = Math.round(MARK_HEIGHT * MARK.aspect);

/** The strata fade from cream at the top to clay at the foot, as the mark's tone does. */
function strataColour(tone: number): string {
  return tone < 0.34 ? CREAM[200] : tone < 0.67 ? CLAY[300] : CLAY[500];
}

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          backgroundColor: ESPRESSO[950],
          backgroundImage: `radial-gradient(circle at 85% 20%, ${ESPRESSO[700]} 0%, ${ESPRESSO[950]} 55%)`,
          color: CREAM[200],
        }}
      >
        {/* Masthead: the mark, the wordmark, and the descriptor opposite. */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", position: "relative", width: MARK_WIDTH, height: MARK_HEIGHT }}>
              {MARK.strata.map(([x, y, w, h, tone], i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: x * MARK_WIDTH,
                    top: y * MARK_HEIGHT,
                    width: w * MARK_WIDTH,
                    height: Math.max(1, h * MARK_HEIGHT),
                    backgroundColor: strataColour(tone),
                  }}
                />
              ))}
            </div>
            <div style={{ display: "flex", marginLeft: 24, fontSize: 34, fontWeight: 700, letterSpacing: 8 }}>
              <span style={{ color: CREAM[100] }}>{WORDMARK.head}</span>
              <span style={{ color: CLAY[400] }}>/</span>
              <span style={{ color: CREAM[100] }}>{WORDMARK.tail}</span>
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 20, letterSpacing: 5, color: CREAM[600] }}>
            {WORDMARK.descriptor.toUpperCase()} · USA
          </div>
        </div>

        {/* The promise, in the words a buyer with a broken part searches in. */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 24, letterSpacing: 6, color: DERIVED.eyebrow }}>
            DOMESTIC ADDITIVE MANUFACTURING
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 18,
              // Sized so each line fits the 1056px measure in the bundled face;
              // any larger and "3D printing" wraps onto a third line.
              fontSize: 62,
              lineHeight: 1.1,
              fontWeight: 700,
              color: CREAM[100],
            }}
          >
            <span>Replacement parts &amp; 3D printing</span>
            <span style={{ color: CLAY[300] }}>on a 72-hour turnaround.</span>
          </div>
          <div style={{ display: "flex", marginTop: 26, fontSize: 26, color: CREAM[400] }}>
            Carbon-fiber &amp; engineering-grade parts · 3D scanning · reverse engineering
          </div>
        </div>

        {/* Footer rule: that it reaches the reader wherever they are, and where to go. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `2px solid ${DERIVED.rule}`,
            paddingTop: 26,
            fontSize: 24,
          }}
        >
          <div style={{ display: "flex", color: CREAM[300] }}>
            Ships nationwide · estimates in one business day
          </div>
          <div style={{ display: "flex", color: CLAY[300], fontWeight: 700, letterSpacing: 2 }}>
            takomoco.com
          </div>
        </div>
      </div>
    ),
    size
  );
}
