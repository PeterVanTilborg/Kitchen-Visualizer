import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";
import type { Request } from "express";
import { auditLog } from "./adminAudit";

// Hard-coded threshold per chat decision: 5 verification-code requests per
// IP per hour. Exposed via admin Settings UI is a future concern; this PR
// intentionally locks the value in code to keep the diff minimal.
const VELOCITY_WINDOW_MS = 60 * 60 * 1000;
const VELOCITY_LIMIT = 5;

// One audit-log entry per IP per UTC calendar day, regardless of which
// endpoint triggered. Module-level state — resets on deploy. Mirrors the
// dedup pattern in server/rateLimit.ts and server/emailValidation.ts.
const auditedAt = new Map<string, number>();
const AUDIT_RETAIN_MS = 48 * 60 * 60 * 1000;

setInterval(() => {
  const cutoff = Date.now() - AUDIT_RETAIN_MS;
  auditedAt.forEach((ts, key) => {
    if (ts < cutoff) auditedAt.delete(key);
  });
}, 60_000).unref();

function dedupKey(req: Request): string {
  const ip = req.ip ?? "unknown";
  const day = new Date().toISOString().slice(0, 10);
  return `${ip}:${day}`;
}

async function tryAuditFirstHit(req: Request): Promise<void> {
  const key = dedupKey(req);
  if (auditedAt.has(key)) return;
  auditedAt.set(key, Date.now());
  try {
    await auditLog(
      req,
      "verify_email_velocity.exceeded",
      { type: "ip", id: req.ip ?? null },
      {
        payload: {
          limit: VELOCITY_LIMIT,
          windowMs: VELOCITY_WINDOW_MS,
          endpoint: req.path,
          firstHitAt: new Date().toISOString(),
        },
      },
    );
  } catch (err) {
    console.error("[verifyEmailVelocity audit log failure]", err);
  }
}

// Single shared limiter instance. Both /api/verify-email and
// /api/widget/verify-email mount it, so the 5/hour cap is per IP across
// both surfaces combined — a spammer cannot bypass by alternating
// endpoints.
export const verifyEmailVelocityLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: VELOCITY_WINDOW_MS,
  limit: VELOCITY_LIMIT,
  keyGenerator: (req) => req.ip ?? "unknown",
  skip: (req) => req.method === "OPTIONS",
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req, res) => {
    const retryAfter = Math.ceil(VELOCITY_WINDOW_MS / 1000);
    await tryAuditFirstHit(req);
    res.setHeader("Retry-After", retryAfter);
    res.status(429).json({
      message: "Too many verification requests. Please try again later.",
      retryAfter,
    });
  },
});
