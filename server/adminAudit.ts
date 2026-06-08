import type { Request } from "express";
import { db } from "./db";
import { adminAuditLog } from "@shared/schema";

// Field names whose values are image bytes (data URIs or base64) and must
// never be written to the audit log. Matches the full-res fields on
// wrap_colors, partners, and any handler that echoes them back.
const IMAGE_FIELDS = new Set<string>([
  "imageUrl",
  "thumbnailUrl",
  "referenceImageData",
  "logoUrl",
  "swatchImageData",
]);

const IMAGE_PLACEHOLDER = "<image data omitted>";

function stripImageData(
  obj: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!obj) return obj;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = IMAGE_FIELDS.has(k) ? IMAGE_PLACEHOLDER : v;
  }
  return out;
}

/**
 * Append an audit row for a mutating admin/superadmin action.
 *
 * Fail-open: any insert error is logged and swallowed so audit-log
 * problems can never break a handler. Call this AFTER the DB write
 * has succeeded, just before res.json.
 */
export async function auditLog(
  req: Request,
  action: string,
  entity: { type: string; id?: string | number | null },
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    payload?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    const sanitized = changes
      ? {
          before: stripImageData(changes.before),
          after: stripImageData(changes.after),
          payload: changes.payload,
        }
      : null;

    const passportUser = (req as any).user as { id?: string; email?: string; role?: string } | undefined;

    await db.insert(adminAuditLog).values({
      userId: req.session.adminUserId ?? passportUser?.id ?? null,
      userEmail: (req.session.adminEmail ?? passportUser?.email)?.toLowerCase() ?? null,
      actorRole: req.session.adminRole ?? passportUser?.role ?? null,
      action,
      entityType: entity.type,
      entityId: entity.id != null ? String(entity.id) : null,
      changes: sanitized,
      ipAddress: req.ip ?? null,
      userAgent: req.headers["user-agent"] ?? null,
    });
  } catch (err) {
    console.error("[auditLog] failed:", err);
  }
}
