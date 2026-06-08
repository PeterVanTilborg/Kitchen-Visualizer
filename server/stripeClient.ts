import Stripe from "stripe";

// Standard Stripe client using environment variables
export function getUncachableStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set");
  }
  return new Stripe(secretKey, {
    apiVersion: "2025-01-27.acacia" as any,
  });
}

export function getStripePublishableKey(): string {
  const key = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error("STRIPE_PUBLISHABLE_KEY environment variable is not set");
  }
  return key;
}

export async function getStripeSync(): Promise<Stripe> {
  return getUncachableStripeClient();
}
