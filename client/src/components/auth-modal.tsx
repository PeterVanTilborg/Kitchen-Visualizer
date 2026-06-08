import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn, UserPlus, Eye, EyeOff, ArrowLeft, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CodeConfirmGate } from "@/components/code-confirm-gate";

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
const TURNSTILE_SCRIPT_ID = "cf-turnstile-script";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const forgotSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;
type ForgotData = z.infer<typeof forgotSchema>;

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "login" | "register";
}

export function AuthModal({ open, onOpenChange, defaultTab = "login" }: AuthModalProps) {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [showForgot, setShowForgot] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Item 0l Session 2 — sync activeTab to defaultTab whenever the modal
  // re-opens. The useState initializer above only runs on first mount, so
  // without this effect a parent that toggles defaultTab between opens (e.g.
  // pipeline-brand-dialog routing the user straight to Register) would have
  // no effect on the visible tab. Resets to defaultTab on each open=true
  // transition; user-initiated tab switches within an open session still
  // work normally because activeTab is the source of truth while open.
  useEffect(() => {
    if (open) setActiveTab(defaultTab);
  }, [open, defaultTab]);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [showCodeConfirm, setShowCodeConfirm] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Mount Turnstile widget when the register tab is active. Idempotent
  // script load mirrors email-verification-gate.tsx so multiple surfaces
  // can coexist on the same SPA without double-loading.
  useEffect(() => {
    if (!open || activeTab !== "register" || showForgot || !TURNSTILE_SITE_KEY) return;

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
  }, [open, activeTab, showForgot]);

  function resetTurnstile() {
    if (widgetIdRef.current && (window as any).turnstile) {
      try { (window as any).turnstile.reset(widgetIdRef.current); } catch {}
    }
    setTurnstileToken(null);
  }

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: "", email: "", password: "" },
  });

  const forgotForm = useForm<ForgotData>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  async function handleAuthSuccess(user: any) {
    queryClient.setQueryData(["/api/auth/user"], user);
    await queryClient.refetchQueries({ queryKey: ["/api/credits/status"], type: "active" });
    onOpenChange(false);
  }

  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const res = await apiRequest("POST", "/api/login", data);
      return res.json();
    },
    onSuccess: async (user) => {
      toast({ title: "Welcome back!", description: `Signed in as ${user.email}` });
      await handleAuthSuccess(user);
    },
    onError: (error: Error) => {
      toast({ title: "Sign in failed", description: error.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const payload = turnstileToken ? { ...data, turnstileToken } : data;
      const res = await apiRequest("POST", "/api/register", payload);
      return res.json();
    },
    onSuccess: async (body) => {
      // /api/register returns either an auto_promote user payload or
      // { mode: "verify_required", email, cooldownSeconds, freeCredits }.
      if (body?.mode === "verify_required") {
        setPendingEmail(body.email || registerForm.getValues("email"));
        setShowCodeConfirm(true);
        return;
      }
      toast({ title: "Account created!", description: `Welcome, ${body.firstName || body.email}!` });
      await handleAuthSuccess(body);
    },
    onError: (error: Error) => {
      // Token is single-use; force a fresh challenge for the retry.
      resetTurnstile();
      toast({ title: "Registration failed", description: error.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const forgotMutation = useMutation({
    mutationFn: async (data: ForgotData) => {
      const res = await apiRequest("POST", "/api/forgot-password", data);
      return res.json();
    },
    onSuccess: () => {
      setResetSent(true);
      toast({ title: "Check your email", description: "If that email exists, we sent a password reset link." });
    },
    onError: (error: Error) => {
      toast({ title: "Something went wrong", description: error.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  function handleShowForgot() {
    // Pre-fill forgot email from login form
    const loginEmail = loginForm.getValues("email");
    if (loginEmail) forgotForm.setValue("email", loginEmail);
    setShowForgot(true);
    setResetSent(false);
  }

  function handleBackToLogin() {
    setShowForgot(false);
    setResetSent(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {showForgot ? (
              <>
                <Mail className="w-5 h-5 text-primary" />
                Reset Password
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5 text-primary" />
                Sign In to Wrap Up AI
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {showForgot
              ? "Enter your email and we'll send you a link to reset your password."
              : "Sign in to purchase credits and save your high-resolution designs."}
          </DialogDescription>
        </DialogHeader>

        {showForgot ? (
          <div className="mt-4 space-y-4">
            {resetSent ? (
              <div className="text-center space-y-4 py-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <p className="font-medium">Check your inbox</p>
                <p className="text-sm text-muted-foreground">
                  If an account with that email exists, we sent a password reset link. It expires in 1 hour.
                </p>
                <Button variant="outline" className="w-full" onClick={handleBackToLogin}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Sign In
                </Button>
              </div>
            ) : (
              <Form {...forgotForm}>
                <form onSubmit={forgotForm.handleSubmit((d) => forgotMutation.mutate(d))} className="space-y-4">
                  <FormField
                    control={forgotForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input type="email" placeholder="your@email.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={forgotMutation.isPending}>
                    <Mail className="w-4 h-4 mr-2" />
                    {forgotMutation.isPending ? "Sending..." : "Send Reset Link"}
                  </Button>
                  <button
                    type="button"
                    className="w-full text-center text-sm text-muted-foreground underline hover:text-foreground"
                    onClick={handleBackToLogin}
                  >
                    Back to Sign In
                  </button>
                </form>
              </Form>
            )}
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "register")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="register">Create Account</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-4">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit((d) => loginMutation.mutate(d))} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input type="email" placeholder="your@email.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Password</FormLabel>
                          <button
                            type="button"
                            className="text-xs text-primary hover:underline"
                            onClick={handleShowForgot}
                          >
                            Forgot password?
                          </button>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Input type={showPassword ? "text" : "password"} placeholder="Password" {...field} />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              onClick={() => setShowPassword((s) => !s)}
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                    <LogIn className="w-4 h-4 mr-2" />
                    {loginMutation.isPending ? "Signing in..." : "Sign In"}
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    No account yet?{" "}
                    <button type="button" className="underline hover:text-foreground" onClick={() => setActiveTab("register")}>
                      Create one
                    </button>
                  </p>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="register" className="mt-4">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit((d) => registerMutation.mutate(d))} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl><Input placeholder="Your name" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input type="email" placeholder="your@email.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type={showPassword ? "text" : "password"} placeholder="At least 6 characters" {...field} />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              onClick={() => setShowPassword((s) => !s)}
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div ref={turnstileRef} className={TURNSTILE_SITE_KEY ? "flex justify-center" : "hidden"} />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerMutation.isPending || (!!TURNSTILE_SITE_KEY && !turnstileToken)}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    {registerMutation.isPending ? "Creating account..." : "Create Account"}
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <button type="button" className="underline hover:text-foreground" onClick={() => setActiveTab("login")}>
                      Sign in
                    </button>
                  </p>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
      <CodeConfirmGate
        open={showCodeConfirm}
        email={pendingEmail}
        onSuccess={async (user) => {
          setShowCodeConfirm(false);
          toast({ title: "Account confirmed!", description: `Welcome, ${user.firstName || user.email}!` });
          await handleAuthSuccess(user);
        }}
        onCancel={() => setShowCodeConfirm(false)}
      />
    </Dialog>
  );
}
