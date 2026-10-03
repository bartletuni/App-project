import {
  CARRIERS,
  CARRIER_SERVICES,
  carrierLabel,
  isCarrier,
  shipmentLabel,
  trackingUrl,
} from "../shipping";

describe("shipping", () => {
  it("recognises only the closed carrier set", () => {
    for (const c of CARRIERS) expect(isCarrier(c)).toBe(true);
    expect(isCarrier("usps")).toBe(false);
    expect(isCarrier("Pony Express")).toBe(false);
    expect(isCarrier(null)).toBe(false);
  });

  it("offers service suggestions for every carrier", () => {
    for (const c of CARRIERS) expect(CARRIER_SERVICES[c].length).toBeGreaterThan(0);
  });

  it("labels rows from before the column as USPS", () => {
    expect(carrierLabel(null)).toBe("USPS");
    expect(carrierLabel(undefined)).toBe("USPS");
    expect(carrierLabel("FEDEX")).toBe("FedEx");
  });

  it("joins carrier and service only when a service is recorded", () => {
    expect(shipmentLabel("USPS", "Priority Mail")).toBe("USPS · Priority Mail");
    expect(shipmentLabel("UPS", null)).toBe("UPS");
    expect(shipmentLabel("UPS", "")).toBe("UPS");
  });

  it("builds each carrier's own tracking link", () => {
    expect(trackingUrl("USPS", "9400100000000000000000")).toBe(
      "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400100000000000000000"
    );
    expect(trackingUrl("UPS", "1Z999AA10123456784")).toMatch(/^https:\/\/www\.ups\.com\//);
    expect(trackingUrl("FEDEX", "123456789012")).toMatch(/^https:\/\/www\.fedex\.com\//);
    expect(trackingUrl("DHL", "1234567890")).toMatch(/^https:\/\/www\.dhl\.com\//);
  });

  it("falls back to USPS for an unknown carrier", () => {
    expect(trackingUrl(null, "94001")).toMatch(/^https:\/\/tools\.usps\.com\//);
  });

  it("returns no link without a number", () => {
    expect(trackingUrl("USPS", null)).toBeNull();
    expect(trackingUrl("USPS", "   ")).toBeNull();
  });

  it("encodes a typed number so it cannot change the URL", () => {
    expect(trackingUrl("USPS", "12&x=<y>")).toBe(
      "https://tools.usps.com/go/TrackConfirmAction?tLabels=12%26x%3D%3Cy%3E"
    );
  });
});
