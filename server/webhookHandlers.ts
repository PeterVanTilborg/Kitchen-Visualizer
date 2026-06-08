import type { Request } from 'express';
import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { db } from './db';
import { users, creditPurchases, anonymousUsage } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { auditLog } from './adminAudit';

// Credit package configuration (matches what we create in Stripe)
export const CREDIT_PACKAGES = {
  starter: { credits: 10, price: 500, name: "Starter Pack" },
  value: { credits: 25, price: 1000, name: "Value Pack", savings: "20%" },
  pro: { credits: 50, price: 1500, name: "Pro Pack", savings: "40%" },
};

export class WebhookHandlers {
  static async processWebhook(req: Request, payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    
    // Try to process with stripe-replit-sync first
    try {
      await sync.processWebhook(payload, signature);
    } catch (syncError) {
      console.log('stripe-replit-sync processWebhook warning:', syncError);
    }

    // Parse the event to handle credit fulfillment
    const stripe = await getUncachableStripeClient();
    const webhookSecret = await WebhookHandlers.getWebhookSecret();
    
    let event;
    if (webhookSecret) {
      // Verify signature if we have a secret
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } else {
      // Parse event without signature verification (for development)
      // In production, Stripe connector should provide the webhook secret
      console.log('WARNING: Processing webhook without signature verification');
      event = JSON.parse(payload.toString());
    }
    
    console.log(`Received Stripe webhook: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
      await WebhookHandlers.handleCheckoutCompleted(req, event.data.object);
    } else if (event.type === 'invoice.paid') {
      await WebhookHandlers.handleInvoicePaid(event.data.object);
    } else if (event.type === 'customer.subscription.updated') {
      await WebhookHandlers.handleSubscriptionUpdated(req, event.data.object);
    } else if (event.type === 'customer.subscription.deleted') {
      await WebhookHandlers.handleSubscriptionDeleted(req, event.data.object);
    }
  }

  static async getWebhookSecret(): Promise<string> {
    // First try to get webhook secret directly from the database
    try {
      const result = await db.execute(
        sql`SELECT secret FROM stripe._managed_webhooks WHERE secret IS NOT NULL LIMIT 1`
      );
      const rows = result.rows || result;
      if (rows && rows.length > 0 && rows[0].secret) {
        console.log('Using webhook secret from database');
        return rows[0].secret as string;
      }
    } catch (e) {
      console.log('Could not get webhook secret from database:', e);
    }
    
    // Fall back to the managed webhook from stripe-replit-sync
    try {
      const stripeSync = await getStripeSync();
      const webhook = await stripeSync.getManagedWebhook();
      if (webhook?.secret) {
        return webhook.secret;
      }
    } catch (e) {
      console.log('Could not get managed webhook secret:', e);
    }
    
    // Fall back to environment variable
    return process.env.STRIPE_WEBHOOK_SECRET || '';
  }

  static async handleCheckoutCompleted(req: Request, session: any): Promise<void> {
    if (session.payment_status !== 'paid') return;
    
    let userId = session.metadata?.userId;
    const credits = parseInt(session.metadata?.credits || '0', 10);
    const priceId = session.metadata?.priceId;
    const fingerprintId = session.metadata?.fingerprintId;
    const customerEmail = session.customer_details?.email || session.customer_email;
    
    if (!credits) {
      console.error('Missing credits in session metadata');
      return;
    }

    // If no userId, find or create a user from the Stripe customer
    if (!userId && (session.customer || customerEmail)) {
      const customerName = session.customer_details?.name || '';
      const nameParts = customerName.split(' ');
      
      try {
        // First, try to find existing user by email (for users who might log in later)
        if (customerEmail) {
          const existingByEmail = await db.select().from(users).where(eq(users.email, customerEmail));
          if (existingByEmail.length > 0) {
            userId = existingByEmail[0].id;
            // Update their Stripe customer ID if not set
            if (!existingByEmail[0].stripeCustomerId) {
              await db.update(users)
                .set({ stripeCustomerId: session.customer, updatedAt: new Date() })
                .where(eq(users.id, userId));
            }
            console.log(`Linked payment to existing user ${userId} by email`);
          }
        }

        // Try to find by Stripe customer ID
        if (!userId && session.customer) {
          const existingByCustomer = await db.select().from(users).where(eq(users.stripeCustomerId, session.customer));
          if (existingByCustomer.length > 0) {
            userId = existingByCustomer[0].id;
            console.log(`Found existing user ${userId} by Stripe customer ID`);
          }
        }

        // Create new user if none found
        if (!userId) {
          const newUserId = `stripe_${session.customer || Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          const [newUser] = await db.insert(users).values({
            id: newUserId,
            email: customerEmail || `customer_${session.customer}@stripe.local`,
            firstName: nameParts[0] || null,
            lastName: nameParts.slice(1).join(' ') || null,
            stripeCustomerId: session.customer,
            credits: 0,
          }).returning();
          
          userId = newUser.id;
          console.log(`Created new user ${userId} from Stripe checkout`);
        }

        // Migrate anonymous usage to this user (link fingerprint to user)
        // This allows us to track that this fingerprint now belongs to a paying user
        if (fingerprintId && userId) {
          try {
            await db.update(anonymousUsage)
              .set({ linkedUserId: userId })
              .where(eq(anonymousUsage.fingerprintId, fingerprintId));
            console.log(`Linked anonymous usage for fingerprint ${fingerprintId} to user ${userId}`);
          } catch (err) {
            console.error('Error linking anonymous usage:', err);
          }
        }
      } catch (error) {
        console.error('Error handling user creation/lookup:', error);
      }
    }

