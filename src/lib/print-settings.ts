// Shared types, defaults, and validation for slicer print settings.
// A PartRequest with a null `printSettings` column means AUTO (shop chooses).
// A non-null column stores a JSON-serialized CustomPrintSettings object.

export const INFILL_PATTERNS = [
  "Grid",
  "Gyroid",
  "Lines",
  "Triangles",
  "Cubic",
  "Honeycomb",
  "Concentric",
  "Lightning",
] as const;

export const ADHESION_OPTIONS = ["None", "Skirt", "Brim", "Raft"] as const;

export const SEAM_OPTIONS = ["Aligned", "Back", "Nearest", "Random"] as const;

export type InfillPattern = (typeof INFILL_PATTERNS)[number];
export type AdhesionOption = (typeof ADHESION_OPTIONS)[number];
export type SeamOption = (typeof SEAM_OPTIONS)[number];

export interface CustomPrintSettings {
  layerHeight: number; // mm
  wallCount: number; // number of perimeters
  lineWidth: number; // mm (extrusion / layer width)
  topLayers: number;
  bottomLayers: number;
  infillPattern: InfillPattern;
  infillPercent: number; // 0 - 100
  nozzleTemp: number; // °C
  bedTemp: number; // °C
  printSpeed: number; // mm/s
  adhesion: AdhesionOption;
  seam: SeamOption;
  ironing: boolean;
  misc?: string; // free-form extra settings
}

export const DEFAULT_CUSTOM_SETTINGS: CustomPrintSettings = {
  layerHeight: 0.2,
  wallCount: 3,
  lineWidth: 0.45,
  topLayers: 4,
  bottomLayers: 4,
  infillPattern: "Grid",
  infillPercent: 20,
  nozzleTemp: 210,
  bedTemp: 60,
  printSpeed: 60,
  adhesion: "Skirt",
  seam: "Aligned",
  ironing: false,
  misc: "",
};

// [min, max] sanity bounds for each numeric field.
const NUMERIC_BOUNDS: Record<string, [number, number]> = {
  layerHeight: [0.04, 1.0],
  wallCount: [0, 20],
  lineWidth: [0.1, 2.0],
  topLayers: [0, 50],
  bottomLayers: [0, 50],
  infillPercent: [0, 100],
  nozzleTemp: [140, 350],
  bedTemp: [0, 130],
  printSpeed: [5, 600],
};

const MAX_MISC_LENGTH = 1000;

/**
 * Validate and normalize a raw (already JSON-parsed) custom settings object.
 * Returns the sanitized settings, or an error string describing the problem.
 */
export function validateCustomSettings(
  raw: unknown
): { settings: CustomPrintSettings } | { error: string } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { error: "Print settings must be an object" };
  }
  const obj = raw as Record<string, unknown>;
  const out: CustomPrintSettings = { ...DEFAULT_CUSTOM_SETTINGS };

  for (const key of Object.keys(NUMERIC_BOUNDS)) {
    const value = obj[key];
    if (typeof value !== "number" || !isFinite(value)) {
      return { error: `Invalid value for ${key}` };
    }
    const [min, max] = NUMERIC_BOUNDS[key];
    if (value < min || value > max) {
      return { error: `${key} must be between ${min} and ${max}` };
    }
    (out as any)[key] = value;
  }

  // Integer-only fields
  for (const key of ["wallCount", "topLayers", "bottomLayers"] as const) {
    out[key] = Math.round(out[key]);
  }
  out.infillPercent = Math.round(out.infillPercent);

  if (!INFILL_PATTERNS.includes(obj.infillPattern as InfillPattern)) {
    return { error: "Invalid infill pattern" };
  }
  out.infillPattern = obj.infillPattern as InfillPattern;

  if (!ADHESION_OPTIONS.includes(obj.adhesion as AdhesionOption)) {
    return { error: "Invalid build plate adhesion option" };
  }
  out.adhesion = obj.adhesion as AdhesionOption;

  if (!SEAM_OPTIONS.includes(obj.seam as SeamOption)) {
    return { error: "Invalid seam position option" };
  }
  out.seam = obj.seam as SeamOption;

  out.ironing = obj.ironing === true;

  if (obj.misc !== undefined && obj.misc !== null) {
    if (typeof obj.misc !== "string") {
      return { error: "Invalid misc settings" };
    }
    if (obj.misc.length > MAX_MISC_LENGTH) {
      return { error: `Misc settings exceed ${MAX_MISC_LENGTH} characters` };
    }
    out.misc = obj.misc;
  } else {
    out.misc = "";
  }

  return { settings: out };
}

/** Safely parse a stored printSettings JSON column. Null / bad data => null (AUTO). */
export function parseStoredSettings(json: string | null | undefined): CustomPrintSettings | null {
  if (!json) return null;
  try {
    const result = validateCustomSettings(JSON.parse(json));
    return "settings" in result ? result.settings : null;
  } catch {
    return null;
  }
}

/** Compact one-line summary, used in emails and tooltips. */
export function summarizeSettings(settings: CustomPrintSettings | null): string {
  if (!settings) return "Auto (shop recommended)";
  const parts = [
    `${settings.layerHeight}mm layers`,
    `${settings.wallCount} walls`,
    `${settings.infillPercent}% ${settings.infillPattern.toLowerCase()} infill`,
    `${settings.nozzleTemp}°C/${settings.bedTemp}°C`,
    `${settings.printSpeed}mm/s`,
    `adhesion: ${settings.adhesion.toLowerCase()}`,
  ];
  if (settings.ironing) parts.push("ironing");
  return parts.join(" · ");
}
