/**
 * Seed script to create credit packages in Stripe
 * Run with: npx tsx scripts/seed-credit-packages.ts
 */

async function getStripeClient() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken || !hostname) {
    throw new Error('Stripe credentials not available');
  }

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set('include_secrets', 'true');
  url.searchParams.set('connector_names', 'stripe');
  url.searchParams.set('environment', 'development');

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'X_REPLIT_TOKEN': xReplitToken
    }
  });

  const data = await response.json();
  const settings = data.items?.[0]?.settings;

  if (!settings?.secret) {
    throw new Error('Stripe secret key not found');
  }

  const Stripe = (await import('stripe')).default;
  return new Stripe(settings.secret, {
    apiVersion: '2025-08-27.basil' as any,
  });
}

async function seedCreditPackages() {
  console.log('Creating credit packages in Stripe...\n');
  
  const stripe = await getStripeClient();

  // Check if products already exist
  const existingProducts = await stripe.products.search({
    query: "metadata['type']:'wrapvision_credits'"
  });

  if (existingProducts.data.length > 0) {
    console.log('Credit packages already exist in Stripe:');
    for (const product of existingProducts.data) {
      console.log(`  - ${product.name} (${product.id})`);
    }
    console.log('\nTo recreate, delete these products in the Stripe Dashboard first.');
    return;
  }

  // Create Starter Pack - 10 credits for $5
  const starterProduct = await stripe.products.create({
    name: 'Starter Pack - 10 Credits',
    description: '10 high-resolution car wrap visualizations',
    metadata: {
      type: 'wrapvision_credits',
      credits: '10',
    },
  });
  const starterPrice = await stripe.prices.create({
    product: starterProduct.id,
    unit_amount: 500, // $5.00
    currency: 'usd',
    metadata: { credits: '10' },
  });
  console.log(`Created Starter Pack: ${starterProduct.id} with price ${starterPrice.id}`);

  // Create Value Pack - 25 credits for $10 (20% savings)
  const valueProduct = await stripe.products.create({
    name: 'Value Pack - 25 Credits',
    description: '25 high-resolution car wrap visualizations - Save 20%!',
    metadata: {
      type: 'wrapvision_credits',
      credits: '25',
      savings: '20%',
    },
  });
  const valuePrice = await stripe.prices.create({
    product: valueProduct.id,
    unit_amount: 1000, // $10.00
    currency: 'usd',
    metadata: { credits: '25' },
  });
  console.log(`Created Value Pack: ${valueProduct.id} with price ${valuePrice.id}`);

  // Create Pro Pack - 50 credits for $15 (40% savings)
  const proProduct = await stripe.products.create({
    name: 'Pro Pack - 50 Credits',
    description: '50 high-resolution car wrap visualizations - Save 40%! Best Value!',
    metadata: {
      type: 'wrapvision_credits',
      credits: '50',
      savings: '40%',
      popular: 'true',
    },
  });
  const proPrice = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 1500, // $15.00
    currency: 'usd',
    metadata: { credits: '50' },
  });
  console.log(`Created Pro Pack: ${proProduct.id} with price ${proPrice.id}`);

  console.log('\nAll credit packages created successfully!');
  console.log('The products will sync to your database via webhooks.');
}

seedCreditPackages().catch(console.error);
