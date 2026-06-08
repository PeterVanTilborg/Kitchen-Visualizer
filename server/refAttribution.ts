import type { Request } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "@shared/schema";
import { auditLog } from "./adminAudit";

// Same regex as server/refCapture.ts. We re-validate here because the
// cookie value could have been tampered with (HttpOnly stops JS but a
// browser-DevTools or proxy edit is still possible). Defence in depth.
const HANDLE_REGEX = /^[a-zA-Z0-9_-]{3,30}$/;

const COOKIE_NAME = "wup_ref";

// Called from the signup paths immediately after a verified user row
// is created (auto_promote in /api/register) or marked verified
// (/api/register/confirm). Fire-and-forget: try/catch wraps everything
// so a failure here never blocks signup. Silent no-op when the cookie
// is missing, malformed, or the handle no longer resolves to a current
// ambassador (the ambassador may have been demoted between landing and
// signup — that case is by design).
export async function writeReferralAttribution(req: Request, newUserId: string): Promise<void> {
  try {
    const handle = req.cookies?.[COOKIE_NAME];
    if (typeof handle !== "string" || !HANDLE_REGEX.test(handle)) return;

    const [referrer] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.referralHandle, handle), eq(users.isAmbassador, true)))
      .limit(1);

    if (!referrer) return;
    if (referrer.id === newUserId) return; // self-referral guard, defence in depth

    await db
      .update(users)
      .set({ referredByUserId: referrer.id })
      .where(eq(users.id, newUserId));

    await auditLog(
      req,
      "user.referral_attributed",
      { type: "users", id: newUserId },
      {
        payload: {
          referrerUserId: referrer.id,
          referrerHandle: handle,
          referredUserId: newUserId,
        },
      },
    );
  } catch (err) {
    console.error("[refAttribution] failed:", err);
    // Never blocks signup.
  }
}
