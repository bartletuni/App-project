import { MATERIAL_LEGEND, MATERIAL_NAMES } from "@/lib/material-names";

describe("MATERIAL_NAMES", () => {
  it("lists nothing twice, in any spelling", () => {
    const seen = new Set<string>();
    for (const name of MATERIAL_NAMES) {
      const key = name.toLowerCase().replace(/[^a-z0-9]/g, "");
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("keeps PET and PETG as separate materials", () => {
    expect(MATERIAL_NAMES).toContain("PETG");
    expect(MATERIAL_NAMES).toContain("PETG-CF");
    expect(MATERIAL_NAMES).toContain("PET-CF/GF");
    // PETG is not a typo for PET, so nothing here may be a bare "PET".
    expect(MATERIAL_NAMES).not.toContain("PET");
  });

  it("writes every name the same way: polymer, then hyphenated fillers, slash for grades", () => {
    const notation = /^[A-Z]+[0-9]*(-(CF|GF|FR)(\/(CF|GF|FR))?)?$/;
    for (const name of MATERIAL_NAMES) {
      expect(name).toMatch(notation);
    }
  });

  it("explains every filler suffix it uses", () => {
    const suffixes = new Set<string>();
    for (const name of MATERIAL_NAMES) {
      for (const part of name.split("-").slice(1).join("/").split("/")) {
        if (part) suffixes.add(part);
      }
    }
    expect(suffixes.size).toBeGreaterThan(0);
    suffixes.forEach((suffix) => {
      expect(MATERIAL_LEGEND).toContain(`${suffix} `);
    });
  });
});
