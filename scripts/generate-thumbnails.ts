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
// This script writes ONLY to thumbnail_url. It must never touch image_url.
// =============================================================================
/**
 * scripts/generate-thumbnails.ts
 *
 * Backfill script: reads every wrap color that has a swatch image but no
 * thumbnail yet, generates a 300x300 cover-fit JPEG at quality 80, and saves
 * it to thumbnailUrl.
 *
 * Supports two imageUrl formats:
 *   - data: URI    â decoded directly from base64
 *   - /colors/â¦   â legacy file path served from client/public; read from disk
 *
 * NEVER overwrites imageUrl or referenceImageData.
 *
 * Usage:
 *   tsx scripts/generate-thumbnails.ts            # dry run (shows what would change)
 *   tsx scripts/generate-thumbnails.ts --apply    # write to database
 *   tsx scripts/generate-thumbnails.ts --apply --force  # re-generate even if thumbnailUrl exists
 */
import * as fs from "fs";
import * as path from "path";
import { db } from "../server/db";
import { wrapColors } from "../shared/schema";
import { sql } from "drizzle-orm";
import sharp from "sharp";

const apply = process.argv.includes("--apply");
const force = process.argv.includes("--force");

async function generateThumbnails() {
  console.log("[generate-thumbnails] Starting thumbnail backfill...");
  console.log(
    `[generate-thumbnails] Mode: ${apply ? "APPLY (writing to DB)" : "DRY RUN (pass --apply to write)"}`
  );
  if (force) {
    console.log("[generate-thumbnails] --force: will regenerate existing thumbnails too");
  }

  // Fetch only the columns we need (avoid pulling large imageUrl for all colors at once)
  const colors = await db
    .select({
      id: wrapColors.id,
      name: wrapColors.name,
      imageUrl: wrapColors.imageUrl,
      thumbnailUrl: wrapColors.thumbnailUrl,
    })
    .from(wrapColors);

  const toProcess = colors.filter((c) => {
    if (!c.imageUrl) return false; // no image at all â skip
    const isDataUri = c.imageUrl.startsWith("data:");
    const isLegacyPath = c.imageUrl.startsWith("/colors/");
    if (!isDataUri && !isLegacyPath) return false; // unknown format â skip
    if (!force && c.thumbnailUrl) return false; // skip already-thumbnailed (null/empty = process)
    return true;
  });

  const alreadyDone = colors.filter((c) => c.thumbnailUrl && !force).length;
  const noImage = colors.filter((c) => {
    if (!c.imageUrl) return true;
    if (c.imageUrl.startsWith("data:") || c.imageUrl.startsWith("/colors/")) return false;
    return true;
  }).length;

  console.log(
    `[generate-thumbnails] ${colors.length} total | ` +
    `${toProcess.length} to process | ` +
    `${alreadyDone} already have thumbnails | ` +
    `${noImage} have no usable swatch image`
  );

  let processed = 0;
  let errors = 0;

  for (const color of toProcess) {
    try {
      let imageBuffer: Buffer;

      if (color.imageUrl!.startsWith("data:")) {
        // Decode base64 from data URI
        const commaIdx = color.imageUrl!.indexOf(",");
        if (commaIdx === -1) {
          console.warn(`[generate-thumbnails] skip ${color.id}: ${color.name} - malformed data URI`);
          continue;
        }
        const b64 = color.imageUrl!.slice(commaIdx + 1);
        imageBuffer = Buffer.from(b64, "base64");
      } else {
        // Legacy file path â read from client/public on disk
        const filePath = path.join(
          process.cwd(),
          "client",
          "public",
          color.imageUrl!.replace(/^\//, "")
        );
        if (!fs.existsSync(filePath)) {
          console.warn(
            `[generate-thumbnails] skip ${color.id}: ${color.name} - file not found: ${filePath}`
          );
          continue;
        }
        imageBuffer = fs.readFileSync(filePath);
      }

      // Generate 300x300 cover-fit JPEG at quality 80
      const thumbnailBuffer = await sharp(imageBuffer)
        .resize(300, 300, { fit: "cover" })
        .jpeg({ quality: 80 })
        .toBuffer();

      const thumbnailUrl = `data:image/jpeg;base64,${thumbnailBuffer.toString("base64")}`;

      if (apply) {
        await db
          .update(wrapColors)
          .set({ thumbnailUrl })
          .where(sql`${wrapColors.id} = ${color.id}`);
        console.log(
          `[generate-thumbnails] â ${color.id}: ${color.name} ` +
          `(${Math.round(thumbnailBuffer.length / 1024)}KB thumbnail)`
        );
      } else {
        console.log(
          `[generate-thumbnails] (dry-run) would update ${color.id}: ${color.name} ` +
          `(${Math.round(thumbnailBuffer.length / 1024)}KB thumbnail)`
        );
      }
      processed++;
    } catch (err) {
      console.error(`[generate-thumbnails] â ${color.id}: ${color.name} - ${err}`);
      errors++;
    }
  }

  console.log(
    `\n[generate-thumbnails] Done. processed=${processed} errors=${errors}`
  );
  if (!apply && processed > 0) {
    console.log("[generate-thumbnails] Run with --apply to write to database.");
  }
}

generateThumbnails()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[generate-thumbnails] Fatal error:", err);
    process.exit(1);
  });
