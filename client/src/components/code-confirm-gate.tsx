import { useEffect, useRef, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";

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

interface CodeConfirmGateProps {
  open: boolean;
  email: string;
  onSuccess: (user: any) => void;
  onCancel: () => void;
}

/**
 * Single-phase confirm dialog for the /api/register verify_required flow
 * (Item 0a Session 3 Step 4). User has already submitted the registration
 * form; backend has created the user with email_verified=false and emailed
 * a 6-digit code. This dialog accepts the code and POSTs it to
 * /api/register/confirm; on 200 the server logs the user in via cookie
 * session and we hand the user payload to onSuccess for the parent to
 * decide how to navigate.
 *
 * No Turnstile — possession of the code (delivered to the mailbox) is
 * itself proof, mirroring /api/confirm-email's posture.
 *
 * No resend button in v1 — invalid or expired codes require re-submitting
 * the full registration form (which generates a fresh code). A future
 * /api/register/resend-code endpoint would change this; tracked separately.
 */
export function CodeConfirmGate({ open, email, onSuccess, onCancel }: CodeConfirmGateProps) {
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog closes so re-opens start fresh.
  useEffect(() => {
    if (open) return;
    setCode("");
    setIsVerifying(false);
    setError(null);
  }, [open]);

  // Autofocus the code input once the dialog has rendered.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => codeInputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  const canVerify = code.length === 6 && !isVerifying;

  async function verifyCode() {
    if (!canVerify) return;
    setIsVerifying(true);
    setError(null);
    try {
      const res = await fetch("/api/register/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, code }),
      });
      if (res.ok) {
        const user = await res.json();
        onSuccess(user);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Invalid code");
        setCode("");
        codeInputRef.current?.focus();
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) onCancel();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Confirm your email
          </DialogTitle>
          <DialogDescription>
            We sent a 6-digit code to{" "}
            <span className="font-medium text-foreground">{email}</span>. Please check your inbox AND your spam or junk folder. The code is valid for 10 minutes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rc-code">6-digit code</Label>
            <Input
              ref={codeInputRef}
              id="rc-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                setError(null);
              }}
              disabled={isVerifying}
              aria-invalid={!!error}
              className="text-center text-2xl tracking-[0.5em] font-mono"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="space-y-3">
          <Button onClick={verifyCode} disabled={!canVerify} className="w-full">
            {isVerifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {isVerifying ? "Confirming..." : "Confirm"}
          </Button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full text-center text-sm text-muted-foreground underline hover:text-foreground"
            disabled={isVerifying}
          >
            Back to sign up
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
