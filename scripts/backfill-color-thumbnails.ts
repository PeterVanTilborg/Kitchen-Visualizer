// =============================================================================
// ⚠️  IMMUTABLE COLUMNS — wrap_colors READ-ONLY GUARD
// =============================================================================
// A PostgreSQL trigger (wrap_colors_immutable_cols) enforces that the
// following columns CANNOT be overwritten once they have a non-NULL value.
// Any UPDATE that tries to change them will RAISE AN EXCEPTION at DB level:
//
//   • image_url            — original full-resolution swatch book photo
//   • reference_image_data — reference photo of a real car in this colour
//   • manufacturer         — brand name (e.g. "3M 2080")
//   • color_number         — SKU / product number
//   • name                 — colour name
//   • category             — wrap category (e.g. "Satin", "Gloss")
//
// This script may only write image_url for rows where it is currently NULL.
// It must NEVER overwrite an existing non-null image_url (trigger will block it).
// =============================================================================
/**
 * One-shot backfill: generate swatch thumbnails for existing wrap colors.
 *
 * Many rows in `wrap_colors` have `imageUrl` set to NULL or to a legacy
 * file path like "/colors/xxx.jpg" that no longer resolves in production.
 * Those rows show up as blank swatches in the UI. This script walks the
 * table, finds every row that does NOT already have a `data:` URI in
 * `imageUrl`, and writes a solid-color JPEG swatch (generated from the
 * row's `hexColor`) as a base64 data URI.
 *
 * Usage:
 *   tsx scripts/backfill-color-thumbnails.ts           # dry run (default)
 *   tsx scripts/backfill-color-thumbnails.ts --apply   # actually write
 *   tsx scripts/backfill-color-thumbnails.ts --apply --force
 *        # also overwrite rows that already have a data: URI
 *
 * Safe to re-run. Without --apply nothing is written.
 */

import sharp from "sharp";
import { eq } from "drizzle-orm";
import { db } from "../server/db";
import { wrapColors } from "../shared/schema";

const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");
const SIZE = 256;              // square swatch, 256x256
const JPEG_QUALITY = 88;

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  if (!hex) return null;
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) {
    h = h.split("").map((c) => c + c).join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

async function makeSwatchDataUri(hex: string): Promise<string> {
  const rgb = parseHex(hex);
  if (!rgb) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  const buf = await sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 3,
      background: { r: rgb.r, g: rgb.g, b: rgb.b },
    },
  })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

function needsBackfill(imageUrl: string | null | undefined): boolean {
  if (FORCE) return true;
  if (!imageUrl) return true;
  // NEVER overwrite real HTTP(S) URLs (uploaded photos in Supabase / storage)
  // or existing data: URIs â those are already valid images.
  // Only replace legacy relative paths like "/colors/xxx.jpg".
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return false;
  if (imageUrl.startsWith("data:")) return false;
  return true; // legacy relative path â stale, regenerate
}

async function main() {
  console.log(
    `Color thumbnail backfill â mode: ${APPLY ? "APPLY" : "DRY RUN"}${
      FORCE ? " (force)" : ""
    }`,
  );

  const rows = await db.select().from(wrapColors);
  console.log(`Loaded ${rows.length} color rows from wrap_colors.`);

  const targets = rows.filter((r) => needsBackfill(r.imageUrl));
  console.log(`${targets.length} rows need a thumbnail.`);

  if (targets.length === 0) {
    console.log("Nothing to do.");
    process.exit(0);
  }

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of targets) {
    const label = `#${row.id} ${row.manufacturer ?? ""} ${row.name}`.trim();
    try {
      if (!row.hexColor) {
        console.warn(`  skip ${label} â missing hexColor`);
        skipped++;
        continue;
      }
      const dataUri = await makeSwatchDataUri(row.hexColor);

      if (!APPLY) {
        console.log(
          `  would update ${label}  hex=${row.hexColor}  bytes=${dataUri.length}`,
        );
        updated++;
        continue;
      }

      await db
        .update(wrapColors)
        .set({ imageUrl: dataUri })
        .where(eq(wrapColors.id, row.id));
      updated++;
      if (updated % 25 === 0) {
        console.log(`  progress: ${updated}/${targets.length}`);
      }
    } catch (err) {
      failed++;
      console.error(`  fail  ${label}:`, (err as Error).message);
    }
  }

  console.log("");
  console.log(
    `Done. ${APPLY ? "updated" : "would update"}: ${updated}, skipped: ${skipped}, failed: ${failed}`,
  );
  if (!APPLY) {
    console.log("Dry run only â re-run with --apply to persist changes.");
  }
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
