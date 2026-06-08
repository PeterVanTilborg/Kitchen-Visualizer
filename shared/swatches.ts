// Kitchen finish swatches — hardcoded test set for the kitchen-visualizer clone.
//
// Single source of truth shared by the client (swatch picker) and the server
// (Gemini render). The `file` names map to images under client/public/swatches/.
// Drop the matching image files there (Peter supplies them) before deploying.
//
// This deliberately replaces the vehicle app's DB-backed wrap_colors lookup:
// the swatch is a static file on disk, so it can never silently fail into a
// degraded "hex color only" path the way color.imageUrl could.

export interface KitchenSwatch {
  /** Stable id sent from the client and matched on the server. */
  id: string;
  /** Human label shown in the picker. */
  label: string;
  /** Filename under client/public/swatches/ (also served at /swatches/<file>). */
  file: string;
}

export const KITCHEN_SWATCHES: KitchenSwatch[] = [
  { id: "oak", label: "Oak", file: "oak.jpg" },
  { id: "walnut", label: "Walnut", file: "walnut.jpg" },
  { id: "matte-white", label: "Matte White", file: "matte-white.jpg" },
  { id: "matte-charcoal", label: "Matte Charcoal", file: "matte-charcoal.jpg" },
];
