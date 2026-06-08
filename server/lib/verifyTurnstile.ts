/**
 * Cloudflare Turnstile token verification helper.
 *
 * Two call-site postures via the optional failClosed flag:
 *   - failClosed: false (default) — when TURNSTILE_SECRET_KEY is missing,
 *     return { ok: true } and let the request proceed. Matches the existing
 *     admin-login behavior and keeps local/dev environments without the
 *     secret usable.
 *   - failClosed: true — when the secret is missing, refuse the request.
 *     Use this on endpoints whose abuse risk is high enough that a
 *     misconfigured production deploy should be a hard failure rather than
 *     a silent bypass (e.g. the consumer /api/verify-email endpoint).
 *
 * Network/parse errors are always returned as { ok: false, status: 500 }
 * regardless of failClosed — a transient Cloudflare outage should not let
 * traffic through unverified.
 */

export type TurnstileResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

export async function verifyTurnstileToken(
  token: string | undefined,
  options?: { failClosed?: boolean },
): Promise<TurnstileResult> {
  const failClosed = options?.failClosed ?? false;
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    if (failClosed) {
      return { ok: false, status: 500, message: "CAPTCHA verification not configured" };
    }
    return { ok: true };
  }

  if (!token) {
    return { ok: false, status: 400, message: "CAPTCHA verification required" };
  }

  try {
    const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token }),
    });
    const verifyResult = (await verifyRes.json()) as { success: boolean };
    if (!verifyResult.success) {
      return { ok: false, status: 400, message: "CAPTCHA verification failed" };
    }
    return { ok: true };
  } catch (err) {
    console.error("[turnstile] verification error:", err);
    return { ok: false, status: 500, message: "CAPTCHA verification error" };
  }
}
