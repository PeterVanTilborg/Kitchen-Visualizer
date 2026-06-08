import { eq, desc, asc, sql, and, isNull } from "drizzle-orm";
import { db } from "./db";
import {
    wrapColors, manufacturers, emailSubmissions, generatedImages, designShares,
    rateLimitSettings, usageStats, users, anonymousUsage, shareIntents,
    consumerVerifiedEmails, partners, partnerRenders, bugReports, creditPurchases,
    type InsertWrapColor, type WrapColor, type InsertEmail, type EmailSubmission,
    type InsertGeneratedImage, type GeneratedImage, type InsertDesignShare,
    type DesignShare, type RateLimitSettings, type UsageStat, type User,
    type InsertShareIntent, type ConsumerVerifiedEmail, type BugReport,
    type CreditPurchase,
} from "../shared/schema";

export async function getColors() {
  // Explicit column list: excludes imageUrl and referenceImageData (large base64 blobs)
  // to keep the public list endpoint fast on mobile.
  // thumbnailUrl (300x300 JPEG) is returned instead for the color grid.
  return db
    .select({
      id: wrapColors.id,
      sortOrder: wrapColors.sortOrder,
      manufacturer: wrapColors.manufacturer,
      colorNumber: wrapColors.colorNumber,
      name: wrapColors.name,
      category: wrapColors.category,
      hexColor: wrapColors.hexColor,
      thumbnailUrl: wrapColors.thumbnailUrl,
    })
    .from(wrapColors)
    .leftJoin(manufacturers, eq(wrapColors.manufacturer, manufacturers.name))
    .orderBy(asc(manufacturers.sortOrder), asc(wrapColors.sortOrder), asc(wrapColors.name));
}
export async function getColorById(id: number) { const r = await db.select().from(wrapColors).where(eq(wrapColors.id, id)); return r[0]; }

/**
 * Returns ALL columns including imageUrl and referenceImageData.
 * Used by the admin /api/admin/colors endpoint only — not exposed to the
 * public API so it does not affect mobile performance.
 */
export async function getColorsAdmin() {
  // Explicit column list required because the leftJoin would otherwise return
  // a nested { wrap_colors, manufacturers } shape; whitelisting columns keeps
  // the response schema identical to before this PR.
  return db
    .select({
      id: wrapColors.id,
      sortOrder: wrapColors.sortOrder,
      manufacturer: wrapColors.manufacturer,
      colorNumber: wrapColors.colorNumber,
      name: wrapColors.name,
      category: wrapColors.category,
      hexColor: wrapColors.hexColor,
      imageUrl: wrapColors.imageUrl,
      referenceImageData: wrapColors.referenceImageData,
      thumbnailUrl: wrapColors.thumbnailUrl,
    })
    .from(wrapColors)
    .leftJoin(manufacturers, eq(wrapColors.manufacturer, manufacturers.name))
    .orderBy(asc(manufacturers.sortOrder), asc(wrapColors.sortOrder), asc(wrapColors.name));
}
export async function createColor(data: InsertWrapColor) { const r = await db.insert(wrapColors).values(data).returning(); return r[0]; }
export async function updateColor(id: number, data: Partial<InsertWrapColor>) { const r = await db.update(wrapColors).set(data).where(eq(wrapColors.id, id)).returning(); return r[0]; }

