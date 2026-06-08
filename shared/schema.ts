import { z } from "zod";
import { pgTable, text, boolean, timestamp, integer, serial, varchar, jsonb, numeric, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { sql, desc } from "drizzle-orm";
import { users, creditPurchases } from "./models/auth";

// Export auth models (IMPORTANT for Replit Auth)
export * from "./models/auth";

// Database tables for PostgreSQL persistence

// Color categories for wrap finishes — reconciled to match production data on
// 2026-04-29. Order is by frequency in production (Gloss most common). The
// previous list contained Iridescent/Pearlescent variants that have never had
// any rows; the actual data has Carbon Fiber / Brushed / Absolute Matte rows
// that were missing here. Effect: those categories are now visible in the
// consumer Finish dropdown filter.
export const colorCategories = [
  "Gloss",
  "Matte",
  "Satin",
  "High Gloss",
  "Carbon Fiber",
  "Brushed",
  "Absolute Matte",
  "Structured",
] as const;

export type ColorCategory = typeof colorCategories[number];

// Wrap Colors table
export const wrapColors = pgTable("wrap_colors", {
  id: serial("id").primaryKey(),
  sortOrder: integer("sort_order").default(0),      // drag-and-drop order (matches supplier swatch book)
  manufacturer: text("manufacturer").notNull(),
  colorNumber: text("color_number"),                // product code e.g. "SP280", "TBC 101" (optional)
  name: text("name").notNull(),                     // descriptive color name e.g. "Satin Flip Ghost Pearl"
  category: text("category").notNull().default("Gloss"),
  hexColor: text("hex_color").notNull(),
  imageUrl: text("image_url"),                      // swatch â stores data: URI or legacy file path
  referenceImageData: text("reference_image_data"), // reference photo of a real car in this color
  thumbnailUrl: text("thumbnail_url"), // 300x300 cover-fit JPEG thumbnail for fast list loading
});

export const insertWrapColorSchema = createInsertSchema(wrapColors).omit({ id: true });
export type InsertWrapColor = z.infer<typeof insertWrapColorSchema>;
export type WrapColor = typeof wrapColors.$inferSelect;

// Manufacturer / brand display order. wrap_colors.manufacturer remains a
// string column with no FK; this table only controls display order. Joined
// to wrap_colors via name match in queries that order colors by brand.
export const manufacturers = pgTable("manufacturers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // Item 0l — pipeline brand support. Valid values (CHECK constraint in DB):
  //   active       — fully live brand, no badge
  //   in_progress  — Peter has started adding colors, partial catalogue, "In Progress" badge
  //   pipeline     — zero colors yet, "Coming Soon" badge, click opens notify-me popup
  //   request      — the single __request__ placeholder row that surfaces "My brand
  //                  isn't listed →" in the dropdown; click opens a brand-request popup
  // displayLabel overrides the default badge / placeholder text per brand.
  status: text("status").notNull().default("active"),
  displayLabel: text("display_label"),
});

export const insertManufacturerSchema = createInsertSchema(manufacturers).omit({ id: true, createdAt: true });
export type InsertManufacturer = z.infer<typeof insertManufacturerSchema>;
export type Manufacturer = typeof manufacturers.$inferSelect;

// Email submissions table
export const emailSubmissions = pgTable("email_submissions", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  colorId: integer("color_id"),
  options: text("options").array().notNull().default(sql`ARRAY[]::text[]`),
});

export const insertEmailSchema = createInsertSchema(emailSubmissions).omit({ id: true, submittedAt: true });
export type InsertEmail = z.infer<typeof insertEmailSchema>;
export type EmailSubmission = typeof emailSubmissions.$inferSelect;

