import { db } from "./db";
import { sql } from "drizzle-orm";

/**
 * Safe startup migrations — adds new columns/tables only if they don't exist.
 * This avoids needing drizzle-kit push in production.
 */
export async function runMigrations() {
  try {
    // Add userId column to generated_images (for linking to user accounts)
    await db.execute(sql`
      ALTER TABLE generated_images
      ADD COLUMN IF NOT EXISTS user_id VARCHAR;
    `);

    // Add originalImageData column (stores the uploaded original photo)
    await db.execute(sql`
      ALTER TABLE generated_images
      ADD COLUMN IF NOT EXISTS original_image_data TEXT;
    `);

    // Add colorName column (human-readable color for email/SMS messages)
    await db.execute(sql`
      ALTER TABLE generated_images
      ADD COLUMN IF NOT EXISTS color_name TEXT;
    `);

    // Add referenceImageData column to wrap_colors (optional photo of a real car in that color)
    await db.execute(sql`
      ALTER TABLE wrap_colors
      ADD COLUMN IF NOT EXISTS reference_image_data TEXT;
    `);

    // Add colorNumber column to wrap_colors (optional product code e.g. "SP280", "TBC 101")
    await db.execute(sql`
      ALTER TABLE wrap_colors
      ADD COLUMN IF NOT EXISTS color_number TEXT;
    `);

    // Add sortOrder column for drag-and-drop reordering (matches supplier swatch book)
    await db.execute(sql`
      ALTER TABLE wrap_colors
      ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
    `);

    // Add thumbnailUrl column to wrap_colors (300x300 cover-fit JPEG for fast list loading)
    await db.execute(sql`
      ALTER TABLE wrap_colors
      ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
    `);

    // Create design_shares table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS design_shares (
        id SERIAL PRIMARY KEY,
        generated_image_id INTEGER NOT NULL,
        customer_email TEXT,
        customer_phone TEXT,
        delivery_method TEXT NOT NULL,
        sent_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create credit_packages table for admin-manageable pricing
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS credit_packages (
        id SERIAL PRIMARY KEY,
        package_id TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        credits INTEGER NOT NULL,
        price INTEGER NOT NULL,
        price_id TEXT,
        savings TEXT,
        popular BOOLEAN NOT NULL DEFAULT false,
        plan_type TEXT NOT NULL DEFAULT 'plan',
        active BOOLEAN NOT NULL DEFAULT true,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Seed default packages if table is empty
    await db.execute(sql`
      INSERT INTO credit_packages (package_id, name, description, credits, price, savings, popular, plan_type, sort_order)
      SELECT v.package_id, v.name, v.description, v.credits, v.price, v.savings, v.popular, v.plan_type, v.sort_order
      FROM (VALUES
        ('plan_starter'::text, 'Starter'::text, 'Perfect to get started'::text, 20, 50, NULL::text, false, 'plan'::text, 1),
        ('plan_pro', 'Pro', 'Most popular choice', 50, 99, NULL, true, 'plan', 2),
        ('plan_business', 'Business', 'For heavy users', 250, 249, NULL, false, 'plan', 3),
        ('topup_small', 'Small Top-Up', '5 extra renders', 5, 9, NULL, false, 'topup', 4),
        ('topup_medium', 'Medium Top-Up', '15 extra renders', 15, 18, NULL, false, 'topup', 5),
        ('topup_large', 'Large Top-Up', '30 extra renders', 30, 27, NULL, false, 'topup', 6)
      ) AS v(package_id, name, description, credits, price, savings, popular, plan_type, sort_order)
      WHERE NOT EXISTS (SELECT 1 FROM credit_packages LIMIT 1);
    `);

    // Create influencer_applications table for ambassador program
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS influencer_applications (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        instagram_url TEXT NOT NULL,
        tiktok_url TEXT,
        youtube_url TEXT,
        other_social_url TEXT,
        motivation TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        admin_notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Add subscription tracking columns to users table
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_id TEXT;`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT;`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan_id TEXT;`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_renews_at TIMESTAMP;`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_credits_per_month INTEGER DEFAULT 0;`);

    // Cancellation tracking (PR 3 of Partner Lifecycle v1)
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS cancels_at TIMESTAMP;`);

    // PR #69 — replace role='influencer' overload with a dedicated
    // is_ambassador boolean. Idempotent backstops; production was
    // pre-migrated manually via Railway Query tab. The UPDATE is a no-op
    // on subsequent runs because the WHERE clause finds zero rows.
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_ambassador BOOLEAN NOT NULL DEFAULT false;`);
    await db.execute(sql`UPDATE users SET is_ambassador = true, role = 'user' WHERE role = 'influencer';`);

    // PR #70 — referral handle for ambassador tracking links. The UNIQUE
    // clause auto-creates a btree unique index. Stored lowercase by
    // handler-layer normalisation; case-insensitive uniqueness emerges
    // from that. Idempotent backstop; production was pre-migrated via
    // Railway Query tab.
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_handle VARCHAR(30) UNIQUE;`);

    // PR #71 — referrer attribution. Self-referencing FK with default
    // NO ACTION on delete. Partial index keeps the index small since
    // most users will have NULL. Idempotent backstops; production was
    // pre-migrated via Railway Query tab.
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_user_id VARCHAR REFERENCES users(id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by_user_id) WHERE referred_by_user_id IS NOT NULL;`);

    // PR #72 — commission ledger. Written by the Stripe webhook on the
    // first attributed purchase. UNIQUE on referred_user_id is the
    // lifetime guarantee. Idempotent backstops; production was
    // pre-migrated via Railway Query tab.
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS commission_ledger (
        id SERIAL PRIMARY KEY,
        referrer_user_id VARCHAR NOT NULL REFERENCES users(id),
        referred_user_id VARCHAR NOT NULL UNIQUE REFERENCES users(id),
        source_purchase_id INTEGER NOT NULL REFERENCES credit_purchases(id),
        amount_cents INTEGER NOT NULL,
        rate_percent INTEGER NOT NULL DEFAULT 20,
        status VARCHAR NOT NULL DEFAULT 'pending',
        paid_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_commission_ledger_referrer ON commission_ledger(referrer_user_id);`);

        // Partner Embedding System tables
    await db.execute(sql`CREATE TABLE IF NOT EXISTS partners (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR NOT NULL,
      business_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      allowed_domain TEXT NOT NULL,
      embed_token TEXT NOT NULL UNIQUE,
      credits_remaining INTEGER NOT NULL DEFAULT 0,
      credits_per_month INTEGER NOT NULL DEFAULT 150,
      suspended BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`);
    await db.execute(sql`ALTER TABLE partners ADD COLUMN IF NOT EXISTS free_render_limit INTEGER NOT NULL DEFAULT 3`)
    await db.execute(sql`CREATE TABLE IF NOT EXISTS partner_brands (
      id SERIAL PRIMARY KEY,
      partner_id INTEGER NOT NULL REFERENCES partners(id),
      brand TEXT NOT NULL
    )`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS partner_renders (
      id SERIAL PRIMARY KEY,
      partner_id INTEGER NOT NULL REFERENCES partners(id),
      car_description TEXT,
      color_name TEXT,
      manufacturer TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`);

    // Add missing columns (safe to run multiple times)
    // Drop redundant credential columns — stored in users table via user_id
    await db.execute(sql`ALTER TABLE partners DROP COLUMN IF EXISTS email`);
    await db.execute(sql`ALTER TABLE partners ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT`);
    await db.execute(sql`ALTER TABLE partners ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP`);
    await db.execute(sql`ALTER TABLE partners DROP COLUMN IF EXISTS password_hash`);
    await db.execute(sql`ALTER TABLE partners ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'pending'`);
    await db.execute(sql`ALTER TABLE partners ADD COLUMN IF NOT EXISTS auto_topup BOOLEAN DEFAULT false`);
    await db.execute(sql`ALTER TABLE partners ADD COLUMN IF NOT EXISTS quote_form_url TEXT`);
    await db.execute(sql`ALTER TABLE partners ADD COLUMN IF NOT EXISTS logo_url TEXT`);
    await db.execute(sql`ALTER TABLE partners ADD COLUMN IF NOT EXISTS contact_email TEXT`);
    // Cancellation tracking (PR 3 of Partner Lifecycle v1)
    await db.execute(sql`ALTER TABLE partners ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE`);
    await db.execute(sql`ALTER TABLE partners ADD COLUMN IF NOT EXISTS cancels_at TIMESTAMP`);
    await db.execute(sql`ALTER TABLE partner_renders ADD COLUMN IF NOT EXISTS customer_email TEXT`);
    await db.execute(sql`ALTER TABLE partner_renders ADD COLUMN IF NOT EXISTS color_id INTEGER`);
    await db.execute(sql`ALTER TABLE partner_renders ADD COLUMN IF NOT EXISTS result_image_url TEXT`);

    // Deactivate partner credit packages that leaked into public pricing
    await db.execute(sql`UPDATE credit_packages SET active = false, plan_type = 'partner' WHERE name LIKE '%Partner%'`);
    // Add role and name columns to users table for partner accounts
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT`);

      await db.execute(sql`UPDATE credit_packages SET active = false, plan_type = 'partner' WHERE name ILIKE '%partner%'`);

    // manufacturers table: controls brand display order (Item 0d).
    // Populated on first run from distinct values in wrap_colors.manufacturer,
    // alphabetical sort_order. Superadmin can reorder via the admin UI.
    // wrap_colors.manufacturer remains a string column (no FK); join is by name.
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS manufacturers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Seed from distinct existing manufacturers, alphabetical, spaced by 10
    // so manual reordering doesn't have to renumber every row to insert
    // between two adjacent brands. ON CONFLICT (name) DO NOTHING keeps the
    // seed idempotent across boots: rows already in manufacturers retain
    // whatever sort_order the superadmin most recently set.
    await db.execute(sql`
      INSERT INTO manufacturers (name, sort_order)
      SELECT distinct_brands.manufacturer, ROW_NUMBER() OVER (ORDER BY distinct_brands.manufacturer ASC) * 10
      FROM (
        SELECT DISTINCT manufacturer FROM wrap_colors
        WHERE manufacturer IS NOT NULL AND manufacturer <> ''
      ) AS distinct_brands
      ON CONFLICT (name) DO NOTHING;
    `);

  // ---------------------------------------------------------------------------
  // Immutable-column protection trigger for wrap_colors
  // Prevents any code from overwriting image_url, reference_image_data,
  // manufacturer, color_number, name, or category once they are set.
  // ---------------------------------------------------------------------------
  await db.execute(sql`
    -- wrap_colors_immutable_cols guard
    -- ---------------------------------
    -- Protects six columns (image_url, reference_image_data, manufacturer,
    -- color_number, name, category) from UPDATE once set.
    --
    -- BYPASS CONTRACT:
    --   The guard returns NEW early when the session-local Postgres GUC
    --   app.admin_edit equals 'on'. The ONLY supported way to set it is
    --   via storage.adminUpdateColor(), which wraps the UPDATE in a
    --   transaction and runs SET LOCAL app.admin_edit = 'on' inside it.
    --
    --   adminUpdateColor() must ONLY be invoked from HTTP handlers gated
    --   by the requireSuperadmin middleware in server/routes.ts.
    --
    --   Scripts in /scripts/** MUST NOT use adminUpdateColor() or set this
    --   flag. They connect via the same db.ts pool and the guard continues
    --   to block them by design.
    --
    --   Never use plain SET (without LOCAL) or session-level flag setting
    --   on pooled connections -- it leaks across requests.
    CREATE OR REPLACE FUNCTION wrap_colors_immutable_guard()
    RETURNS TRIGGER LANGUAGE plpgsql AS \$\$
    BEGIN
      -- Bypass: superadmin admin-UI edits set this GUC inside a transaction
      -- (see server/storage.ts adminUpdateColor). Scripts and non-superadmin
      -- paths never set it, so they remain blocked by the guards below.
      IF current_setting('app.admin_edit', true) = 'on' THEN
        RETURN NEW;
      END IF;
      IF OLD.image_url IS NOT NULL AND NEW.image_url IS DISTINCT FROM OLD.image_url THEN
        RAISE EXCEPTION 'IMMUTABLE COLUMN: wrap_colors.image_url cannot be overwritten once set (old=%.60s, new=%.60s)', OLD.image_url, NEW.image_url;
      END IF;
      IF OLD.reference_image_data IS NOT NULL AND NEW.reference_image_data IS DISTINCT FROM OLD.reference_image_data THEN
        RAISE EXCEPTION 'IMMUTABLE COLUMN: wrap_colors.reference_image_data cannot be overwritten once set';
      END IF;
      IF OLD.manufacturer IS NOT NULL AND NEW.manufacturer IS DISTINCT FROM OLD.manufacturer THEN
        RAISE EXCEPTION 'IMMUTABLE COLUMN: wrap_colors.manufacturer cannot be overwritten once set (old=%, new=%)', OLD.manufacturer, NEW.manufacturer;
      END IF;
      IF OLD.color_number IS NOT NULL AND NEW.color_number IS DISTINCT FROM OLD.color_number THEN
        RAISE EXCEPTION 'IMMUTABLE COLUMN: wrap_colors.color_number (SKU) cannot be overwritten once set (old=%, new=%)', OLD.color_number, NEW.color_number;
      END IF;
      IF OLD.name IS NOT NULL AND NEW.name IS DISTINCT FROM OLD.name THEN
        RAISE EXCEPTION 'IMMUTABLE COLUMN: wrap_colors.name cannot be overwritten once set (old=%, new=%)', OLD.name, NEW.name;
      END IF;
      IF OLD.category IS NOT NULL AND NEW.category IS DISTINCT FROM OLD.category THEN
        RAISE EXCEPTION 'IMMUTABLE COLUMN: wrap_colors.category cannot be overwritten once set (old=%, new=%)', OLD.category, NEW.category;
      END IF;
      RETURN NEW;
    END;
    \$\$ ;
    DROP TRIGGER IF EXISTS wrap_colors_immutable_cols ON wrap_colors;
    CREATE TRIGGER wrap_colors_immutable_cols
      BEFORE UPDATE ON wrap_colors
      FOR EACH ROW
      EXECUTE FUNCTION wrap_colors_immutable_guard();
  `);
  console.log("[migrate] Immutable-column trigger installed on wrap_colors.");

  console.log("[migrate] Database migrations applied successfully");

    // Create widget_customers table for per-visitor free render tracking
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS widget_customers (
        id SERIAL PRIMARY KEY,
        partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        verified BOOLEAN DEFAULT FALSE,
        verification_code TEXT,
        code_expires_at TIMESTAMP,
        render_count INTEGER DEFAULT 0,
        customer_token TEXT UNIQUE,
        car_brand TEXT,
        car_model TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(partner_id, email)
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_wc_partner ON widget_customers(partner_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_wc_token ON widget_customers(customer_token)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_wc_email ON widget_customers(partner_id, email)`);
    // Item 0a Workstream 4 — per-email cooldown for /api/widget/verify-email,
    // mirroring consumer_verified_emails.last_code_sent_at. Idempotent.
    await db.execute(sql`ALTER TABLE widget_customers ADD COLUMN IF NOT EXISTS last_code_sent_at TIMESTAMP`);

    // Consumer email verification (Item 0c, v29). Backs the anonymous
    // first-render gate on wrap-up.ai. customer_token is held by the
    // HttpOnly wup_consumer_token cookie. linked_user_id is populated in
    // Session 3 when a verified anonymous email signs up; ON DELETE SET
    // NULL preserves the verified-email row past a user deletion.
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS consumer_verified_emails (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        customer_token TEXT NOT NULL UNIQUE,
        verification_code TEXT,
        code_expires_at TIMESTAMPTZ,
        verified_at TIMESTAMPTZ,
        render_count INTEGER NOT NULL DEFAULT 0,
        last_code_sent_at TIMESTAMPTZ,
        linked_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_cve_email ON consumer_verified_emails(email)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_cve_token ON consumer_verified_emails(customer_token)`);

    // Admin audit log — append-only trail of mutating admin/superadmin actions.
    // See shared/schema.ts adminAuditLog and server/adminAudit.ts (sole writer).
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS admin_audit_log (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR,
        user_email TEXT,
        actor_role TEXT,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        changes JSONB,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log (created_at DESC)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_admin_audit_log_user_id ON admin_audit_log (user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_admin_audit_log_entity ON admin_audit_log (entity_type, entity_id)`);

    // Item 0b — geo capture columns on render tables. Populated at insert time;
    // null when geo lookup is unavailable.
    await db.execute(sql`ALTER TABLE generated_images ADD COLUMN IF NOT EXISTS city TEXT`);
    await db.execute(sql`ALTER TABLE generated_images ADD COLUMN IF NOT EXISTS country TEXT`);
    await db.execute(sql`ALTER TABLE generated_images ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6)`);
    await db.execute(sql`ALTER TABLE generated_images ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6)`);
    await db.execute(sql`ALTER TABLE partner_renders ADD COLUMN IF NOT EXISTS city TEXT`);
    await db.execute(sql`ALTER TABLE partner_renders ADD COLUMN IF NOT EXISTS country TEXT`);
    await db.execute(sql`ALTER TABLE partner_renders ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6)`);
    await db.execute(sql`ALTER TABLE partner_renders ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6)`);

  } catch (error) {
    console.error("[migrate] Migration error:", error);
    // Don't crash the server — migrations failing shouldn't stop the app
  }
}
