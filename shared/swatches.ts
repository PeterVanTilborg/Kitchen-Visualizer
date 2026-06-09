// Kitchen finish swatches — hardcoded test set for the kitchen-visualizer clone.
//
// Single source of truth shared by the client (swatch picker) and the server
// (Gemini render). The `file` names map to images under client/public/swatches/.
//
// This deliberately replaces the vehicle app's DB-backed wrap_colors lookup:
// the swatch is a static file on disk, so it can never silently fail into a
// degraded "hex color only" path the way color.imageUrl could.

/** Material family — drives the texture instruction the server gives Gemini. */
export type SwatchMaterial = "wood" | "marble" | "matte";

export interface KitchenSwatch {
  /** Stable id sent from the client and matched on the server. */
  id: string;
  /** Human label shown in the picker. */
  label: string;
  /** Filename under client/public/swatches/ (also served at /swatches/<file>). */
  file: string;
  /** Material family — selects the per-material render instruction. */
  material: SwatchMaterial;
}

export const KITCHEN_SWATCHES: KitchenSwatch[] = [
  { id: "light-oak", label: "Light Oak", file: "light-oak.jpg", material: "wood" },
  { id: "walnut", label: "Walnut", file: "walnut.jpg", material: "wood" },
  { id: "marble", label: "Marble", file: "marble.jpg", material: "marble" },
  { id: "matte-white", label: "Matte White", file: "matte-white.jpg", material: "matte" },
];
