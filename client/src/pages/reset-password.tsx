import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";
import { Eye, EyeOff, KeyRound, CheckCircle2, Car, Mail, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const resetSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetData = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
  const { toast } = useToast();

  // Read token and email from URL query params
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || "";
  const email = params.get("email") || "";

  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resetEmail, setResetEmail] = useState(email);
  const [requestSent, setRequestSent] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState("");

  const form = useForm<ResetData>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const resetMutation = useMutation({
    mutationFn: async (data: ResetData) => {
      const res = await apiRequest("POST", "/api/reset-password", {
        token,
        password: data.password,
      });
      return res.json();
    },
    onSuccess: () => {
      setSuccess(true);
      toast({ title: "Password reset!", description: "You can now sign in with your new password." });
    },
    onError: (error: Error) => {
      toast({
        title: "Reset failed",
        description: error.message.replace(/^\d+:\s*/, ""),
        variant: "destructive",
      });
    },
  });

  if (!token) {
    const handleForgotPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      setRequestLoading(true);
      setRequestError("");
      try {
        const res = await fetch("/api/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: resetEmail }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        setRequestSent(true);
      } catch (err: any) {
        setRequestError(err.message || "Failed to send reset request");
      } finally {
        setRequestLoading(false);
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <Card className="w-full max-w-md p-8 bg-slate-800/50 border-slate-700">
          {requestSent ? (
            <div className="text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto" />
              <h2 className="text-2xl font-bold text-white">Check Your Email</h2>
              <p className="text-slate-300">
                If an account exists with that email, we've sent a password reset link. Please check your inbox.
              </p>
              <Link href="/auth">
                <Button variant="outline" className="mt-4 border-slate-600 text-slate-300 hover:bg-slate-700">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <Mail className="w-12 h-12 text-blue-400 mx-auto" />
                <h2 className="text-2xl font-bold text-white">Forgot Password</h2>
                <p className="text-slate-400">Enter your email address and we'll send you a reset link.</p>
              </div>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="resetEmail" className="text-sm font-medium text-slate-300">Email</label>
                  <Input
                    id="resetEmail"
                    type="email"
                    placeholder="Enter your email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />
                </div>
                {requestError && (
                  <p className="text-sm text-red-400">{requestError}</p>
                )}
                <Button type="submit" className="w-full" disabled={requestLoading}>
                  {requestLoading ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
              <div className="text-center">
                <Link href="/auth">
                  <span className="text-sm text-slate-400 hover:text-white cursor-pointer">
                    <ArrowLeft className="w-3 h-3 inline mr-1" />
                    Back to Login
                  </span>
                </Link>
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md p-8 text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 mx-auto text-green-500" />
          <h1 className="text-xl font-semibold">Password Reset Successful</h1>
          <p className="text-sm text-muted-foreground">
            Your password has been updated. You can now sign in with your new password.
          </p>
          <Link href="/">
            <Button className="w-full">Go to Wrap Up AI</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center gap-2 px-4 mx-auto max-w-5xl">
          <Car className="w-6 h-6" />
          <span className="font-semibold text-lg">Wrap Up AI</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md p-8 space-y-6">
          <div className="text-center space-y-2">
            <KeyRound className="w-10 h-10 mx-auto text-primary" />
            <h1 className="text-2xl font-semibold">Set New Password</h1>
            <p className="text-sm text-muted-foreground">
              Enter a new password for <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => resetMutation.mutate(d))} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="At least 6 characters"
                          {...field}
                        />
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
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type={showPassword ? "text" : "password"} placeholder="Repeat your password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={resetMutation.isPending}>
                <KeyRound className="w-4 h-4 mr-2" />
                {resetMutation.isPending ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          </Form>
        </Card>
      </main>
    </div>
  );
}
