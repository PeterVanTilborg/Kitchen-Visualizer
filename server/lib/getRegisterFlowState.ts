/**
 * Pure helper that decides whether a /api/register request can auto-promote
 * an already-verified anonymous consumer email straight into the new account
 * (no second verification round-trip), or whether the standard 6-digit code
 * flow is required.
 *
 * Item 0a Session 3 — signup-side email verification gate.
 *
 * Auto-promote path (one deterministic match):
 *   - The browser presents a wup_consumer_token cookie
 *   - That cookie resolves to a consumer_verified_emails row
 *   - The row's email matches the email submitted to /api/register
 *   - The row is verified (verifiedAt is not null)
 *
 * Anything short of all four conditions falls through to verify_required, in
 * which case /api/register proceeds with the standard send-code-then-confirm
 * flow. Per the locked spec there is no email-mismatch UX — support handles
 * edge cases.
 *
 * No writes, no side effects, no Turnstile, no SendGrid. Callers compose
 * this helper with their own session/login/UPDATE side effects.
 */

import { getConsumerStateByToken } from "../storage";

export type RegisterFlowState =
  | { mode: "auto_promote"; consumerRowId: number }
  | { mode: "verify_required" };

export async function getRegisterFlowState(opts: {
  customerToken: string | undefined;
  submittedEmail: string;
}): Promise<RegisterFlowState> {
  const { customerToken, submittedEmail } = opts;

  if (!customerToken) {
    return { mode: "verify_required" };
  }

  const row = await getConsumerStateByToken(customerToken);
  if (!row) {
    return { mode: "verify_required" };
  }

  if (row.email !== submittedEmail.toLowerCase()) {
    return { mode: "verify_required" };
  }

  if (row.verifiedAt === null) {
    return { mode: "verify_required" };
  }

  return { mode: "auto_promote", consumerRowId: row.id };
}
