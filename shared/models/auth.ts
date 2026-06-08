import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

// Session storage table.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  passwordHash: varchar("password_hash"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("user"),
  // PR #69 — boolean flag replacing the prior role='influencer' overload.
  // Set to true on influencer_application approval; reset to false on
  // rejection. Independent of role so an admin or superadmin can also be
  // an ambassador.
  isAmbassador: boolean("is_ambassador").notNull().default(false),
  // PR #70 — referral handle for ambassador tracking links. Stored
  // lowercase; case-insensitive uniqueness is provided by the simple
  // UNIQUE constraint because writes are normalised at the handler
  // layer before INSERT/UPDATE. URL contract: wrap-up.ai/?ref=<handle>.
  referralHandle: varchar("referral_handle", { length: 30 }).unique(),
  // PR #71 — referrer attribution. Set at signup time when a wup_ref
  // cookie was present and the cookie value resolved to a current
  // ambassador via referral_handle. Self-referencing FK uses the
  // lazy-getter form to defer the reference until after users is
  // defined, avoiding the temporal dead-zone for self-references.
  // Default ON DELETE NO ACTION — refuses to delete an ambassador if
  // any user has them as referrer (forces conscious decision later).
  referredByUserId: varchar("referred_by_user_id").references((): any => users.id),
  credits: integer("credits").notNull().default(2),
  stripeCustomerId: varchar("stripe_customer_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Item 0a Session 3 — signup-side email verification.
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerifiedAt: timestamp("email_verified_at"),
  // Item 0a Session 3 — pending email verification state. Cleared on successful confirm.
  verificationCode: varchar("verification_code", { length: 6 }),
  codeExpiresAt: timestamp("code_expires_at"),
  lastCodeSentAt: timestamp("last_code_sent_at"),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Permissions table
export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  key: varchar("key").notNull().unique(),
  description: text("description"),
});

export type Permission = typeof permissions.$inferSelect;

// Role permissions junction table
export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  role: varchar("role").notNull(),
  permissionKey: varchar("permission_key").notNull(),
});

export type RolePermission = typeof rolePermissions.$inferSelect;

// Anonymous usage tracking table (for free tier limits)
export const anonymousUsage = pgTable("anonymous_usage", {
  id: serial("id").primaryKey(),
  fingerprintId: varchar("fingerprint_id").notNull(),
  usedAt: timestamp("used_at").defaultNow().notNull(),
  linkedUserId: varchar("linked_user_id"),
});

export type AnonymousUsage = typeof anonymousUsage.$inferSelect;

// Credit purchases table
export const creditPurchases = pgTable("credit_purchases", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  credits: integer("credits").notNull(),
  amountPaid: integer("amount_paid").notNull(),
  stripePriceId: varchar("stripe_price_id"),
  stripeSessionId: varchar("stripe_session_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CreditPurchase = typeof creditPurchases.$inferSelect;
