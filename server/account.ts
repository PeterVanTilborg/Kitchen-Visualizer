import type { Express, Request, Response } from "express";
import { db } from "./db";
import { users, creditPurchases, generatedImages } from "@shared/schema";
import { eq, desc, sql, count } from "drizzle-orm";
import { isAuthenticated } from "./auth";
import { hashPassword } from "./auth";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20" as any,
});

export function registerAccountRoutes(app: Express): void {

  // ââ Profile âââââââââââââââââââââââââââââââââââââââââââââ
  app.get("/api/account/profile", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { passwordHash: _, ...safeUser } = user as any;
      res.json(safeUser);
    } catch (err) {
      console.error("Profile fetch error:", err);
      res.status(500).json({ message: "Failed to load profile" });
    }
  });

  app.put("/api/account/profile", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { firstName, lastName, email } = req.body;
      await db.update(users).set({
        firstName: firstName || null,
        lastName: lastName || null,
        email: email ? email.toLowerCase() : undefined,
        updatedAt: new Date(),
      }).where(eq(users.id, userId));
      const [updated] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const { passwordHash: _, ...safeUser } = updated as any;
      res.json(safeUser);
    } catch (err) {
      console.error("Profile update error:", err);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // ââ Change Password âââââââââââââââââââââââââââââââââââââ
  app.put("/api/account/password", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      const newHash = hashPassword(newPassword);
      await db.update(users).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(users.id, userId));
      res.json({ message: "Password updated successfully" });
    } catch (err) {
      console.error("Password change error:", err);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // ââ Invoice Settings ââââââââââââââââââââââââââââââââââââ
  app.put("/api/account/invoice-settings", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { companyName, companyAddress, vatNumber, phone, invoiceEmail } = req.body;
      await db.update(users).set({
        companyName: companyName || null,
        companyAddress: companyAddress || null,
        vatNumber: vatNumber || null,
        phone: phone || null,
        invoiceEmail: invoiceEmail || null,
        updatedAt: new Date(),
      }).where(eq(users.id, userId));
      const [updated] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const { passwordHash: _, ...safeUser } = updated as any;
      res.json(safeUser);
    } catch (err) {
      console.error("Invoice settings error:", err);
      res.status(500).json({ message: "Failed to update invoice settings" });
    }
  });

  // ââ Profile Photo (base64) ââââââââââââââââââââââââââââââ
  app.post("/api/account/profile-photo", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { imageData } = req.body;
      if (!imageData) return res.status(400).json({ message: "No image data provided" });
      await db.update(users).set({ profileImageUrl: imageData, updatedAt: new Date() }).where(eq(users.id, userId));
      res.json({ profileImageUrl: imageData });
    } catch (err) {
      console.error("Profile photo error:", err);
      res.status(500).json({ message: "Failed to upload profile photo" });
    }
  });

  // ââ Designs / Gallery âââââââââââââââââââââââââââââââââââ
  // Returns metadata only (id, colorName, createdAt, hasOriginal) plus total
  // count. Image bytes are served by GET /api/designs/:id/image and (for the
  // compare view) GET /api/designs/:id/original. limit clamped to [1,100]
  // default 20; offset clamped to >=0 default 0.
  app.get("/api/account/designs", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const limitRaw = parseInt(String(req.query.limit ?? "20"), 10);
      const limit = Math.max(1, Math.min(100, isNaN(limitRaw) ? 20 : limitRaw));
      const offsetRaw = parseInt(String(req.query.offset ?? "0"), 10);
      const offset = Math.max(0, isNaN(offsetRaw) ? 0 : offsetRaw);

      const items = await db
        .select({
          id: generatedImages.id,
          colorName: generatedImages.colorName,
          createdAt: generatedImages.createdAt,
          hasOriginal: sql<boolean>`(${generatedImages.originalImageData} IS NOT NULL)`,
        })
        .from(generatedImages)
        .where(eq(generatedImages.userId, userId))
        .orderBy(desc(generatedImages.createdAt))
        .limit(limit)
        .offset(offset);

      const [totalRow] = await db
        .select({ c: count() })
        .from(generatedImages)
        .where(eq(generatedImages.userId, userId));

      res.json({ items, total: Number(totalRow?.c ?? 0) });
    } catch (err) {
      console.error("Designs fetch error:", err);
      res.status(500).json({ message: "Failed to load designs" });
    }
  });

  // ââ Purchase History ââââââââââââââââââââââââââââââââââââ
  app.get("/api/account/purchases", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const purchases = await db
        .select()
        .from(creditPurchases)
        .where(eq(creditPurchases.userId, userId))
        .orderBy(desc(creditPurchases.createdAt))
        .limit(50);
      res.json(purchases);
    } catch (err) {
      console.error("Purchases fetch error:", err);
      res.status(500).json({ message: "Failed to load purchases" });
    }
  });

  // ââ Usage Stats âââââââââââââââââââââââââââââââââââââââââ
  app.get("/api/account/usage-stats", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    // Fetch subscription fields via raw SQL (not in Drizzle schema)
    const subResult = await db.execute(
      sql`SELECT subscription_id, subscription_status, subscription_plan_id, subscription_renews_at, subscription_credits_per_month, cancel_at_period_end, cancels_at FROM users WHERE id = ${userId} LIMIT 1`
    );
    const subData: any = subResult.rows?.[0] || {};

    const [designCount] = await db
        .select({ count: count() })
        .from(generatedImages)
        .where(eq(generatedImages.userId, userId));
      const [purchaseStats] = await db
        .select({
          totalSpent: sql<number>`COALESCE(SUM(amount_paid), 0)`,
          totalCredits: sql<number>`COALESCE(SUM(credits), 0)`,
          purchaseCount: count(),
        })
        .from(creditPurchases)
        .where(eq(creditPurchases.userId, userId));
      res.json({
        credits: user?.credits || 0,
        designsGenerated: designCount?.count || 0,
        totalSpent: purchaseStats?.totalSpent || 0,
        totalCreditsPurchased: purchaseStats?.totalCredits || 0,
        purchaseCount: purchaseStats?.purchaseCount || 0,
        subscriptionStatus: subData.subscription_status || null,
        subscriptionPlanId: subData.subscription_plan_id || null,
        subscriptionCreditsTotal: subData.subscription_credits_per_month || 0,
        subscriptionResetDate: subData.subscription_renews_at || null,
        cancelAtPeriodEnd: !!subData.cancel_at_period_end,
        cancelsAt: subData.cancels_at || null,
        memberSince: user?.createdAt,
      });
    } catch (err) {
      console.error("Usage stats error:", err);
      res.status(500).json({ message: "Failed to load usage stats" });
    }
  });

  // ââ Stripe Billing Portal âââââââââââââââââââââââââââââââ
  app.post("/api/account/billing-portal", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user?.stripeCustomerId) {
        return res.status(400).json({ message: "No billing account found. Make a purchase first." });
      }
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `https://${req.get("host")}/account`,
      });
      res.json({ url: portalSession.url });
    } catch (err) {
      console.error("Billing portal error:", err);
      res.status(500).json({ message: "Failed to create billing portal session" });
    }
  });
}
