import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { db } from "./db";
import { users, consumerVerifiedEmails } from "@shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import { maskEmail } from "./lib/maskEmail";
import { verifyTurnstileToken } from "./lib/verifyTurnstile";
import { sendVerificationCodeEmail, sendWelcomeEmail } from "./notificationService";
import { getRegisterFlowState } from "./lib/getRegisterFlowState";
import { rejectDisposableEmail } from "./emailValidation";
import { writeReferralAttribution } from "./refAttribution";

// Simple password hashing using Node's built-in crypto (no extra deps)
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const hashToVerify = crypto.scryptSync(password, salt, 64).toString("hex");
  return hash === hashToVerify;
}

export function setupAuth(app: Express): void {
  const PgSession = connectPgSimple(session);

  app.use(
    session({
      store: new PgSession({
        pool: new Pool({ connectionString: process.env.DATABASE_URL }),
        tableName: "sessions",
        createTableIfMissing: false,
      }),
      secret: process.env.SESSION_SECRET || "wrap-up-ai-secret-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // Passport local strategy â email + password
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email.toLowerCase()))
            .limit(1);

          if (!user || !user.passwordHash) {
            return done(null, false, { message: "Invalid email or password" });
          }

          if (!verifyPassword(password, user.passwordHash)) {
            return done(null, false, { message: "Invalid email or password" });
          }

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      done(null, user || null);
    } catch (err) {
      done(err);
    }
  });
}

