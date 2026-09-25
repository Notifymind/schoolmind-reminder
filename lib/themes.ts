export const themes = [
  { value: "neutral", label: "Neutral" },
  { value: "ocean", label: "Ocean" },
  { value: "forest", label: "Forest" },
  { value: "lavender", label: "Lavender" },
] as const;

export type Palette = (typeof themes)[number]["value"];
export const paletteStorageKey = "notifymind-palette";

export function parsePalette(value: string | null): Palette {
  return themes.find((theme) => theme.value === value)?.value ?? "neutral";
}

// Apply the saved palette before paint, independently of next-themes' mode.
export const paletteInitScript = `try{document.documentElement.dataset.palette=${JSON.stringify(themes.map((theme) => theme.value))}.find(function(value){return value===localStorage.getItem(${JSON.stringify(paletteStorageKey)})})||"neutral"}catch{}`;
