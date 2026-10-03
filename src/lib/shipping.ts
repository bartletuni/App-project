/**
 * Carriers, service levels, and tracking links for a shipped part.
 *
 * USPS is the shop's primary carrier, and the Terms (§04) say so. They also
 * allow that a part too large or heavy for USPS, or one the customer asks to
 * have sent another way, may go by another carrier — and promise to say which
 * one when it ships. That promise is kept by recording the carrier on the row
 * next to its tracking number, so the dashboard, the console, and the status
 * email name the carrier that actually has the parcel instead of assuming
 * USPS.
 *
 * The carrier is a closed set so a tracking link can always be built from it.
 * The service level is free text with suggestions: carriers rename services
 * (USPS folded First-Class Package into Ground Advantage in 2023), and a list
 * the admin could not get past would be worse than a typo.
 *
 * Rows that existed before this column were all shipped by USPS, which is why
 * the column defaults to it and why `carrierLabel` falls back to it.
 */

export const CARRIERS = ["USPS", "UPS", "FEDEX", "DHL"] as const;
export type Carrier = (typeof CARRIERS)[number];

export const DEFAULT_CARRIER: Carrier = "USPS";

/** Longest service-level name accepted, e.g. "Priority Mail Express". */
export const MAX_SERVICE_LENGTH = 60;

/** Same ceiling the tracking route has always applied. */
export const MAX_TRACKING_LENGTH = 100;

const LABELS: Record<Carrier, string> = {
  USPS: "USPS",
  UPS: "UPS",
  FEDEX: "FedEx",
  DHL: "DHL",
};

/** Suggestions offered in the console; any other text is accepted. */
export const CARRIER_SERVICES: Record<Carrier, readonly string[]> = {
  USPS: ["Ground Advantage", "Priority Mail", "Priority Mail Express"],
  UPS: ["Ground", "3 Day Select", "2nd Day Air", "Next Day Air"],
  FEDEX: ["Ground", "Home Delivery", "Express Saver", "2Day", "Standard Overnight", "Priority Overnight"],
  DHL: ["Express Worldwide", "Express 12:00", "Express 9:00"],
};

const TRACKING_URLS: Record<Carrier, (n: string) => string> = {
  USPS: (n) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`,
  UPS: (n) => `https://www.ups.com/track?tracknum=${n}`,
  FEDEX: (n) => `https://www.fedex.com/fedextrack/?trknbr=${n}`,
  DHL: (n) => `https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=${n}`,
};

export function isCarrier(value: unknown): value is Carrier {
  return typeof value === "string" && (CARRIERS as readonly string[]).includes(value);
}

/** Display name for a stored carrier; anything unrecognised reads as USPS. */
export function carrierLabel(value: string | null | undefined): string {
  return LABELS[isCarrier(value) ? value : DEFAULT_CARRIER];
}

/** "USPS · Priority Mail", or just "USPS" when no service is recorded. */
export function shipmentLabel(carrier: string | null | undefined, service: string | null | undefined): string {
  const name = carrierLabel(carrier);
  return service ? `${name} · ${service}` : name;
}

/**
 * The carrier's own tracking page for a number, or null when there is no
 * number. The number is URL-encoded: it is free text typed by an admin.
 */
export function trackingUrl(
  carrier: string | null | undefined,
  trackingNumber: string | null | undefined
): string | null {
  const n = trackingNumber?.trim();
  if (!n) return null;
  return TRACKING_URLS[isCarrier(carrier) ? carrier : DEFAULT_CARRIER](encodeURIComponent(n));
}