// Superadmin-only write path. Wraps the UPDATE in a transaction and sets the
// session-local GUC `app.admin_edit = 'on'`, which the wrap_colors_immutable_guard
// trigger honors as a bypass signal (see server/migrate.ts). Must only be invoked
// from HTTP handlers gated by requireSuperadmin in server/routes.ts.
export async function adminUpdateColor(id: number, data: Partial<InsertWrapColor>) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL app.admin_edit = 'on'`);
    const r = await tx.update(wrapColors).set(data).where(eq(wrapColors.id, id)).returning();
    return r[0];
  });
}
export async function deleteColor(id: number): Promise<boolean> {
  const result = await db.delete(wrapColors).where(eq(wrapColors.id, id)).returning({ id: wrapColors.id });
  return result.length > 0;
}
export async function getUserCredits(userId: string): Promise<number> { const [u] = await db.select({ credits: users.credits }).from(users).where(eq(users.id, userId)); return u?.credits || 0; }
export async function getAnonymousUsageCount(fingerprintId: string): Promise<number> { const [r] = await db.select({ count: sql`count(*)::int` }).from(anonymousUsage).where(eq(anonymousUsage.fingerprintId, fingerprintId)); return Number(r?.count) || 0; }
export async function recordAnonymousUsage(fingerprintId: string) { await db.insert(anonymousUsage).values({ fingerprintId }); }

// ─── Consumer-side verification (Item 0c) ────────────────────────────────────
// Looks up the consumer_verified_emails row by the customer_token held in the
// HttpOnly wup_consumer_token cookie. Returns null if the token is unknown.
// Callers are responsible for checking row.verifiedAt before honoring the row.
export async function getConsumerStateByToken(customerToken: string): Promise<ConsumerVerifiedEmail | null> {
  const [row] = await db
    .select()
    .from(consumerVerifiedEmails)
    .where(eq(consumerVerifiedEmails.customerToken, customerToken))
    .limit(1);
  return row ?? null;
}
// Atomic increment of the per-email free-render counter. Used after a
// successful anonymous render in /api/generate. The SQL expression keeps the
// read-then-write in a single statement so two concurrent renders cannot
// double-credit the user's free quota.
export async function incrementConsumerRenderCount(customerToken: string): Promise<void> {
  await db
    .update(consumerVerifiedEmails)
    .set({ renderCount: sql`${consumerVerifiedEmails.renderCount} + 1` })
    .where(eq(consumerVerifiedEmails.customerToken, customerToken));
}
export async function getUser(userId: string) { const [u] = await db.select().from(users).where(eq(users.id, userId)); return u; }
export async function deductCredit(userId: string): Promise<boolean> { const c = await getUserCredits(userId); if (c <= 0) return false; await db.update(users).set({ credits: sql`${users.credits} - 1` }).where(eq(users.id, userId)); return true; }
export async function addCredits(userId: string, credits: number) { await db.update(users).set({ credits: sql`${users.credits} + ${credits}` }).where(eq(users.id, userId)); }
export async function updateUser(userId: string, data: { firstName?: string; lastName?: string; email?: string; credits?: number }) {
  const updateData: Record<string, any> = {};
  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.credits !== undefined) updateData.credits = data.credits;
  if (Object.keys(updateData).length > 0) {
    await db.update(users).set(updateData).where(eq(users.id, userId));
  }
}
export async function createEmailSubmission(data: InsertEmail) { const r = await db.insert(emailSubmissions).values(data).returning(); return r[0]; }
export async function createEmail(data: InsertEmail) { return createEmailSubmission(data); }
export async function getEmailSubmissions() { return db.select().from(emailSubmissions).orderBy(desc(emailSubmissions.submittedAt)); }
export async function getEmails() { return getEmailSubmissions(); }
export async function getEmailsWithImages() { const emails = await getEmailSubmissions(); return Promise.all(emails.map(async e => ({ ...e, images: await db.select().from(generatedImages).where(eq(generatedImages.emailSubmissionId, e.id)) }))); }
export async function createGeneratedImage(data: InsertGeneratedImage) { const r = await db.insert(generatedImages).values(data).returning(); return r[0]; }
export async function getGeneratedImages() { return db.select().from(generatedImages).orderBy(desc(generatedImages.createdAt)); }
export async function getGeneratedImageById(id: number) { const r = await db.select().from(generatedImages).where(eq(generatedImages.id, id)); return r[0]; }
export async function getGeneratedImagesByUser(userId: string) { return db.select().from(generatedImages).where(eq(generatedImages.userId, userId)).orderBy(desc(generatedImages.createdAt)); }
export async function getGeneratedImagesByEmail(emailSubmissionId: number) { return db.select().from(generatedImages).where(eq(generatedImages.emailSubmissionId, emailSubmissionId)); }
export async function getDesignsByUserId(userId: string) { return getGeneratedImagesByUser(userId); }
export async function createDesignShare(data: InsertDesignShare) { const r = await db.insert(designShares).values(data).returning(); return r[0]; }
export async function recordShareIntent(data: InsertShareIntent) { await db.insert(shareIntents).values(data); }
export async function getRateLimitSettings(): Promise<RateLimitSettings> { const r = await db.select().from(rateLimitSettings); return r[0] ?? { requestsPerMinute: 10, requestsPerHour: 100, requestsPerDay: 500 }; }
export async function updateRateLimitSettings(data: RateLimitSettings) { const e = await db.select().from(rateLimitSettings); if (e.length === 0) { await db.insert(rateLimitSettings).values(data); } else { await db.update(rateLimitSettings).set(data).where(eq(rateLimitSettings.id, e[0].id)); } }
export async function recordUsage(endpoint: string, success: boolean) { await db.insert(usageStats).values({ endpoint, success }); }
export async function getUsageStats(timeRange = "week") {
  const now = new Date();
  let daysBack = 7;
  if (timeRange === "day") daysBack = 1;
  else if (timeRange === "month") daysBack = 30;
  else if (timeRange === "year") daysBack = 365;
  const cutoff = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  const rows = await db.select().from(usageStats).where(sql`${usageStats.timestamp} >= ${cutoff.toISOString()}`).orderBy(desc(usageStats.timestamp));
  const total = rows.length;
  const successful = rows.filter((r: any) => r.success).length;
  const failed = total - successful;
  const averagePerDay = daysBack > 0 ? total / daysBack : total;
  const grouped: Record<string, { requests: number; success: number; failed: number }> = {};
  for (const row of rows) {
    const date = new Date(row.timestamp!).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (!grouped[date]) grouped[date] = { requests: 0, success: 0, failed: 0 };
    grouped[date].requests++;
    if (row.success) grouped[date].success++;
    else grouped[date].failed++;
  }
  const chartData = Object.entries(grouped).map(([date, data]) => ({ date, ...data })).reverse();
  return { total, successful, failed, averagePerDay, chartData };
}
export async function initializeDefaults() {}
export async function getAllUsers() { return db.select().from(users).orderBy(desc(users.createdAt)); }
export async function getUserStats() { const [s] = await db.select({ totalUsers: sql`count(*)`, usersWithCredits: sql`count(*) filter (where ${users.credits} > 0)`, totalCredits: sql`coalesce(sum(${users.credits}), 0)`, stripeCustomers: sql`count(*) filter (where ${users.stripeCustomerId} is not null)` }).from(users); return { totalUsers: Number(s?.totalUsers||0), usersWithCredits: Number(s?.usersWithCredits||0), totalCredits: Number(s?.totalCredits||0), stripeCustomers: Number(s?.stripeCustomers||0) }; }


export async function deleteUser(userId: string) {
  await db.delete(anonymousUsage).where(eq(anonymousUsage.linkedUserId, userId));
  await db.delete(users).where(eq(users.id, userId));
}

export async function getAllRenders(limit = 100) {
  const rows = await db.select({
    id: generatedImages.id,
    emailSubmissionId: generatedImages.emailSubmissionId,
    colorId: generatedImages.colorId,
    colorName: generatedImages.colorName,
    createdAt: generatedImages.createdAt,
    email: emailSubmissions.email,
    options: emailSubmissions.options,
    city: generatedImages.city,
    country: generatedImages.country,
  }).from(generatedImages)
    .leftJoin(emailSubmissions, eq(generatedImages.emailSubmissionId, emailSubmissions.id))
    .orderBy(desc(generatedImages.createdAt))
    .limit(limit);
  return rows;
}

export async function getRenderedImage(imageId: number) {
  const rows = await db.select({
    imageData: generatedImages.imageData,
  }).from(generatedImages).where(eq(generatedImages.id, imageId)).limit(1);
  return rows[0]?.imageData || null;
}

export async function getRenderStats() {
  const total = await db.select({ count: sql`count(*)` }).from(generatedImages);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = await db.select({ count: sql`count(*)` }).from(generatedImages).where(sql`${generatedImages.createdAt} >= ${today.toISOString()}`);
  return { total: Number(total[0]?.count || 0), today: Number(todayCount[0]?.count || 0) };
}

// ─── Admin payments ───────────────────────────────────────────────────────────

export async function getAllCreditPurchases(): Promise<(CreditPurchase & { userEmail: string | null })[]> {
  const rows = await db
    .select({
      purchase: creditPurchases,
      userEmail: users.email,
    })
    .from(creditPurchases)
    .leftJoin(users, eq(creditPurchases.userId, users.id))
    .orderBy(desc(creditPurchases.createdAt));

  return rows.map((row) => ({
    ...row.purchase,
    userEmail: row.userEmail,
  }));
}

export async function getPaymentStats(): Promise<{
  totalRevenue: number;
  totalPurchases: number;
  totalCreditsSold: number;
  averageOrderValue: number;
}> {
  const [stats] = await db
    .select({
      totalRevenue: sql<number>`coalesce(sum(${creditPurchases.amountPaid}), 0)`,
      totalPurchases: sql<number>`count(*)`,
      totalCreditsSold: sql<number>`coalesce(sum(${creditPurchases.credits}), 0)`,
    })
    .from(creditPurchases);

  const totalRevenue = Number(stats?.totalRevenue || 0);
  const totalPurchases = Number(stats?.totalPurchases || 0);

  return {
    totalRevenue,
    totalPurchases,
    totalCreditsSold: Number(stats?.totalCreditsSold || 0),
    averageOrderValue: totalPurchases > 0 ? Math.round(totalRevenue / totalPurchases) : 0,
  };
}

// ─── Bug reports (Item 0r) ────────────────────────────────────────────────────

export type BugReportListItem = {
  id: number;
  description: string;
  category: string;
  hasPhoto: boolean;
  photoMimeType: string | null;
  surface: string;
  partnerId: number | null;
  partnerName: string | null;
  url: string | null;
  renderIdConsumer: number | null;
  renderConsumerColorName: string | null;
  renderConsumerCreatedAt: Date | null;
  renderIdWidget: number | null;
  renderWidgetColorName: string | null;
  renderWidgetCreatedAt: Date | null;
  userId: string | null;
  reporterEmail: string | null;
  userAgent: string | null;
  viewport: string | null;
  status: string;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  createdAt: Date;
};

const bugReportListSelect = {
  id: bugReports.id,
  description: bugReports.description,
  category: bugReports.category,
  hasPhoto: sql<boolean>`${bugReports.photoData} IS NOT NULL`,
  photoMimeType: bugReports.photoMimeType,
  surface: bugReports.surface,
  partnerId: bugReports.partnerId,
  partnerName: partners.businessName,
  url: bugReports.url,
  renderIdConsumer: bugReports.renderIdConsumer,
  renderConsumerColorName: generatedImages.colorName,
  renderConsumerCreatedAt: generatedImages.createdAt,
  renderIdWidget: bugReports.renderIdWidget,
  renderWidgetColorName: partnerRenders.colorName,
  renderWidgetCreatedAt: partnerRenders.createdAt,
  userId: bugReports.userId,
  reporterEmail: users.email,
  userAgent: bugReports.userAgent,
  viewport: bugReports.viewport,
  status: bugReports.status,
  resolvedAt: bugReports.resolvedAt,
  resolvedBy: bugReports.resolvedBy,
  createdAt: bugReports.createdAt,
} as const;

export async function listBugReports({
  status,
  page,
  pageSize,
}: {
  status: "open" | "resolved" | "all";
  page: number;
  pageSize: number;
}): Promise<{ reports: BugReportListItem[]; total: number }> {
  // All three filter values exclude soft-deleted rows — deleted_at IS NULL is
  // always applied. 'all' returns both open and resolved without a status
  // filter. There is no UI path to view soft-deleted rows in v1; recovery is
  // via Railway SQL if ever needed.
  const baseWhere = isNull(bugReports.deletedAt);
  const where =
    status === "all" ? baseWhere : and(baseWhere, eq(bugReports.status, status));

  const [reports, countRows] = await Promise.all([
    db.select(bugReportListSelect)
      .from(bugReports)
      .leftJoin(partners, eq(bugReports.partnerId, partners.id))
      .leftJoin(generatedImages, eq(bugReports.renderIdConsumer, generatedImages.id))
      .leftJoin(partnerRenders, eq(bugReports.renderIdWidget, partnerRenders.id))
      .leftJoin(users, eq(bugReports.userId, users.id))
      .where(where)
      .orderBy(desc(bugReports.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)::int` }).from(bugReports).where(where),
  ]);

  return { reports: reports as BugReportListItem[], total: countRows[0]?.count ?? 0 };
}

