import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CodeConfirmGate } from "@/components/code-confirm-gate";

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
const TURNSTILE_SCRIPT_ID = "cf-turnstile-script";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [showCodeConfirm, setShowCodeConfirm] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Mount Turnstile widget on the register pane only. Mirrors the idempotent
  // script-load pattern from email-verification-gate.tsx so the script can
  // be safely loaded by any other surface (admin/login.tsx, EmailVerificationGate)
  // without conflicting.
  useEffect(() => {
    if (mode !== "register" || !TURNSTILE_SITE_KEY) return;

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
      (window as any).onTurnstileLoad = renderWidget;
    }

    return () => {
      if (widgetIdRef.current && (window as any).turnstile) {
        try { (window as any).turnstile.remove(widgetIdRef.current); } catch {}
        widgetIdRef.current = null;
      }
      setTurnstileToken(null);
    };
  }, [mode]);

  function resetTurnstile() {
    if (widgetIdRef.current && (window as any).turnstile) {
      try { (window as any).turnstile.reset(widgetIdRef.current); } catch {}
    }
    setTurnstileToken(null);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "register") {
      if (!firstName.trim()) {
        toast({ title: "First name is required", variant: "destructive" });
        return;
      }
      if (TURNSTILE_SITE_KEY && !turnstileToken) {
        toast({ title: "Please complete the security check", variant: "destructive" });
        return;
      }
    }
    setIsLoading(true);
    try {
      const url = mode === "login" ? "/api/login" : "/api/register";
      const body: Record<string, string> = { email, password };
      if (mode === "register") {
        body.firstName = firstName.trim();
        body.lastName = lastName.trim();
        if (turnstileToken) body.turnstileToken = turnstileToken;
      }
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        // Token (if used) is now consumed — fetch a fresh one for retry.
        if (mode === "register") resetTurnstile();
        toast({
          title: mode === "login" ? "Sign in failed" : "Registration failed",
          description: data.message || "An error occurred. Please try again.",
          variant: "destructive",
        });
        return;
      }
      if (mode === "register" && data.mode === "verify_required") {
        setPendingEmail(data.email || email);
        setShowCodeConfirm(true);
        return;
      }
      toast({
        title: mode === "login" ? "Welcome back!" : "Account created!",
        description: mode === "login" ? "You have signed in successfully." : "Your account has been created.",
      });
      setLocation("/");
    } catch {
      if (mode === "register") resetTurnstile();
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  function handleConfirmSuccess() {
    setShowCodeConfirm(false);
    toast({ title: "Account confirmed!", description: "Welcome to WrapUp AI." });
    setLocation("/");
  }

  function handleConfirmCancel() {
    setShowCodeConfirm(false);
    // Form values stay intact so the user can re-submit if desired.
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <img src="/logo-wrapup.svg" alt="wrap-up" className="h-10 w-auto" width="120" height="40" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{mode === "login" ? "Sign In" : "Create Account"}</CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Sign in to your account to access your credits and designs."
                : "Create a new account to save your credits and designs."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === "login" && (
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => setLocation(`/reset-password?email=${encodeURIComponent(email)}`)}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input id="password" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
              {mode === "register" && (
                <div ref={turnstileRef} className={TURNSTILE_SITE_KEY ? "flex justify-center" : "hidden"} />
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={
                  isLoading ||
                  (mode === "register" && !!TURNSTILE_SITE_KEY && !turnstileToken)
                }
              >
                {isLoading
                  ? (mode === "login" ? "Signing in..." : "Creating account...")
                  : (mode === "login" ? "Sign In" : "Create Account")}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              {mode === "login" ? (
                <>Don&apos;t have an account?{" "}
                  <button onClick={() => setMode("register")} className="text-foreground underline hover:no-underline">Create one</button>
                </>
              ) : (
                <>Already have an account?{" "}
                  <button onClick={() => setMode("login")} className="text-foreground underline hover:no-underline">Sign in</button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <CodeConfirmGate
        open={showCodeConfirm}
        email={pendingEmail}
        onSuccess={handleConfirmSuccess}
        onCancel={handleConfirmCancel}
      />
    </div>
  );
}
