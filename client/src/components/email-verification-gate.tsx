import { useEffect, useRef, useState } from "react";
import { Loader2, Mail, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useConsumerVerification } from "@/hooks/useConsumerVerification";

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
const TURNSTILE_SCRIPT_ID = "cf-turnstile-script";
const COOLDOWN_MS = 60_000;

interface EmailVerificationGateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
}

/**
 * Two-step modal that gates anonymous renders behind email verification
 * (Item 0c). State machine:
 *   "form" — email + Turnstile widget + Send Code
 *   "code" — 6-digit code input + Verify + Resend
 *
 * The Turnstile widget mounts once when the dialog opens and stays mounted
 * across phase transitions. After each /api/verify-email call (success or
 * failure) the widget is reset so the next request gets a fresh, unused
 * token — Cloudflare invalidates tokens after first use, so resend needs
 * a re-challenge regardless of cooldown.
 *
 * Server-side cooldown (last_code_sent_at column, 60s window) is the
 * enforcement of record. The client-side timer is purely a UX hint;
 * a fast or stale client that bypasses it will get a 429 from the
 * server and surface that as an error.
 */
export function EmailVerificationGate({ open, onOpenChange, onVerified }: EmailVerificationGateProps) {
  const [phase, setPhase] = useState<"form" | "code">("form");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  const { invalidate } = useConsumerVerification();

  // Reset all state when the dialog closes so re-opens start fresh.
  useEffect(() => {
    if (open) return;
    if (widgetIdRef.current && (window as any).turnstile) {
      try { (window as any).turnstile.remove(widgetIdRef.current); } catch {}
      widgetIdRef.current = null;
    }
    setPhase("form");
    setEmail("");
    setCode("");
    setTurnstileToken(null);
    setIsSending(false);
    setIsVerifying(false);
    setError(null);
    setCooldownEndsAt(null);
  }, [open]);

  // Mount the Turnstile widget once per open. Idempotent script load —
  // admin/login.tsx may have inserted the same script tag earlier in the
  // SPA lifecycle.
  useEffect(() => {
    if (!open || !TURNSTILE_SITE_KEY) return;

    const renderWidget = () => {
      if (!turnstileRef.current || widgetIdRef.current || !(window as any).turnstile) return;
      widgetIdRef.current = (window as any).turnstile.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token: string) => setTurnstileToken(token),
        "expired-callback": () => setTurnstileToken(null),
        theme: "dark",
      });
    };

    if (!document.getElementById(TURNSTILE_SCRIPT_ID)) {
      (window as any).onTurnstileLoad = renderWidget;
      const script = document.createElement("script");
      script.id = TURNSTILE_SCRIPT_ID;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad";
      script.async = true;
      document.head.appendChild(script);
    } else if ((window as any).turnstile) {
      renderWidget();
    } else {
      // Script tag exists but window.turnstile not yet defined (loaded by
      // a sibling component, still parsing). Hook the onload callback.
      (window as any).onTurnstileLoad = renderWidget;
    }

    return () => {
      if (widgetIdRef.current && (window as any).turnstile) {
        try { (window as any).turnstile.remove(widgetIdRef.current); } catch {}
        widgetIdRef.current = null;
      }
    };
  }, [open]);

  // Cooldown ticker — only runs when a cooldown is active.
  useEffect(() => {
    if (!cooldownEndsAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [cooldownEndsAt]);

  // Auto-focus the code input when transitioning to the code phase.
  useEffect(() => {
    if (phase === "code") codeInputRef.current?.focus();
  }, [phase]);

  const cooldownRemaining = cooldownEndsAt
    ? Math.max(0, Math.ceil((cooldownEndsAt - now) / 1000))
    : 0;
  const isEmailValid = /\S+@\S+\.\S+/.test(email);
  const canSend = isEmailValid && !!turnstileToken && !isSending && cooldownRemaining === 0;
  const canVerify = code.length === 6 && !isVerifying;

  function resetTurnstile() {
    if (widgetIdRef.current && (window as any).turnstile) {
      try { (window as any).turnstile.reset(widgetIdRef.current); } catch {}
    }
    setTurnstileToken(null);
  }

  async function sendCode() {
    if (!canSend) return;
    setIsSending(true);
    setError(null);
    try {
      const res = await fetch("/api/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, turnstileToken }),
      });
      // Token used (or rejected); always reset for the next action.
      resetTurnstile();
      if (res.ok) {
        setPhase("code");
        setCooldownEndsAt(Date.now() + COOLDOWN_MS);
        setNow(Date.now());
      } else {
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) {
          setError("Please wait a moment before requesting another code");
          // Best-effort: align client cooldown with server's 60s window
          // even though we did not see last_code_sent_at directly.
          setCooldownEndsAt(Date.now() + COOLDOWN_MS);
          setNow(Date.now());
        } else {
          setError(data.message || "Failed to send code. Please try again.");
        }
      }
    } catch {
      resetTurnstile();
      setError("Connection error. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  async function verifyCode() {
    if (!canVerify) return;
    setIsVerifying(true);
    setError(null);
    try {
      const res = await fetch("/api/confirm-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, code }),
      });
      if (res.ok) {
        await invalidate();
        onVerified();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Verification failed.");
        setCode("");
        codeInputRef.current?.focus();
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  }

  function backToForm() {
    setPhase("form");
    setCode("");
    setError(null);
    // Cooldown timer persists across the back-to-form transition by design.
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Verify your email
          </DialogTitle>
          <DialogDescription>
            {phase === "form"
              ? "Enter your email to receive a 6-digit verification code. We use this to prevent abuse and protect email deliverability."
              : "Enter the 6-digit code we just sent."}
          </DialogDescription>
        </DialogHeader>

        {phase === "form" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cv-email">Email</Label>
              <Input
                id="cv-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                disabled={isSending}
                aria-invalid={!!email && !isEmailValid}
                autoFocus
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground" id="cv-spam-hint">
              We sent a 6-digit code to{" "}
              <span className="font-medium text-foreground">{email}</span>. Please check your inbox AND your spam or junk folder. The code is valid for 10 minutes.
            </p>
            <div className="space-y-2">
              <Label htmlFor="cv-code">6-digit code</Label>
              <Input
                ref={codeInputRef}
                id="cv-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setError(null);
                }}
                disabled={isVerifying}
                aria-describedby="cv-spam-hint"
                aria-invalid={!!error}
                className="text-center text-2xl tracking-[0.5em] font-mono"
              />
            </div>
          </div>
        )}

        {/* Turnstile widget — single mount for the dialog lifetime. Visible
            in both phases so the user can re-solve before clicking Resend.
            Hidden by visibility class when site key is absent (dev). */}
        <div ref={turnstileRef} className={TURNSTILE_SITE_KEY ? "flex justify-center" : "hidden"} />

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {phase === "form" ? (
          <Button onClick={sendCode} disabled={!canSend} className="w-full">
            {isSending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Mail className="w-4 h-4 mr-2" />
            )}
            {isSending ? "Sending..." : "Send Verification Code"}
          </Button>
        ) : (
          <div className="space-y-3">
            <Button onClick={verifyCode} disabled={!canVerify} className="w-full">
              {isVerifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isVerifying ? "Verifying..." : "Verify Code"}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={backToForm}
                className="text-muted-foreground hover:text-foreground underline"
                disabled={isVerifying}
              >
                Use a different email
              </button>
              <button
                type="button"
                onClick={sendCode}
                disabled={cooldownRemaining > 0 || !turnstileToken || isSending || isVerifying}
                className="text-muted-foreground hover:text-foreground underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
              >
                {cooldownRemaining > 0 ? `Resend code (${cooldownRemaining}s)` : "Resend code"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
