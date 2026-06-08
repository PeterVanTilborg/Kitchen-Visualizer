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
// This script is READ-ONLY — it queries but never writes to wrap_colors.
// =============================================================================
/**
 * scripts/audit-image-urls.ts
 *
 * Audits the wrap_colors table to identify how many image_url values
 * may have been overwritten by the backfill-color-thumbnails script.
 *
 * A generated hex swatch is a 256x256 JPEG data URI â typically < 15 KB.
 * A real uploaded photo data URI is typically > 100 KB.
 *
 * Run:  npx tsx scripts/audit-image-urls.ts
 */

import { db } from "../server/db";
import { wrapColors } from "../shared/schema";

async function main() {
  const rows = await db.select({
    id: wrapColors.id,
    name: wrapColors.name,
    manufacturer: wrapColors.manufacturer,
    imageUrl: wrapColors.imageUrl,
    thumbnailUrl: wrapColors.thumbnailUrl,
  }).from(wrapColors);

  console.log(`\nTotal colors in DB: ${rows.length}\n`);

  let nullImage = 0;
  let httpImage = 0;
  let dataSmall = 0;   // < 15 KB â almost certainly a generated hex swatch
  let dataMedium = 0;  // 15â100 KB â ambiguous
  let dataLarge = 0;   // > 100 KB â likely a real uploaded photo
  let legacyPath = 0;
  let other = 0;

  const affected: { id: number; name: string; manufacturer: string | null; sizeKb: number }[] = [];

  for (const row of rows) {
    const url = row.imageUrl;
    if (!url) {
      nullImage++;
    } else if (url.startsWith("http://") || url.startsWith("https://")) {
      httpImage++;
    } else if (url.startsWith("data:")) {
      const kb = Math.round(url.length / 1024);
      if (kb < 15) {
        dataSmall++;
        affected.push({ id: row.id, name: row.name, manufacturer: row.manufacturer, sizeKb: kb });
      } else if (kb <= 100) {
        dataMedium++;
      } else {
        dataLarge++;
      }
    } else if (url.startsWith("/") || url.startsWith("./")) {
      legacyPath++;
    } else {
      other++;
    }
  }

  console.log("=== image_url breakdown ===");
  console.log(`  NULL                          : ${nullImage}`);
  console.log(`  HTTP(S) URL (safe)            : ${httpImage}`);
  console.log(`  data: URI  < 15 KB  (swatch?) : ${dataSmall}  â LIKELY OVERWRITTEN`);
  console.log(`  data: URI  15â100 KB          : ${dataMedium}`);
  console.log(`  data: URI  > 100 KB (photo?)  : ${dataLarge}`);
  console.log(`  Legacy relative path          : ${legacyPath}`);
  console.log(`  Other                         : ${other}`);
  console.log(`\nColors that appear overwritten (${affected.length}):`);

  for (const a of affected) {
    console.log(`  id=${String(a.id).padEnd(5)} ${(a.manufacturer ?? "").padEnd(20)} ${a.name.padEnd(30)} ${a.sizeKb}KB`);
  }

  const thumbnailRows = rows.filter(r => !!r.thumbnailUrl);
  console.log(`\nthumbnail_url populated: ${thumbnailRows.length} / ${rows.length}`);
}

main().catch(console.error).finally(() => process.exit(0));
