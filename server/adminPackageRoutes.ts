import type { Express, Request, Response } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { getUncachableStripeClient } from "./stripeClient";
import { auditLog } from "./adminAudit";

// Helper: Fetch price details from Stripe (Stripe is the source of truth for pricing)
async function fetchStripePriceDetails(priceId: string) {
  const stripe = getUncachableStripeClient();
  const price = await stripe.prices.retrieve(priceId);
  return {
    amount: (price.unit_amount || 0) / 100,
    currency: price.currency,
    isRecurring: !!price.recurring,
    interval: price.recurring?.interval || null,
  };
}

export function registerAdminPackageRoutes(app: Express, requireAdminAuth: any) {
  // Admin: Get all credit packages (including inactive)
  app.get("/api/admin/packages", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const result = await db.execute(
        sql`SELECT * FROM credit_packages ORDER BY sort_order ASC, price ASC`
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching packages:", error);
      res.status(500).json({ error: "Failed to fetch packages" });
    }
  });

  // Admin: Create a new credit package
  app.post("/api/admin/packages", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { package_id, name, description, credits, price, price_id, savings, popular, plan_type, sort_order } = req.body;

      // If a Stripe price_id is provided, fetch the actual price from Stripe
      let finalPrice = parseInt(price) || 0;
      const stripePriceId = price_id || null;

      if (stripePriceId) {
        try {
          const stripePrice = await fetchStripePriceDetails(stripePriceId);
          finalPrice = stripePrice.amount;
        } catch (e) {
          console.log("Could not fetch Stripe price, using provided price:", e);
        }
      }

      const result = await db.execute(
        sql`INSERT INTO credit_packages (package_id, name, description, credits, price, price_id, savings, popular, plan_type, sort_order)
            VALUES (${package_id}, ${name}, ${description}, ${parseInt(credits)}, ${finalPrice}, ${stripePriceId}, ${savings || null}, ${!!popular}, ${plan_type || 'plan'}, ${parseInt(sort_order) || 0})
            RETURNING *`
      );
      await auditLog(req, "package.create",
        { type: "credit_packages", id: package_id },
        { payload: {
            package_id,
            name,
            description,
            credits: parseInt(credits),
            price: finalPrice,
            price_id: stripePriceId,
            plan_type: plan_type || 'plan',
            sort_order: parseInt(sort_order) || 0,
            popular: !!popular,
            savings: savings || null,
          } });
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error creating package:", error);
      res.status(500).json({ error: "Failed to create package" });
    }
  });

  // Admin: Update a credit package
  app.put("/api/admin/packages/:packageId", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { packageId } = req.params;
      const { name, description, credits, price, price_id, savings, popular, plan_type, active, sort_order } = req.body;

      // If a Stripe price_id is provided, fetch the actual price from Stripe
      let finalPrice = parseInt(price) || 0;
      const stripePriceId = price_id || null;

      if (stripePriceId) {
        try {
          const stripePrice = await fetchStripePriceDetails(stripePriceId);
          finalPrice = stripePrice.amount;
        } catch (e) {
          console.log("Could not fetch Stripe price, using provided price:", e);
        }
      }

      const beforeRes = await db.execute(
        sql`SELECT name, description, credits, price, price_id, savings, popular, plan_type, active, sort_order
            FROM credit_packages WHERE package_id = ${packageId}`
      );
      if (!beforeRes.rows.length) return res.status(404).json({ error: "Package not found" });
      const before = beforeRes.rows[0];

      const result = await db.execute(
        sql`UPDATE credit_packages
            SET name = ${name}, description = ${description}, credits = ${parseInt(credits)}, price = ${finalPrice},
                price_id = ${stripePriceId}, savings = ${savings || null}, popular = ${!!popular},
                plan_type = ${plan_type || 'plan'}, active = ${active !== false}, sort_order = ${parseInt(sort_order) || 0}
            WHERE package_id = ${packageId}
            RETURNING *`
      );
      await auditLog(req, "package.update",
        { type: "credit_packages", id: packageId },
        { before,
          after: {
            name,
            description,
            credits: parseInt(credits),
            price: finalPrice,
            price_id: stripePriceId,
            savings: savings || null,
            popular: !!popular,
            plan_type: plan_type || 'plan',
            active: active !== false,
            sort_order: parseInt(sort_order) || 0,
          } });
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error updating package:", error);
      res.status(500).json({ error: "Failed to update package" });
    }
  });

  // Admin: Delete a credit package
  app.delete("/api/admin/packages/:packageId", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { packageId } = req.params;
      const beforeRes = await db.execute(
        sql`SELECT package_id, name, description, credits, price, price_id, plan_type, active, sort_order
            FROM credit_packages WHERE package_id = ${packageId}`
      );
      if (!beforeRes.rows.length) return res.status(404).json({ error: "Package not found" });
      const before = beforeRes.rows[0];
      await db.execute(
        sql`DELETE FROM credit_packages WHERE package_id = ${packageId}`
      );
      await auditLog(req, "package.delete",
        { type: "credit_packages", id: packageId },
        { before });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting package:", error);
      res.status(500).json({ error: "Failed to delete package" });
    }
  });

  // Admin: Fetch price details from Stripe for a given price ID (used by frontend to preview)
  app.post("/api/admin/packages/fetch-stripe-price", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { price_id } = req.body;
      if (!price_id) {
        return res.status(400).json({ error: "price_id is required" });
      }
      const details = await fetchStripePriceDetails(price_id);
      res.json(details);
    } catch (error) {
      console.error("Error fetching Stripe price:", error);
      res.status(500).json({ error: "Failed to fetch price from Stripe. Check that the Price ID is valid." });
    }
  });

  // Admin: Refresh all package prices from Stripe (pull prices, don't push)
  app.post("/api/admin/packages/refresh-from-stripe", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const packages = await db.execute(
        sql`SELECT * FROM credit_packages WHERE active = true ORDER BY sort_order ASC`
      );
      const results: any[] = [];
      for (const pkg of packages.rows as any[]) {
        if (pkg.price_id) {
          try {
            const stripePrice = await fetchStripePriceDetails(pkg.price_id);
            await db.execute(
              sql`UPDATE credit_packages SET price = ${stripePrice.amount} WHERE package_id = ${pkg.package_id}`
            );
            results.push({ package_id: pkg.package_id, name: pkg.name, updated: true, newPrice: stripePrice.amount });
          } catch (e: any) {
            results.push({ package_id: pkg.package_id, name: pkg.name, updated: false, error: e.message });
          }
        } else {
          results.push({ package_id: pkg.package_id, name: pkg.name, updated: false, error: "No Stripe Price ID set" });
        }
      }
      const updatedCount = results.filter(r => r.updated).length;
      const errorCount = results.filter(r => !r.updated).length;
      await auditLog(req, "package.refresh_from_stripe",
        { type: "credit_packages", id: null },
        { payload: { attempted: results.length, updated: updatedCount, errorCount } });
      res.json({ success: true, results });
    } catch (error) {
      console.error("Error refreshing from Stripe:", error);
      res.status(500).json({ error: "Failed to refresh from Stripe" });
    }
  });


}
