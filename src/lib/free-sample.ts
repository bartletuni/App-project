/**
 * The one free PLA 2.0 sample a first-time customer may request.
 *
 * A free sample is an ordinary part request — the customer still uploads a
 * model or describes the part — except the shop absorbs the cost: material is
 * pinned to `FREE_SAMPLE_MATERIAL`, quantity to `FREE_SAMPLE_QUANTITY`, and
 * nothing is invoiced. `PartRequest.isFreeSample` records that a given row
 * was one of these; `GET /api/requests/free-sample` and the check inside
 * `POST /api/requests` both read it the same way: eligible means no existing
 * row for this account already has the flag set, not "never ordered before."
 */

export const FREE_SAMPLE_MATERIAL = "PLA 2.0";
export const FREE_SAMPLE_QUANTITY = 1;
export const FREE_SAMPLE_PRICE_LABEL = "$0.00 — Free sample";

/** Matches the truthy conventions the rest of the composer's checkboxes use. */
export function isFreeSampleRequested(value: string | null | undefined): boolean {
  return value === "true" || value === "1" || value === "on";
}