export function registerAuthRoutes(app: Express): void {
  // Register new account — Item 0a Session 3.
  // Two paths:
  //  - auto_promote: browser presents a wup_consumer_token cookie that
  //    resolves to a verified consumer_verified_emails row whose email
  //    matches the submitted email. User is created with email_verified
  //    true and immediately logged in; no second verification round-trip.
  //  - verify_required: anything short of the full match. User is created
  //    with email_verified false and a 6-digit code. Login is withheld
  //    until /api/register/confirm succeeds.
  app.post("/api/register", rejectDisposableEmail(), async (req: Request, res: Response) => {
    const rawEmail = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const firstName = typeof req.body?.firstName === "string" ? req.body.firstName.trim() : "";
    const lastName = typeof req.body?.lastName === "string" ? req.body.lastName.trim() : "";
    const turnstileToken = typeof req.body?.turnstileToken === "string" ? req.body.turnstileToken : undefined;

    if (!rawEmail || !/\S+@\S+\.\S+/.test(rawEmail)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    if (!firstName) {
      return res.status(400).json({ message: "First name is required" });
    }

    const ts = await verifyTurnstileToken(turnstileToken, { failClosed: true });
    if (!ts.ok) {
      return res.status(ts.status).json({ message: ts.message });
    }

    try {
      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.email, rawEmail))
        .limit(1);

      if (existing) {
        return res.status(409).json({ message: "An account with this email already exists" });
      }

      const passwordHash = hashPassword(password);
      const flow = await getRegisterFlowState({
        customerToken: req.cookies?.wup_consumer_token,
        submittedEmail: rawEmail,
      });

      if (flow.mode === "auto_promote") {
        // Atomic: create the user with email_verified true AND link the
        // consumer row in a single transaction so a partial failure can
        // never leave a logged-in user with an unlinked consumer row.
        const newUser = await db.transaction(async (tx) => {
          const [created] = await tx
            .insert(users)
            .values({
              email: rawEmail,
              passwordHash,
              firstName,
              lastName: lastName || null,
              credits: 2,
              emailVerified: true,
              emailVerifiedAt: new Date(),
            })
            .returning();
          await tx
            .update(consumerVerifiedEmails)
            .set({ linkedUserId: created.id })
            .where(eq(consumerVerifiedEmails.id, flow.consumerRowId));
          return created;
        });

        req.login(newUser, async (err) => {
          if (err) {
            console.error(`[register] auto-promote login failed for=${maskEmail(rawEmail)} error=${err?.message || String(err)}`);
            return res.status(500).json({ message: "Login after register failed" });
          }
          const { passwordHash: _, ...safeUser } = newUser as any;
          console.log(`[register] auto-promote ${maskEmail(rawEmail)} → user ${newUser.id}`);
          // PR #71 — write referral attribution if a wup_ref cookie resolves
          // to a current ambassador. Awaited so the audit-log entry lands
          // before the success response. Helper is internally fire-and-forget;
          // any failure is logged and swallowed and cannot block signup.
          await writeReferralAttribution(req, newUser.id);
          // Fire-and-forget welcome email — never blocks or fails the auth response.
          sendWelcomeEmail({ to: rawEmail, firstName }).catch((welcomeErr) => {
            console.error(`[register] auto-promote welcome email failed for=${maskEmail(rawEmail)} error=${welcomeErr?.message || String(welcomeErr)}`);
          });
          return res.status(201).json(safeUser);
        });
        return;
      }

      // verify_required path: create the user unverified, stamp a 6-digit
      // code, and email it. Login is withheld until /api/register/confirm.
      // Single INSERT — atomic by nature, no transaction needed.
      const code = crypto.randomInt(100000, 1000000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      const sentAt = new Date();

      await db
        .insert(users)
        .values({
          email: rawEmail,
          passwordHash,
          firstName,
          lastName: lastName || null,
          credits: 2,
          verificationCode: code,
          codeExpiresAt: expiresAt,
          lastCodeSentAt: sentAt,
        });

      const sendResult = await sendVerificationCodeEmail({ to: rawEmail, name: firstName, code });
      if (!sendResult.success) {
        console.error(`[register] verify-required send failed to=${maskEmail(rawEmail)} error=${sendResult.error || "send failed"}`);
        return res.status(500).json({ message: "Failed to send verification code. Please try again." });
      }

      console.log(`[register] verify-required ${maskEmail(rawEmail)} code sent`);
      return res.status(201).json({
        mode: "verify_required",
        email: rawEmail,
        cooldownSeconds: 60,
        freeCredits: 2,
      });
    } catch (err: any) {
      console.error(`[register] error to=${maskEmail(rawEmail)} error=${err?.message || String(err)}`);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  // Confirm verification code from /api/register verify_required path —
  // Item 0a Session 3. No Turnstile: possession of the code (delivered to
  // a mailbox the user controls) is itself proof, and the user already
  // passed Turnstile on /api/register. Mirrors /api/confirm-email's
  // posture on the consumer side.
  app.post("/api/register/confirm", async (req: Request, res: Response) => {
    const rawEmail = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";

    if (!rawEmail || !/\S+@\S+\.\S+/.test(rawEmail)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ message: "Code must be 6 digits" });
    }

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, rawEmail))
        .limit(1);

      // Single 400 message for all four invalid-code cases — do not leak
      // whether the email is registered, the code is wrong, or the code
      // is expired. Logs distinguish for diagnostics.
      if (!user) {
        console.log(`[register-confirm] invalid to=${maskEmail(rawEmail)} reason=no_user`);
        return res.status(400).json({ message: "Invalid code" });
      }
      if (user.verificationCode !== code) {
        console.log(`[register-confirm] invalid to=${maskEmail(rawEmail)} reason=code_mismatch`);
        return res.status(400).json({ message: "Invalid code" });
      }
      if (!user.codeExpiresAt || new Date(user.codeExpiresAt) < new Date()) {
        console.log(`[register-confirm] invalid to=${maskEmail(rawEmail)} reason=code_expired`);
        return res.status(400).json({ message: "Invalid code" });
      }

      const [verifiedUser] = await db
        .update(users)
        .set({
          emailVerified: true,
          emailVerifiedAt: new Date(),
          verificationCode: null,
          codeExpiresAt: null,
          lastCodeSentAt: null,
        })
        .where(eq(users.id, user.id))
        .returning();

      req.login(verifiedUser, async (err) => {
        if (err) {
          console.error(`[register-confirm] login failed for=${maskEmail(rawEmail)} error=${err?.message || String(err)}`);
          return res.status(500).json({ message: "Login after confirm failed" });
        }
        const { passwordHash: _, ...safeUser } = verifiedUser as any;
        console.log(`[register-confirm] success ${maskEmail(rawEmail)} → user ${verifiedUser.id}`);
        // PR #71 — write referral attribution if a wup_ref cookie resolves
        // to a current ambassador. Awaited so the audit-log entry lands
        // before the success response. Helper is internally fire-and-forget;
        // any failure is logged and swallowed and cannot block signup.
        await writeReferralAttribution(req, verifiedUser.id);
        // Fire-and-forget welcome email — never blocks or fails the auth response.
        sendWelcomeEmail({ to: rawEmail, firstName: verifiedUser.firstName || "" }).catch((welcomeErr) => {
          console.error(`[register-confirm] welcome email failed for=${maskEmail(rawEmail)} error=${welcomeErr?.message || String(welcomeErr)}`);
        });
        return res.status(200).json(safeUser);
      });
    } catch (err: any) {
      console.error(`[register-confirm] error to=${maskEmail(rawEmail)} error=${err?.message || String(err)}`);
      res.status(500).json({ message: "Failed to confirm verification code" });
    }
  });

  // Login
  app.post("/api/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        const { passwordHash: _, ...safeUser } = user;
        return res.json(safeUser);
      });
    })(req, res, next);
  });

  // Logout
  app.post("/api/logout", (req: Request, res: Response) => {
    req.logout(() => {
      res.json({ message: "Logged out" });
    });
  });
  app.get("/api/logout", (req: Request, res: Response) => {
    req.logout(() => {
      res.redirect("/");
    });
  });

  // Get current user
  app.get("/api/auth/user", (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { passwordHash: _, ...safeUser } = req.user as any;
    res.json(safeUser);
  });
}

// Middleware to protect routes that require authentication
export function isAuthenticated(req: Request, res: Response, next: NextFunction): void {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Authentication required" });
}
