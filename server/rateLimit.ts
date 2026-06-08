import crypto from "crypto";
import rateLimit, { type RateLimitInfo, type RateLimitRequestHandler } from "express-rate-limit";
import type { Request } from "express";
import { auditLog } from "./adminAudit";
import { getRateLimitSettings } from "./storage";
import type { RateLimitSettings } from "@shared/schema";

const HARD_DEFAULTS: RateLimitSettings = {
  requestsPerMinute: 10,
  requestsPerHour: 100,
  requestsPerDay: 500,
};

const CACHE_TTL_MS = 60_000;

let cached: { value: RateLimitSettings; expiresAt: number } | null = null;

export async function loadLimitsCached(): Promise<RateLimitSettings> {
  if (cached && Date.now() < cached.expiresAt) return cached.value;
  try {
    const fresh = await getRateLimitSettings();
    cached = { value: fresh, expiresAt: Date.now() + CACHE_TTL_MS };
    return fresh;
  } catch (err) {
    console.error("[rateLimit cache failure]", err);
    return HARD_DEFAULTS;
  }
}

export function invalidateRateLimitCache(): void {
  cached = null;
}

// One audit-log entry per IP per UTC calendar day, regardless of which
// window triggered. Module-level state — resets on deploy.
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

async function tryAuditFirstHit(
  req: Request,
  windowName: "minute" | "hour" | "day",
  limit: number,
): Promise<void> {
  const key = dedupKey(req);
  if (auditedAt.has(key)) return;
  auditedAt.set(key, Date.now());
  try {
    await auditLog(
      req,
      "rate_limit.exceeded",
      { type: "ip", id: req.ip ?? null },
      {
        payload: {
          window: windowName,
          limit,
          endpoint: req.path,
          firstHitAt: new Date().toISOString(),
        },
      },
    );
  } catch (err) {
    console.error("[rateLimit audit log failure]", err);
  }
}

function partnerBucketKey(req: Request): string {
  const auth = req.headers["authorization"];
  if (typeof auth === "string" && auth.startsWith("Bearer ")) {
    const token = auth.slice(7);
    if (token) {
      const hash = crypto.createHash("sha256").update(token).digest("hex").slice(0, 16);
      return `pt:${hash}`;
    }
  }
  return `ip:${req.ip ?? "unknown"}`;
}

type Window = { ms: number; name: "minute" | "hour" | "day"; pick: (s: RateLimitSettings) => number };

const WINDOWS: Window[] = [
  { ms: 60_000, name: "minute", pick: (s) => s.requestsPerMinute },
  { ms: 3_600_000, name: "hour", pick: (s) => s.requestsPerHour },
  { ms: 86_400_000, name: "day", pick: (s) => s.requestsPerDay },
];

export type RateLimitFactoryOptions = {
  multiplier?: number;
  keyGenerator?: (req: Request) => string;
};

export function createIpRateLimiters(
  opts: RateLimitFactoryOptions = {},
): RateLimitRequestHandler[] {
  const multiplier = opts.multiplier ?? 1;
  const keyGenerator = opts.keyGenerator ?? ((req) => `ip:${req.ip ?? "unknown"}`);

  return WINDOWS.map((w) =>
    rateLimit({
      windowMs: w.ms,
      limit: async () => {
        const s = await loadLimitsCached();
        return Math.max(1, Math.floor(w.pick(s) * multiplier));
      },
      keyGenerator,
      skip: (req) => req.method === "OPTIONS",
      standardHeaders: true,
      legacyHeaders: false,
      handler: async (req, res, _next, options) => {
        const retryAfter = Math.ceil((options.windowMs ?? w.ms) / 1000);
        const info = (req as Request & { rateLimit?: RateLimitInfo }).rateLimit;
        const limitForLog = info?.limit ?? 0;
        await tryAuditFirstHit(req, w.name, limitForLog);
        res.setHeader("Retry-After", retryAfter);
        res.status(429).json({ message: "Rate limit exceeded", retryAfter });
      },
    }),
  );
}

export function createPartnerRateLimiters(): RateLimitRequestHandler[] {
  return createIpRateLimiters({ multiplier: 3, keyGenerator: partnerBucketKey });
}
