// Central brand identity for BoroDesk (the app originally scaffolded as SupersDeck).
// Single source of truth — change values here to rebrand app-wide.
export const BRAND = {
  name: "BoroDesk",
  tagline: "NYC building ops",
  description:
    "Compliance, work orders, superintendent operations, and contractor sign-in for NYC property managers.",
} as const;

// First letter, used for the square logo glyph.
export const BRAND_GLYPH = BRAND.name.charAt(0); // "B"
