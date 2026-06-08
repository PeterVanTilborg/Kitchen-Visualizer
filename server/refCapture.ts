import type { Request, Response, NextFunction } from "express";

// Mirrors server/routes.ts:HANDLE_REGEX (PR #70) and the inline
// validator in client/src/pages/admin/ambassadors.tsx. Keep these in
// sync if the rules ever change. The {3,30} bound enforces both length
// and character set in a single test.
const HANDLE_REGEX = /^[a-zA-Z0-9_-]{3,30}$/;

const COOKIE_NAME = "wup_ref";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

// Captures ?ref=<handle> from any incoming request and persists the
// normalised handle as an HttpOnly cookie for 30 days. Anonymous-only
// per chat decision: logged-in users with ?ref= are ignored to prevent
// self-referral and cookie pollution. First-touch wins: an existing
// wup_ref cookie is never overwritten. The middleware is fire-and-forget
// and never fails the request.
export function refCaptureMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    const raw = req.query.ref;
    if (typeof raw !== "string" || !raw) return next();

    const normalized = raw.trim().toLowerCase();
    if (!HANDLE_REGEX.test(normalized)) return next();

    // Decision C: ignore for logged-in users.
    if (typeof req.isAuthenticated === "function" && req.isAuthenticated() && req.user) {
      return next();
    }

    // First-touch wins — don't overwrite an existing cookie.
    const existing = req.cookies?.[COOKIE_NAME];
    if (typeof existing === "string" && existing.length > 0) return next();

    res.cookie(COOKIE_NAME, normalized, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: MAX_AGE_MS,
    });
  } catch (err) {
    console.error("[refCapture] failed:", err);
    // Fall through to next() — never fail the request.
  }
  next();
}
