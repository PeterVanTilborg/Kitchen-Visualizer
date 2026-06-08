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
// This script INSERTs new rows only. It must never UPDATE existing color data
// in protected columns once rows have been seeded.
// =============================================================================
import { db } from "../server/db";
import { wrapColors } from "../shared/schema";
import { sql } from "drizzle-orm";
import colorsData from "./colors_data.json";

async function seedColors() {
    console.log("Seeding wrap colors...");

  // Safety check: if colors already exist, skip seeding to preserve
  // any admin-uploaded reference images stored in the DB.
  // The seed used to DELETE all rows first, which wiped custom swatches
  // on every deployment. This version is safe to run repeatedly.
  const existing = await db
      .select({ count: sql<number>`count(*)` })
      .from(wrapColors);
    const existingCount = Number(existing[0]?.count || 0);

  if (existingCount > 0) {
        console.log(
                `Colors table already has ${existingCount} rows. Skipping seed to preserve admin data.`
              );
        console.log(
                "To force a full re-seed, manually TRUNCATE the wrap_colors table first."
              );
        process.exit(0);
  }

  const rows = (colorsData as any[]).map((c) => ({
        name: c.name || c.fullName,
        hexColor: c.hexColor,
        imageUrl: c.imageUrl,
        manufacturer: c.manufacturer,
        category: c.category,
  }));

  // Insert in batches of 50
  const BATCH = 50;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
          const batch = rows.slice(i, i + BATCH);
          await db.insert(wrapColors).values(batch);
          inserted += batch.length;
          console.log(` Inserted ${inserted}/${rows.length} colors`);
    }

  console.log(`\nDone! ${inserted} colors seeded.`);
    process.exit(0);
}

seedColors().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
});
