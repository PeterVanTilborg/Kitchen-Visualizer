import { disposableEmailBlocklistSet } from "disposable-email-domains-js";
import type { Request, RequestHandler } from "express";
import { auditLog } from "./adminAudit";
import { maskEmail } from "./lib/maskEmail";

// Cache the Set once at module init. The library re-builds it on every
// call to its helpers; doing it here avoids that work per request.
const cachedBlocklist: Set<string> = disposableEmailBlocklistSet();

export function isDisposableEmail(email: string): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const at = normalized.indexOf("@");
  if (at < 0) return false;
  const domain = normalized.slice(at + 1);
  if (!domain) return false;
  return cachedBlocklist.has(domain);
}

// One audit-log entry per IP per UTC calendar day, regardless of which
// endpoint triggered. Module-level state — resets on deploy. Mirrors the
// dedup pattern in server/rateLimit.ts.
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
  email: string,
  domain: string,
): Promise<void> {
  const key = dedupKey(req);
  if (auditedAt.has(key)) return;
  auditedAt.set(key, Date.now());
  try {
    await auditLog(
      req,
      "disposable_email.rejected",
      { type: "ip", id: req.ip ?? null },
      {
        payload: {
          emailMasked: maskEmail(email),
          domain,
          endpoint: req.path,
          firstHitAt: new Date().toISOString(),
        },
      },
    );
  } catch (err) {
    console.error("[emailValidation audit log failure]", err);
  }
}

export function rejectDisposableEmail(): RequestHandler {
  return async (req, res, next) => {
    const raw = typeof req.body?.email === "string" ? req.body.email : "";
    if (!isDisposableEmail(raw)) return next();
    const normalized = raw.trim().toLowerCase();
    const domain = normalized.slice(normalized.indexOf("@") + 1);
    await tryAuditFirstHit(req, normalized, domain);
    res.status(400).json({
      message: "This email provider isn't supported. Please use a permanent email address.",
    });
  };
}