export async function getBugReportDetail(id: number): Promise<BugReportListItem | null> {
  const [row] = await db.select(bugReportListSelect)
    .from(bugReports)
    .leftJoin(partners, eq(bugReports.partnerId, partners.id))
    .leftJoin(generatedImages, eq(bugReports.renderIdConsumer, generatedImages.id))
    .leftJoin(partnerRenders, eq(bugReports.renderIdWidget, partnerRenders.id))
    .leftJoin(users, eq(bugReports.userId, users.id))
    .where(and(eq(bugReports.id, id), isNull(bugReports.deletedAt)))
    .limit(1);
  return (row as BugReportListItem) ?? null;
}

export async function createBugReport(input: {
  description: string;
  reporterEmail: string | null;
  surface: "consumer" | "widget";
  userId: string | null;
  partnerId: number | null;
  url: string | null;
  userAgent: string | null;
  viewport: string | null;
  photoData?: string | null;
  photoMimeType?: string | null;
  category?: string;
}): Promise<{ id: number }> {
  const [row] = await db
    .insert(bugReports)
    .values({
      description: input.description,
      reporterEmail: input.reporterEmail,
      surface: input.surface,
      userId: input.userId,
      partnerId: input.partnerId,
      url: input.url,
      userAgent: input.userAgent,
      viewport: input.viewport,
      photoData: input.photoData ?? null,
      photoMimeType: input.photoMimeType ?? null,
      category: input.category ?? "other",
    })
    .returning({ id: bugReports.id });
  return { id: row.id };
}

