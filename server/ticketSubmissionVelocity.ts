import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";
import type { Request } from "express";
import { auditLog } from "./adminAudit";

// Two-bucket bespoke rate limit for POST /api/tickets. Mirrors the shape
// of verifyEmailVelocity.ts but uses two windows: 5/hour AND 20/day. Both
// limiters mount on the route; whichever fires first 429s. Per chat
// decision (v36 ticket submission backlog Items 0b+0c).
const HOUR_WINDOW_MS = 60 * 60 * 1000;
const HOUR_LIMIT = 5;
const DAY_WINDOW_MS = 24 * 60 * 60 * 1000;
const DAY_LIMIT = 20;

// One audit-log entry per IP per UTC calendar day per window, regardless
// of how many times the limiter fires. Module-level state — resets on
// deploy. Mirrors the dedup pattern in server/rateLimit.ts and
// server/verifyEmailVelocity.ts.
const auditedAt = new Map<string, number>();
const AUDIT_RETAIN_MS = 48 * 60 * 60 * 1000;

setInterval(() => {
  const cutoff = Date.now() - AUDIT_RETAIN_MS;
  auditedAt.forEach((ts, key) => {
    if (ts < cutoff) auditedAt.delete(key);
  });
}, 60_000).unref();

function dedupKey(req: Request, windowName: "hour" | "day"): string {
  const ip = req.ip ?? "unknown";
  const day = new Date().toISOString().slice(0, 10);
  return `${ip}:${day}:${windowName}`;
}

async function tryAuditFirstHit(
  req: Request,
  windowName: "hour" | "day",
  limit: number,
): Promise<void> {
  const key = dedupKey(req, windowName);
  if (auditedAt.has(key)) return;
  auditedAt.set(key, Date.now());
  try {
    await auditLog(
      req,
      "ticket.rate_limited",
      { type: "ip", id: req.ip ?? null },
      {
        payload: {
          window: windowName,
          limit,
          ip_truncated: (req.ip ?? "").slice(0, 12),
        },
      },
    );
  } catch (err) {
    console.error("[ticketSubmissionVelocity audit log failure]", err);
  }
}

function makeLimiter(
  windowMs: number,
  limit: number,
  windowName: "hour" | "day",
): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    limit,
    keyGenerator: (req) => req.ip ?? "unknown",
    skip: (req) => req.method === "OPTIONS",
    standardHeaders: true,
    legacyHeaders: false,
    handler: async (req, res) => {
      const retryAfter = Math.ceil(windowMs / 1000);
      await tryAuditFirstHit(req, windowName, limit);
      res.setHeader("Retry-After", retryAfter);
      res.status(429).json({
        message: "Too many ticket submissions. Please try again later.",
        retryAfter,
      });
    },
  });
}

export const ticketHourlyLimiter: RateLimitRequestHandler = makeLimiter(
  HOUR_WINDOW_MS,
  HOUR_LIMIT,
  "hour",
);

export const ticketDailyLimiter: RateLimitRequestHandler = makeLimiter(
  DAY_WINDOW_MS,
  DAY_LIMIT,
  "day",
);
