// Currency formatter for cent-denominated integers.
//
// Stripe stores monetary values in integer cents; commission_ledger.amount_cents
// follows the same convention. UI display divides by 100 and formats to two
// decimal places with a leading dollar sign. Reused by the ambassador
// dashboard (PR #74a) and the admin payouts page (PR #74b).
export function formatCents(cents: number | null | undefined): string {
  const n = typeof cents === "number" && Number.isFinite(cents) ? cents : 0;
  return `$${(n / 100).toFixed(2)}`;
}