export async function getBugReportPhoto(
  id: number,
): Promise<{ photoData: string; photoMimeType: string } | null> {
  const [row] = await db
    .select({ photoData: bugReports.photoData, photoMimeType: bugReports.photoMimeType })
    .from(bugReports)
    .where(and(eq(bugReports.id, id), isNull(bugReports.deletedAt)))
    .limit(1);
  if (!row?.photoData || !row?.photoMimeType) return null;
  return { photoData: row.photoData, photoMimeType: row.photoMimeType };
}

export async function updateBugReportStatus(
  id: number,
  newStatus: "open" | "resolved",
  adminUserId: string,
): Promise<BugReport | null> {
  const [updated] = await db
    .update(bugReports)
    .set(
      newStatus === "resolved"
        ? { status: newStatus, resolvedAt: new Date(), resolvedBy: adminUserId }
        : { status: newStatus, resolvedAt: null, resolvedBy: null },
    )
    .where(and(eq(bugReports.id, id), isNull(bugReports.deletedAt)))
    .returning();
  return updated ?? null;
}

export async function softDeleteBugReport(id: number): Promise<BugReport | null> {
  // COALESCE preserves the original deleted_at on repeat calls — truly
  // idempotent: a second delete does not overwrite the first deletion time.
  const [updated] = await db
    .update(bugReports)
    .set({ deletedAt: sql`COALESCE(${bugReports.deletedAt}, now())` })
    .where(eq(bugReports.id, id))
    .returning();
  return updated ?? null;
}