// Generated images table - stores images next to email submissions
export const generatedImages = pgTable("generated_images", {
  id: serial("id").primaryKey(),
  emailSubmissionId: integer("email_submission_id").notNull(),
  imageData: text("image_data").notNull(), // Base64 generated image data
  originalImageData: text("original_image_data"), // Base64 original uploaded photo
  colorId: integer("color_id"),
  colorName: text("color_name"), // Human-readable color name
  userId: varchar("user_id"), // Linked user (if authenticated)
  // Item 0b — geo capture (null if lookup fails)
  city: text("city"),
  country: text("country"),
  latitude: numeric("latitude", { precision: 9, scale: 6 }),
  longitude: numeric("longitude", { precision: 9, scale: 6 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGeneratedImageSchema = createInsertSchema(generatedImages).omit({ id: true, createdAt: true });
export type InsertGeneratedImage = z.infer<typeof insertGeneratedImageSchema>;
export type GeneratedImage = typeof generatedImages.$inferSelect;

// Design shares table - tracks when designs are sent to customers
export const designShares = pgTable("design_shares", {
  id: serial("id").primaryKey(),
  generatedImageId: integer("generated_image_id").notNull(),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  deliveryMethod: text("delivery_method").notNull(), // 'email' | 'sms'
  senderEmail: text("sender_email"),
  senderName: text("sender_name"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export const insertDesignShareSchema = createInsertSchema(designShares).omit({ id: true, sentAt: true });
export type InsertDesignShare = z.infer<typeof insertDesignShareSchema>;
export type DesignShare = typeof designShares.$inferSelect;

// Share intents — Tier 1 Growth Loops click-baseline tracking. Public endpoint,
// fire-and-forget from the client. FK-less integers match the admin_audit_log
// convention so analytics rows survive deletion of referenced entities. surface
// disambiguates design_id: generated_images for consumer; widget renders live
// in partner_renders so design_id is always NULL for widget.
export const shareIntents = pgTable("share_intents", {
  id: serial("id").primaryKey(),
  surface: text("surface").notNull(),                  // 'consumer' | 'widget'
  partnerId: integer("partner_id"),                    // partners.id when surface=widget
  designId: integer("design_id"),                      // generated_images.id when surface=consumer
  country: text("country"),                            // 2-letter ISO; NULL on geo lookup failure
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertShareIntentSchema = createInsertSchema(shareIntents).omit({ id: true, createdAt: true });
export type InsertShareIntent = z.infer<typeof insertShareIntentSchema>;
export type ShareIntent = typeof shareIntents.$inferSelect;

export const shareIntentRequestSchema = z.object({
  surface: z.enum(["consumer", "widget"]),
  designId: z.number().int().positive().optional(),
});

export type ShareIntentRequest = z.infer<typeof shareIntentRequestSchema>;

// Rate limit settings table
export const rateLimitSettings = pgTable("rate_limit_settings", {
  id: serial("id").primaryKey(),
  requestsPerMinute: integer("requests_per_minute").notNull().default(10),
  requestsPerHour: integer("requests_per_hour").notNull().default(100),
  requestsPerDay: integer("requests_per_day").notNull().default(500),
});

export type RateLimitSettings = {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
};

export const rateLimitSettingsSchema = z.object({
  requestsPerMinute: z.number().min(1).max(1000),
  requestsPerHour: z.number().min(1).max(10000),
  requestsPerDay: z.number().min(1).max(100000),
});

// Usage stats table
export const usageStats = pgTable("usage_stats", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  endpoint: text("endpoint").notNull(),
  success: boolean("success").notNull(),
});

export type UsageStat = typeof usageStats.$inferSelect;

// Additional options for car wrap
export const additionalOptions = [
  { id: "chrome-delete", name: "Chrome Delete", description: "Replace chrome trim with color-matched finish" },
  { id: "window-tint", name: "Window Tint", description: "Add professional window tinting" },
] as const;

export type AdditionalOption = typeof additionalOptions[number];

// Generate request schema
export const generateRequestSchema = z.object({
  colorId: z.string().min(1, "Color selection is required"),
  options: z.array(z.string()),
  email: z.string().email("Valid email is required"),
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;

// Admin: Add credits schema
export const addCreditsSchema = z.object({
  credits: z.number().int("Credits must be a whole number").min(1, "Must add at least 1 credit").max(10000, "Cannot add more than 10,000 credits at once"),
});

export type AddCreditsRequest = z.infer<typeof addCreditsSchema>;

// Share design with customer schema
export const shareDesignSchema = z.object({
  deliveryMethod: z.enum(["email", "sms"], { required_error: "Please choose email or SMS" }),
  customerEmail: z.string().email("Please enter a valid email").optional(),
  customerPhone: z.string().min(7, "Please enter a valid phone number").optional(),
}).refine(
  (data) => (data.deliveryMethod === "email" ? !!data.customerEmail : !!data.customerPhone),
  { message: "Please provide the required contact info for the selected delivery method" }
);

export type ShareDesignRequest = z.infer<typeof shareDesignSchema>;

// Influencer / Ambassador applications table
export const influencerApplications = pgTable("influencer_applications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  instagramUrl: text("instagram_url").notNull(),
  tiktokUrl: text("tiktok_url"),
  youtubeUrl: text("youtube_url"),
  otherSocialUrl: text("other_social_url"),
  motivation: text("motivation").notNull(), // why they'd be a great ambassador
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInfluencerApplicationSchema = createInsertSchema(influencerApplications).omit({ id: true, createdAt: true, updatedAt: true, status: true, adminNotes: true });
export type InsertInfluencerApplication = z.infer<typeof insertInfluencerApplicationSchema>;
export type InfluencerApplication = typeof influencerApplications.$inferSelect;

// Influencer application form validation
export const influencerApplicationFormSchema = z.object({
  instagramUrl: z.string().min(1, "Instagram page is required"),
  tiktokUrl: z.string().optional().default(""),
  youtubeUrl: z.string().optional().default(""),
  otherSocialUrl: z.string().optional().default(""),
  motivation: z.string().min(50, "Please write at least 50 characters about why you'd be a great ambassador"),
});

export type InfluencerApplicationForm = z.infer<typeof influencerApplicationFormSchema>;

// PR #72 — Commission ledger. Written by the Stripe webhook handler on
// the first credit_purchases row for an attributed user, when the
// referrer is currently an ambassador. UNIQUE on referred_user_id
// gives the lifetime "one commission per referred user" guarantee at
// the DB layer and provides idempotency against webhook replay.
export const commissionLedger = pgTable("commission_ledger", {
  id: serial("id").primaryKey(),
  referrerUserId: varchar("referrer_user_id").notNull().references(() => users.id),
  referredUserId: varchar("referred_user_id").notNull().unique().references(() => users.id),
  sourcePurchaseId: integer("source_purchase_id").notNull().references(() => creditPurchases.id),
  amountCents: integer("amount_cents").notNull(),
  ratePercent: integer("rate_percent").notNull().default(20),
  status: varchar("status").notNull().default("pending"), // pending | paid | voided
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_commission_ledger_referrer").on(table.referrerUserId),
]);

export type CommissionLedger = typeof commissionLedger.$inferSelect;
export type InsertCommissionLedger = typeof commissionLedger.$inferInsert;

// âââ Partner Embedding System âââââââââââââââââââââââââââââââââââââââââââââââ
export const partners = pgTable("partners", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  businessName: text("business_name").notNull(),
  allowedDomain: text("allowed_domain").notNull(),
  embedToken: text("embed_token").notNull(),
  creditsRemaining: integer("credits_remaining").notNull().default(0),
  creditsPerMonth: integer("credits_per_month").notNull().default(150),
  suspended: boolean("suspended").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  subscriptionStatus: text("subscription_status").default("pending"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  updatedAt: timestamp("updated_at"),
  autoTopup: boolean("auto_topup").default(false),
  quoteFormUrl: text("quote_form_url"),
  logoUrl: text("logo_url"),
  contactEmail: text("contact_email"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  cancelsAt: timestamp("cancels_at"),
});
export const partnerBrands = pgTable("partner_brands", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").notNull(),
  brand: text("brand").notNull(),
});
export const partnerRenders = pgTable("partner_renders", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").notNull(),
  customerEmail: text("customer_email"),
  carDescription: text("car_description"),
  colorId: integer("color_id"),
  colorName: text("color_name"),
  manufacturer: text("manufacturer"),
  resultImageUrl: text("result_image_url"),
  // Item 0b — geo capture (null if lookup fails)
  city: text("city"),
  country: text("country"),
  latitude: numeric("latitude", { precision: 9, scale: 6 }),
  longitude: numeric("longitude", { precision: 9, scale: 6 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export type Partner = typeof partners.$inferSelect;
export type InsertPartner = typeof partners.$inferInsert;
export type PartnerBrand = typeof partnerBrands.$inferSelect;
export type PartnerRender = typeof partnerRenders.$inferSelect;

// ─── Consumer email verification (Item 0c, v29) ─────────────────────────────
// Gates anonymous first-renders on consumer wrap-up.ai behind a verified
// email. Independent of widget_customers (which is partner-scoped); this
// table has no partner concept. customer_token is the value held in the
// HttpOnly wup_consumer_token cookie. linked_user_id is populated in
// Session 3 when a verified anonymous email later signs up; ON DELETE SET
// NULL keeps the verified-email row alive past a user deletion since its
// anti-abuse value is independent of the account.
export const consumerVerifiedEmails = pgTable("consumer_verified_emails", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  customerToken: text("customer_token").notNull().unique(),
  verificationCode: text("verification_code"),
  codeExpiresAt: timestamp("code_expires_at", { withTimezone: true }),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  renderCount: integer("render_count").notNull().default(0),
  lastCodeSentAt: timestamp("last_code_sent_at", { withTimezone: true }),
  linkedUserId: varchar("linked_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_cve_email").on(table.email),
  index("idx_cve_token").on(table.customerToken),
  // Item 0a Session 3 — partial index for signup-side cookie→user lookups.
  index("idx_cve_linked_user").on(table.linkedUserId).where(sql`${table.linkedUserId} IS NOT NULL`),
]);

export type ConsumerVerifiedEmail = typeof consumerVerifiedEmails.$inferSelect;
export type InsertConsumerVerifiedEmail = typeof consumerVerifiedEmails.$inferInsert;

// ─── Pipeline brand leads (Item 0l) ─────────────────────────────────────────
// Captures notify-me signups when a user clicks a pipeline-status brand AND
// brand-request submissions when a user clicks the __request__ placeholder
// and types in a brand name. requestedBrandName is filled only on the latter.
// notifiedAt is stamped when we email the user as their requested/pipeline
// brand goes live. The unique (email, manufacturer_id) pair means one signup
// per email per brand — for __request__ this caps brand-request submissions
// at one per email; if we ever want multi-request, drop the unique constraint
// and replace with app-level dedup keyed by requestedBrandName.
export const pipelineLeads = pgTable("pipeline_leads", {
  id: serial("id").primaryKey(),
  manufacturerId: integer("manufacturer_id").notNull().references(() => manufacturers.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  consentGivenAt: timestamp("consent_given_at").notNull(),
  // CHECK constraint in DB restricts to: 'consumer' | 'widget' | 'admin'
  source: text("source").notNull(),
  requestedBrandName: text("requested_brand_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  notifiedAt: timestamp("notified_at"),
}, (table) => [
  uniqueIndex("idx_pipeline_leads_email_manufacturer").on(table.email, table.manufacturerId),
  index("idx_pipeline_leads_manufacturer").on(table.manufacturerId),
  // Partial index — keeps the "find leads still to notify" query cheap as the
  // table grows without indexing already-notified history rows.
  index("idx_pipeline_leads_notified").on(table.notifiedAt).where(sql`${table.notifiedAt} IS NULL`),
]);

export type PipelineLead = typeof pipelineLeads.$inferSelect;
export type InsertPipelineLead = typeof pipelineLeads.$inferInsert;

// Admin audit log — append-only record of every mutating admin/superadmin action.
// Writes go through server/adminAudit.ts only; no handler should ever insert here directly.
// user_id is intentionally FK-less (matches partners.user_id pattern) and nullable so
// webhook-triggered or system actions can log with NULL actor.
export const adminAuditLog = pgTable("admin_audit_log", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),                 // users.id (UUID) of the acting admin; NULL for system actions
  userEmail: text("user_email"),              // denormalized snapshot — survives user deletion
  actorRole: text("actor_role"),              // 'admin' | 'superadmin' at time of action — survives role changes
  action: text("action").notNull(),           // e.g. 'color.update', 'partner.suspend', 'user.delete'
  entityType: text("entity_type"),            // e.g. 'wrap_colors', 'partners', 'users'
  entityId: text("entity_id"),                // target row id as text (fits serial, varchar, composite)
  changes: jsonb("changes"),                  // { before?, after?, payload? } — image fields stripped by auditLog()
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export type AdminAuditLogEntry = typeof adminAuditLog.$inferSelect;
export type InsertAdminAuditLogEntry = typeof adminAuditLog.$inferInsert;

// ─── Bug reports (Item 0r) ────────────────────────────────────────────────────
// Submitted by authenticated users from consumer and widget surfaces.
// photo_data stores base64-encoded image data after HEIC conversion, consistent
// with generated_images.image_data storage pattern. R2/S3 migration covers
// this column alongside all other image columns per Section 8.
// CHECK constraints (category, surface, status) are enforced in the DB only.
export const bugReports = pgTable("bug_reports", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  category: text("category").notNull(),         // DB CHECK: 'color_issue'|'render_quality'|'ui_bug'|'other'
  photoData: text("photo_data"),                // base64 JPEG; NULL when no photo attached
  photoMimeType: text("photo_mime_type"),
  surface: text("surface").notNull(),           // DB CHECK: 'consumer'|'widget'
  partnerId: integer("partner_id"),             // partners.id; NULL for consumer reports
  url: text("url"),                             // window.location.href, truncated 2000 chars server-side
  renderIdConsumer: integer("render_id_consumer").references(() => generatedImages.id, { onDelete: "set null" }),
  renderIdWidget: integer("render_id_widget").references(() => partnerRenders.id, { onDelete: "set null" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  reporterEmail: varchar("reporter_email"),     // anonymous-with-email submissions (no FK)
  userAgent: text("user_agent"),                // truncated 500 chars server-side
  viewport: text("viewport"),                   // e.g. "1920x1080", max 20 chars
  status: text("status").notNull().default("open"), // DB CHECK: 'open'|'resolved'
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedBy: varchar("resolved_by").references(() => users.id, { onDelete: "set null" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_bug_reports_admin_view")
    .on(table.status, desc(table.createdAt))
    .where(sql`${table.deletedAt} IS NULL`),
]);

export type BugReport = typeof bugReports.$inferSelect;
export type InsertBugReport = typeof bugReports.$inferInsert;

// Public ticket submission schema for POST /api/tickets. Validates only the
// fields the client may send. user_id, partner_id, url, user_agent, viewport,
// ip, photo_data are server-side captured — never trusted from body.
export const insertTicketSchema = z.object({
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description must be 2000 characters or fewer"),
  email: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z
      .string()
      .max(254, "Email must be 254 characters or fewer")
      .regex(/^\S+@\S+\.\S+$/, "Invalid email")
      .optional(),
  ),
  surface: z.enum(["consumer", "widget"]),
});

export type InsertTicketInput = z.infer<typeof insertTicketSchema>;
