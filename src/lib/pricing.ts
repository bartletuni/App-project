/** A single priced line — "Setup Fee per Build … $25.00 / build". */
export interface PricingItemData {
  label: string;
  detail: string;
  price: string;
  note: string;
}

/** A block of the sheet — section A, B, C … on the printed catalog. */
export interface PricingSectionData {
  title: string;
  intro: string;
  items: PricingItemData[];
}

/** One row of the material selection matrix. */
export interface PricingMatrixRowData {
  materialClass: string;
  gradeType: string;
  characteristics: string;
  applications: string;
}

/** Free-form copy blocks, keyed so the admin editor can address them. */
export interface PricingSettingsData {
  heroEyebrow: string;
  heroTitle: string;
  heroTitleAccent: string;
  heroIntro: string;
  advantageLabel: string;
  advantageBody: string;
  matrixTitle: string;
  matrixIntro: string;
  contactPhone: string;
  contactEmail: string;
  contactWeb: string;
  footerNote: string;
}

export interface PricingContent {
  settings: PricingSettingsData;
  sections: PricingSectionData[];
  matrix: PricingMatrixRowData[];
}

/** Guard rails so a bad (or hostile) payload can't blow up the page or the DB. */
export const PRICING_LIMITS = {
  maxSections: 20,
  maxItemsPerSection: 40,
  maxMatrixRows: 40,
  title: 120,
  intro: 2000,
  label: 200,
  detail: 600,
  price: 120,
  note: 300,
  matrixCell: 400,
  setting: 2000,
} as const;

export const SETTING_KEYS: (keyof PricingSettingsData)[] = [
  "heroEyebrow",
  "heroTitle",
  "heroTitleAccent",
  "heroIntro",
  "advantageLabel",
  "advantageBody",
  "matrixTitle",
  "matrixIntro",
  "contactPhone",
  "contactEmail",
  "contactWeb",
  "footerNote",
];

/**
 * The catalog as written by the shop. Used until an admin saves their own
 * copy, and restorable at any time from the admin editor.
 *
 * Per-gram material rates deliberately live on each material record (the
 * stock index), not here — this sheet only carries the flat service fees.
 */
export const DEFAULT_PRICING: PricingContent = {
  settings: {
    heroEyebrow: "SERVICE CATALOG ⁄ RATES",
    heroTitle: "Standardized",
    heroTitleAccent: "pricing.",
    heroIntro:
      "TakomoCo provides high-precision, low-volume 3D printing, 0.02mm precision 3D scanning, and rapid reverse engineering for Wasatch Front tech, engineering, and hardware teams. We specialize in fast-turnaround production of functional prototypes, end-use replacement components, custom tooling, and high-performance carbon-fiber composite parts.",
    advantageLabel: "KEY ADVANTAGE",
    advantageBody:
      "24-Hour Express Turnaround available for urgent local engineering deadlines.",
    matrixTitle: "Material selection matrix",
    matrixIntro:
      "Pick the class that matches the load case. Per-gram rates are listed with each material in the stock index.",
    contactPhone: "(385) 695-4178",
    contactEmail: "takomocompany@gmail.com",
    contactWeb: "takomo.vercel.app",
    footerNote:
      "All rates in USD. Material cost is quoted per material at time of order and is additional to the service fees listed above. Large or complex work is quoted individually.",
  },
  sections: [
    {
      title: "High-Precision 3D Printing",
      intro:
        "Flat build fees below; per-gram material cost is set per material and listed in the stock index.",
      items: [
        {
          label: "Setup Fee per Build",
          detail: "Covers prep, slice optimization, and post-processing.",
          price: "$25.00",
          note: "per build",
        },
        {
          label: "Minimum Order Value",
          detail: "Applies to every printing order before discounts.",
          price: "$50.00",
          note: "",
        },
        {
          label: "Volume Discount — 10+ parts",
          detail: "Applied automatically to the material subtotal.",
          price: "10% off",
          note: "",
        },
        {
          label: "Volume Discount — 50+ parts",
          detail: "Applied automatically to the material subtotal.",
          price: "20% off",
          note: "",
        },
      ],
    },
    {
      title: "0.02mm Precision 3D Scanning & Metrology",
      intro: "",
      items: [
        {
          label: "Small Component Scan",
          detail: "Parts under 100mm.",
          price: "$75.00",
          note: "flat setup rate",
        },
        {
          label: "Medium Component Scan",
          detail: "Parts from 100mm to 500mm.",
          price: "$150.00",
          note: "flat setup rate",
        },
        {
          label: "Large / Complex Assembly Scan",
          detail: "Assemblies over 500mm.",
          price: "$250.00+",
          note: "custom quote",
        },
        {
          label: "Dimensional Inspection & Metrology Report",
          detail: "Measured report against nominal geometry.",
          price: "$50.00",
          note: "per part",
        },
      ],
    },
    {
      title: "Reverse Engineering & CAD Reconstruction",
      intro: "",
      items: [
        {
          label: "Parametric STEP/IGES CAD Reconstruction",
          detail: "Standard mechanical parts available at a flat rate.",
          price: "$85.00 / hour",
          note: "or $120.00 flat for standard mechanical parts",
        },
        {
          label: "Scan-to-Print Express Package",
          detail: "Scan + CAD reconstruction + prototype print.",
          price: "Starting at $195.00",
          note: "",
        },
      ],
    },
    {
      title: "Lead Time & Turnaround",
      intro: "",
      items: [
        {
          label: "Standard Local Turnaround",
          detail: "Wasatch Front pickup or shipping.",
          price: "48–72 hours",
          note: "",
        },
        {
          label: "24-Hour Express Turnaround",
          detail:
            "Same-day / next-day local dropoff and pickup in Murray and SLC.",
          price: "+35%",
          note: "express surcharge",
        },
      ],
    },
    {
      title: "How to Order & Submit CAD Files",
      intro: "",
      items: [
        {
          label: "Web Upload",
          detail:
            "Submit CAD files (.STEP, .STL, .IGES) directly at takomo.vercel.app.",
          price: "",
          note: "",
        },
        {
          label: "SMS Instant Inquiry",
          detail:
            "Text CAD files or part inquiry photos to (385) 695-4178.",
          price: "",
          note: "",
        },
        {
          label: "Physical Dropoff / Ship-to-Scan",
          detail:
            "Ship or drop off worn or broken parts for 0.02mm precision scanning at our Murray, UT facility.",
          price: "",
          note: "",
        },
      ],
    },
  ],
  matrix: [
    {
      materialClass: "High-Temp / Chemical",
      gradeType: "PPS-CF / PPS-GF",
      characteristics:
        "High heat deflection temp, UL94 V-0, solvent immunity",
      applications:
        "Engine/chamber adjacent parts, fluid manifolds, sensor housings",
    },
    {
      materialClass: "Structural Composite",
      gradeType: "PA12-CF / PA6-CF",
      characteristics:
        "High stiffness-to-weight, impact strength, fatigue resistance",
      applications:
        "Structural brackets, drone mounts, high-cycle mechanical gears",
    },
    {
      materialClass: "High Impact",
      gradeType: "Polycarbonate (PC)",
      characteristics:
        "Exceptional toughness, clarity/opacity, dimensional stability",
      applications:
        "Protective guards, housings, enclosures, high-cycle covers",
    },
    {
      materialClass: "UV & Weather",
      gradeType: "ASA",
      characteristics: "High UV stability, thermal endurance, weatherproofing",
      applications:
        "Outdoor equipment, electrical cabinet vent covers, housings",
    },
    {
      materialClass: "Flexible / Utility",
      gradeType: "TPU / PETG / PLA",
      characteristics:
        "Elastomeric compliance (TPU), chemical resistance (PETG), rapid verification (PLA)",
      applications:
        "Gaskets, seals, light-duty fluid contact, rapid concept checks",
    },
  ],
};

