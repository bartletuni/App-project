/**
 * The materials the shop prints, as the public site names them.
 *
 * One list, read by the homepage spec sheet and by its materials ticker, so the
 * two cannot disagree about what is on the shelf or how it is spelled. Before
 * it, each kept its own copy: one listed PA12-CF twice, one wrote "PPS-CF/GF"
 * where the other wrote "PPS-CF · PPS-GF", and each carried materials the other
 * had never heard of.
 *
 * Notation, so a new entry reads like the rest:
 *   - the base polymer first (PA12, PPS, PETG), then what is added to it;
 *   - CF is carbon fiber, GF glass fiber, FR flame retardant, joined to the
 *     polymer by a hyphen, and a slash lists the grades offered
 *     ("PPS-CF/GF" is both a carbon-filled and a glass-filled PPS);
 *   - never the same material twice, and never two spellings of one.
 *
 * PET and PETG are different materials — PETG is glycol-modified, and prints and
 * behaves differently — so both are listed and neither stands in for the other.
 *
 * This is the short list the marketing pages show. The stock index at
 * /materials is the shop's real inventory, edited in the admin console, and is
 * not read from here.
 */
export const MATERIAL_NAMES = [
  // High-temperature composites
  "PPS-CF/GF",
  "PPA-CF",
  // Nylons
  "PA6-CF",
  "PA12-CF",
  "PA612-CF",
  // Polycarbonates
  "PC-CF/FR",
  "PC",
  // Polyesters
  "PET-CF/GF",
  "PETG-CF",
  "PETG",
  // Weather- and impact-resistant
  "ASA-CF/GF",
  "ABS",
  // General purpose
  "PLA",
  // Flexible
  "TPU",
  "PEBA",
] as const;

/** What the abbreviations in the list stand for, for a reader outside the trade. */
export const MATERIAL_LEGEND =
  "CF carbon fiber · GF glass fiber · FR flame retardant · PA nylon · PC polycarbonate";
