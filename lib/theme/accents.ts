export interface Accent {
  id: string;
  label: string;
  /** Representative colour for the picker swatch; "transparent" renders as a plain outline. */
  swatch: string;
}

export const ACCENTS: Accent[] = [
  { id: "none", label: "Default", swatch: "transparent" },
  { id: "sky", label: "Sky blue", swatch: "#bae6fd" },
  { id: "mint", label: "Mint", swatch: "#a7f3d0" },
  { id: "lavender", label: "Lavender", swatch: "#ddd6fe" },
  { id: "peach", label: "Peach", swatch: "#fed7aa" },
  { id: "rose", label: "Rose", swatch: "#fbcfe8" },
  { id: "butter", label: "Butter", swatch: "#fde68a" },
];

export const DEFAULT_ACCENT = "none";
export const ACCENT_STORAGE_KEY = "accentColor";