function str(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

/**
 * Coerce an untrusted payload into a valid PricingContent, dropping empty
 * rows and clamping every string. Returns null when the shape is unusable.
 */
export function sanitizePricingContent(input: unknown): PricingContent | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;

  if (!Array.isArray(raw.sections) || !Array.isArray(raw.matrix)) return null;
  if (!raw.settings || typeof raw.settings !== "object") return null;
  if (
    raw.sections.length > PRICING_LIMITS.maxSections ||
    raw.matrix.length > PRICING_LIMITS.maxMatrixRows
  ) {
    return null;
  }

  const rawSettings = raw.settings as Record<string, unknown>;
  const settings = { ...DEFAULT_PRICING.settings };
  for (const key of SETTING_KEYS) {
    if (key in rawSettings) {
      if (typeof rawSettings[key] !== "string") return null;
      settings[key] = str(rawSettings[key], PRICING_LIMITS.setting);
    }
  }

  const sections: PricingSectionData[] = [];
  for (const rawSection of raw.sections) {
    if (!rawSection || typeof rawSection !== "object") return null;
    const section = rawSection as Record<string, unknown>;
    const title = str(section.title, PRICING_LIMITS.title);
    if (!title) continue;

    const rawItems = Array.isArray(section.items) ? section.items : [];
    if (rawItems.length > PRICING_LIMITS.maxItemsPerSection) return null;

    const items: PricingItemData[] = [];
    for (const rawItem of rawItems) {
      if (!rawItem || typeof rawItem !== "object") return null;
      const item = rawItem as Record<string, unknown>;
      const label = str(item.label, PRICING_LIMITS.label);
      if (!label) continue;
      items.push({
        label,
        detail: str(item.detail, PRICING_LIMITS.detail),
        price: str(item.price, PRICING_LIMITS.price),
        note: str(item.note, PRICING_LIMITS.note),
      });
    }

    sections.push({
      title,
      intro: str(section.intro, PRICING_LIMITS.intro),
      items,
    });
  }

  const matrix: PricingMatrixRowData[] = [];
  for (const rawRow of raw.matrix) {
    if (!rawRow || typeof rawRow !== "object") return null;
    const row = rawRow as Record<string, unknown>;
    const materialClass = str(row.materialClass, PRICING_LIMITS.matrixCell);
    const gradeType = str(row.gradeType, PRICING_LIMITS.matrixCell);
    const characteristics = str(row.characteristics, PRICING_LIMITS.matrixCell);
    const applications = str(row.applications, PRICING_LIMITS.matrixCell);
    if (!materialClass && !gradeType && !characteristics && !applications) continue;
    matrix.push({ materialClass, gradeType, characteristics, applications });
  }

  return { settings, sections, matrix };
}