    if (!userId) {
      console.error('Could not resolve userId for checkout session');
      return;
    }

    // Add credits to user
    await db
      .update(users)
      .set({
        credits: sql`${users.credits} + ${credits}`,
        stripeCustomerId: session.customer,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Record the purchase
    await db.insert(creditPurchases).values({
      userId,
      credits,
      amountPaid: session.amount_total || 0,
      stripePriceId: priceId,
      stripeSessionId: session.id,
    });

    console.log(`Added ${credits} credits to user ${userId}`);

    // PR #72 — commission ledger write on first attributed purchase.
    // Strictly additive: no read or write to the credit_purchases row
    // above, no touch of users.credits, no impact on subscription
    // handling below. Wrapped in try/catch so any failure here is
    // logged and swallowed; the webhook completes successfully and
    // Stripe never retries because of a tracking issue.
    try {
      // Capture the new credit_purchases row id and confirm this is
      // the user's first purchase. Order ASC + length===1 doubles as
      // first-purchase check and source_purchase_id capture in one
      // query. If a duplicate webhook delivery somehow produced two
      // credit_purchases rows for the same session, the second
      // delivery sees length>=2 and silent-skips here.
      const purchaseHistory = await db.execute(
        sql`SELECT id FROM credit_purchases WHERE user_id = ${userId} ORDER BY id ASC`
      );
      if (purchaseHistory.rows.length !== 1) {
        return;
      }
      const sourcePurchaseId = (purchaseHistory.rows[0] as any).id as number;

      // Resolve attribution + ambassador status in one query.
      const attributionRes = await db.execute(sql`
        SELECT u.referred_by_user_id, r.is_ambassador
        FROM users u
        LEFT JOIN users r ON r.id = u.referred_by_user_id
        WHERE u.id = ${userId}
        LIMIT 1
      `);
      const attribution = attributionRes.rows[0] as any;
      const referrerUserId = attribution?.referred_by_user_id ?? null;
      if (!referrerUserId) return; // 90%-case silent no-op
      const referrerIsAmbassador = attribution?.is_ambassador === true;

      if (!referrerIsAmbassador) {
        await auditLog(req, 'commission_ledger.skipped',
          { type: 'users', id: userId },
          { payload: {
              reason: 'referrer_not_ambassador',
              referrer_user_id: referrerUserId,
              referred_user_id: userId,
          } }
        );
        return;
      }

      // amount_paid is in cents (Stripe convention; matches the INSERT
      // above which passes session.amount_total directly). 20% rate is
      // hard-coded here and matches the schema default rate_percent=20.
      const amountCents = Math.round((session.amount_total || 0) * 0.20);

      let ledgerId: number | null = null;
      try {
        const inserted = await db.execute(sql`
          INSERT INTO commission_ledger
            (referrer_user_id, referred_user_id, source_purchase_id, amount_cents, rate_percent, status)
          VALUES
            (${referrerUserId}, ${userId}, ${sourcePurchaseId}, ${amountCents}, 20, 'pending')
          RETURNING id
        `);
        ledgerId = (inserted.rows[0] as any)?.id ?? null;
      } catch (insertErr: any) {
        if (insertErr?.code === '23505') {
          // Replay protection: UNIQUE on referred_user_id rejected the
          // duplicate. Commission row already exists — silent no-op.
          return;
        }
        throw insertErr;
      }

      await auditLog(req, 'commission_ledger.created',
        { type: 'commission_ledger', id: ledgerId },
        { payload: {
            ledger_id: ledgerId,
            referrer_user_id: referrerUserId,
            referred_user_id: userId,
            source_purchase_id: sourcePurchaseId,
            amount_cents: amountCents,
            rate_percent: 20,
        } }
      );
    } catch (commissionErr) {
      console.error('[commission] tracking failed for session', session.id, commissionErr);
      // Never fail the webhook because of commission tracking.
    }

    // If this is a subscription checkout, store subscription details
    const planType = session.metadata?.planType;
    if (planType === 'subscription' && session.subscription) {
      try {
        const stripe = await getUncachableStripeClient();
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        const renewsAt = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;

        await db.execute(
          sql`UPDATE users SET
            subscription_id = ${session.subscription},
            subscription_status = 'active',
            subscription_plan_id = ${priceId},
            subscription_renews_at = ${renewsAt},
            subscription_credits_per_month = ${credits},
            updated_at = NOW()
          WHERE id = ${userId}`
        );
        console.log(`Stored subscription ${session.subscription} for user ${userId}`);
      } catch (subErr) {
        console.error('Error storing subscription details:', subErr);
      }
    }
  }

  /**
   * Handle invoice.paid — fires on subscription renewals (not the first payment).
   * Resets the subscriber's credits to their plan amount each month.
   */
  static async handleInvoicePaid(invoice: any): Promise<void> {
    // Skip the first invoice (that's handled by checkout.session.completed)
    if (invoice.billing_reason === 'subscription_create') {
      console.log('Skipping invoice.paid for initial subscription creation (handled by checkout)');
      return;
    }

    const subscriptionId = invoice.subscription;
    if (!subscriptionId) return;

    // Look up user by stripe subscription ID stored in metadata
    const subscription = invoice.subscription_details || {};
    const userId = subscription.metadata?.userId || invoice.metadata?.userId;
    const credits = parseInt(subscription.metadata?.credits || invoice.metadata?.credits || '0', 10);

    if (!userId || !credits) {
      console.log('invoice.paid: Could not determine userId or credits from subscription metadata');
      return;
    }

    // Reset credits to plan amount (use-it-or-lose-it)
    await db
      .update(users)
      .set({
        credits: credits,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    console.log(`Subscription renewal: reset credits to ${credits} for user ${userId}`);
  }

  /**
   * Handle customer.subscription.deleted — period ended or immediate cancel.
   * Flips users.subscription_status to 'cancelled'. Leaves
   * cancel_at_period_end / cancels_at as historical record.
   * Actor on audit row is null/(system); webhook has no req.user/session.
   */
  static async handleSubscriptionDeleted(req: Request, subscription: any): Promise<void> {
    const subscriptionId = subscription.id;

    const result = await db.execute(sql`
      UPDATE users
      SET subscription_status = 'cancelled',
          updated_at = NOW()
      WHERE subscription_id = ${subscriptionId}
      RETURNING id, email
    `);

    if (result.rows.length) {
      const user = result.rows[0] as any;
      await auditLog(req, 'user.subscription_cancelled',
        { type: 'users', id: user.id },
        { payload: { subscriptionId, email: user.email, stripeStatus: subscription.status } }
      );
    }
  }

  /**
   * Handle customer.subscription.updated — fires for any subscription change
   * (cancel/uncancel via portal, plan change, payment-method update, etc.).
   * Captures cancel_at_period_end + cancels_at so the dashboard can surface
   * "subscription ends on X" between portal-cancel and period-end.
   * Actor on audit row is null/(system); webhook has no req.user/session.
   */
  static async handleSubscriptionUpdated(req: Request, subscription: any): Promise<void> {
    const subscriptionId = subscription.id;
    const cancelAtPeriodEnd = !!subscription.cancel_at_period_end;
    const cancelAt = subscription.cancel_at
      ? new Date(subscription.cancel_at * 1000)
      : null;

    const result = await db.execute(sql`
      UPDATE users
      SET cancel_at_period_end = ${cancelAtPeriodEnd},
          cancels_at = ${cancelAt},
          updated_at = NOW()
      WHERE subscription_id = ${subscriptionId}
      RETURNING id, email
    `);

    if (result.rows.length) {
      const user = result.rows[0] as any;
      await auditLog(req, 'user.subscription_updated',
        { type: 'users', id: user.id },
        { payload: {
            subscriptionId,
            email: user.email,
            cancelAtPeriodEnd,
            cancelAt: cancelAt ? cancelAt.toISOString() : null,
            stripeStatus: subscription.status,
        } }
      );
    }
  }
}
