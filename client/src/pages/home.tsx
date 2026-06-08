import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useConsumerVerification } from "@/hooks/useConsumerVerification";

import { ImageUpload } from "@/components/image-upload";
import { SwatchPicker } from "@/components/swatch-picker";
import { type ManufacturerForPicker } from "@/components/color-picker";
import { PipelineBrandDialog } from "@/components/pipeline-brand-dialog";
import { OptionsSelector } from "@/components/options-selector";
import { ResultDisplay } from "@/components/result-display";
import { LoadingOverlay } from "@/components/loading-overlay";
import { PaywallModal } from "@/components/paywall-modal";
import { EmailVerificationGate } from "@/components/email-verification-gate";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditDisplay } from "@/components/credit-display";

import type { WrapColor } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AuthModal } from "@/components/auth-modal";
import { TicketDialog } from "@/components/ticket-dialog";

// Empty form schema — anonymous users no longer enter email inline; the
// verification gate (EmailVerificationGate) is the single email-capture
// surface. Authenticated users use the email already on their account.
// Keeping the useForm wiring lets handleSubmit continue to drive the
// render-trigger flow without restructuring the JSX.
const formSchema = z.object({});

type FormData = z.infer<typeof formSchema>;

function WrapUpLogo() {
    const [retry, setRetry] = useState(0);
    return (
          <img
                  src={"/logo-wrapup.svg" + (retry > 0 ? "?r=" + retry : "")}
                  alt="wrap-up"
                  className="h-7 md:h-10 w-auto"
                  onError={() => { if (retry < 5) setTimeout(() => setRetry(r => r + 1), 1500 * (retry + 1)); }}
                width="120" height="40"
                />
        );
}

function RetryImg({ src, alt, className }: { src: string; alt: string; className?: string }) {
    const [retry, setRetry] = useState(0);
    return (
          <img
                  src={src + (retry > 0 ? "?r=" + retry : "")}
                  alt={alt}
                  className={className}
                  onError={() => { if (retry < 5) setTimeout(() => setRetry(r => r + 1), 1500 * (retry + 1)); }}
                />
        );
}

interface CreditStatus {
  isAuthenticated: boolean;
  credits: number;
  freeUsageRemaining: number;
  canGenerate: boolean;
}

export default function Home() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedSwatchId, setSelectedSwatchId] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [resultDesignId, setResultDesignId] = useState<number | undefined>(undefined);
  const [resultColorName, setResultColorName] = useState<string | null>(null);
  const [resultManufacturer, setResultManufacturer] = useState<string | null>(null);
  const [autoEmailQueued, setAutoEmailQueued] = useState<boolean>(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  // Item 0l Session 2 — drives AuthModal's defaultTab so the pipeline-brand
  // dialog can route the user straight to the Register tab. Resets to
  // "login" whenever the modal closes so the next normal "Sign In" click
  // lands on the login tab.
  const [authModalDefaultTab, setAuthModalDefaultTab] = useState<"login" | "register">("login");
  const [showGate, setShowGate] = useState(false);
  // Item 0l Session 2 — pipeline-brand redirect popup state.
  const [pipelineDialog, setPipelineDialog] = useState<{
    open: boolean;
    mode: "pipeline" | "request";
    brandName: string;
  }>({ open: false, mode: "pipeline", brandName: "" });
  const {
    verified: consumerVerified,
    email: consumerEmail,
    isLoading: verificationLoading,
  } = useConsumerVerification();
  // Email used to pre-fill Stripe checkout — auth users from session,
  // anonymous users from the verification hook (only set after verify).
  const checkoutEmail = user?.email || consumerEmail || undefined;
  // Auth schemas
  const loginSchemaAuth = z.object({ email: z.string().email(), password: z.string().min(1) });
  const registerSchemaAuth = z.object({ firstName: z.string().min(1), email: z.string().email(), password: z.string().min(6) });
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [authTab, setAuthTab] = useState<"login"|"register">("login");
  const loginForm = useForm({ resolver: zodResolver(loginSchemaAuth), defaultValues: { email: "", password: "" } });
  const registerForm = useForm({ resolver: zodResolver(registerSchemaAuth), defaultValues: { firstName: "", email: "", password: "" } });
  const handleAuthSuccess = async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/credits/status"] });
    setShowAuthModal(false);
  };
  const loginMutation = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", "/api/login", data); return res.json(); },
    onSuccess: async (u: any) => { toast({ title: "Welcome back!", description: `Signed in as ${u.email}` }); await handleAuthSuccess(); },
    onError: (e: Error) => { toast({ title: "Sign in failed", description: e.message.replace(/^\d+:\s*/, ""), variant: "destructive" }); },
  });
  const registerMutation = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", "/api/register", data); return res.json(); },
    onSuccess: async (u: any) => { toast({ title: "Account created!", description: `Welcome, ${u.firstName || u.email}!` }); await handleAuthSuccess(); },
    onError: (e: Error) => { toast({ title: "Registration failed", description: e.message.replace(/^\d+:\s*/, ""), variant: "destructive" }); },
  });
  const previewRef = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  // Auto-open the pricing paywall when landed with ?pricing=true — used by the
  // partner widget's "Buy Credits" button so visitors land directly on pricing.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('pricing') === 'true') {
      setShowPaywall(true);
    }
  }, []);

  const { data: colors = [], isPending: colorsLoading, isFetching: colorsFetching } = useQuery<WrapColor[]>({
    queryKey: ["/api/colors"],
    retry: 5,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
    staleTime: 1000 * 60 * 5,
    networkMode: "always",
  });

  // Item 0l Session 2 — full manufacturer list for the brand dropdown,
  // including pipeline-status entries (zero colors) and the __request__
  // placeholder. Mirrors the colors-query retry/stale settings.
  const { data: manufacturers = [] } = useQuery<ManufacturerForPicker[]>({
    queryKey: ["/api/manufacturers"],
    retry: 5,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
    staleTime: 1000 * 60 * 5,
    networkMode: "always",
  });

  const { data: creditStatus, refetch: refetchCreditStatus } = useQuery<CreditStatus>({
    queryKey: ["/api/credits/status"],
    queryFn: async () => {
      const response = await fetch("/api/credits/status", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch credit status");
      return response.json();
    },
    staleTime: 1000 * 30,
  });

  // Is this logged-in user a partner? Only ask when authenticated — for
  // anonymous visitors the server would 401 and we'd never show the link
  // anyway. 403 (authed but no partner row) is treated as "no partner".
  const { data: partnerStatus } = useQuery<unknown | null>({
    queryKey: ["/api/partner/status"],
    queryFn: async () => {
      const r = await fetch("/api/partner/status", { credentials: "include" });
      if (r.status === 401 || r.status === 403) return null;
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    },
    enabled: isAuthenticated,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
  const hasPartnerAccount = !!partnerStatus;

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const checkoutStatus = urlParams.get("checkout");

    if (checkoutStatus === "success") {
      toast({
        title: "Payment Successful",
        description: "Credits have been added to your account.",
      });
      refetchCreditStatus();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (checkoutStatus === "cancel") {
      toast({
        title: "Payment Cancelled",
        description: "Your payment was cancelled.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [toast, refetchCreditStatus]);

  const generateMutation = useMutation({
    mutationFn: async (_data: FormData) => {
      if (!uploadedImage || !selectedSwatchId) {
        throw new Error("Please upload a kitchen photo and select a finish");
      }

      const formData = new FormData();
      formData.append("image", uploadedImage);
      formData.append("swatchId", selectedSwatchId);

      // CLONE cost guard — send the shared secret so the server (which fails
      // closed) will run the render. Baked into the client bundle at build
      // time from VITE_KITCHEN_TEST_SECRET; set it to the same value as the
      // server's KITCHEN_TEST_SECRET.
      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: {
          "x-kitchen-secret": import.meta.env.VITE_KITCHEN_TEST_SECRET ?? "",
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Failed to generate design");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setResultImage(data.imageUrl);
      setResultDesignId(data.designId);
      setResultColorName(typeof data.swatchLabel === "string" ? data.swatchLabel : null);
      setResultManufacturer(typeof data.manufacturer === "string" ? data.manufacturer : null);
      setAutoEmailQueued(Boolean(data.autoEmailQueued));
      refetchCreditStatus();

      const tierMessage = data.isPaidGeneration
        ? "High-resolution design ready!"
        : "Preview generated. Sign in and purchase credits for high-res downloads.";

      toast({
        title: "Design Generated!",
        description: tierMessage,
      });
    },
    onError: (error: Error) => {
      if (error.message !== "Free tier limit reached") {
        toast({
          title: "Generation Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const handleImageUpload = useCallback((file: File, previewUrl: string) => {
    setUploadedImage(file);
    setImagePreview(previewUrl);
    setResultImage(null);
  }, []);

  const handleImageRemove = useCallback(() => {
    setUploadedImage(null);
    setImagePreview(null);
    setResultImage(null);
  }, []);

  const handleSwatchSelect = useCallback((swatchId: string) => {
    setSelectedSwatchId(swatchId);
    setResultImage(null);
  }, []);

  const handleOptionsChange = useCallback((options: string[]) => {
    setSelectedOptions(options);
    setResultImage(null);
  }, []);

  const handleReset = useCallback(() => {
    setResultImage(null);
    setResultDesignId(undefined);
  }, []);

  const onSubmit = (data: FormData) => {
    // CLONE — the email/credit/paywall gate is bypassed here (and on the
    // server). Render validation only: fire the generation directly.
    generateMutation.mutate(data);
  };

  const handleGateVerified = () => {
    setShowGate(false);
    // Sunk-cost retrigger: the user clicked Generate, walked through the
    // gate, and verified. Fire the render they originally asked for —
    // generateMutation reads the freshly-cached email directly from
    // React Query so the parent re-render race is not a problem.
    refetchCreditStatus();
    generateMutation.mutate({} as FormData);
  };

  // Privacy consent — single localStorage flag covers all user types.
  // Read at mount-time so initial render stays deterministic.
  const [consented, setConsented] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem("wup_privacy_consent_at")) {
      setConsented(true);
    }
  }, []);
  const recordConsent = useCallback((checked: boolean) => {
    if (!checked) return;
    try {
      window.localStorage.setItem(
        "wup_privacy_consent_at",
        new Date().toISOString(),
      );
    } catch {}
    setConsented(true);
  }, []);

  const canGenerate = uploadedImage && selectedSwatchId;

  if (resultImage) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 border-b bg-background/95">
          <div className="container flex h-16 items-center justify-between gap-2 px-3 md:gap-4 md:px-4 mx-auto max-w-5xl">
            <WrapUpLogo />
            <div className="flex items-center gap-3">
            <CreditDisplay
                credits={creditStatus?.credits || 0}
                freeUsageRemaining={creditStatus?.freeUsageRemaining || 0}
                isAuthenticated={creditStatus?.isAuthenticated || false}
                onBuyCredits={() => setShowPaywall(true)}
                onSignIn={() => setShowAuthModal(true)}
                hasPartnerAccount={hasPartnerAccount}
              />
</div>
          </div>
        </header>
        <main className="container mx-auto max-w-4xl px-4 py-12">
          <ResultDisplay
            imageUrl={resultImage}
            originalImageUrl={imagePreview || undefined}
            designId={resultDesignId}
            colorName={resultColorName ?? undefined}
            manufacturer={resultManufacturer ?? undefined}
            onReset={handleReset}
            credits={creditStatus?.credits || 0}
            freeUsageRemaining={creditStatus?.freeUsageRemaining || 0}
            isAuthenticated={creditStatus?.isAuthenticated || false}
            onBuyCredits={() => setShowPaywall(true)}
            userEmail={user?.email || undefined}
            autoEmailQueued={autoEmailQueued}
          />
        </main>
        <PaywallModal
          open={showPaywall}
          onOpenChange={setShowPaywall}
          userEmail={checkoutEmail}
          isOutOfCredits={(creditStatus?.freeUsageRemaining || 0) === 0 && (creditStatus?.credits || 0) === 0}
        />
        <AuthModal open={showAuthModal} defaultTab={authModalDefaultTab} onOpenChange={(open) => { setShowAuthModal(open); if (!open) { setAuthModalDefaultTab("login"); refetchCreditStatus(); } }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <LoadingOverlay isLoading={generateMutation.isPending} />

      <header className="sticky top-0 z-40 border-b bg-background/95">
        <div className="container flex h-16 items-center justify-between gap-2 px-3 md:gap-4 md:px-4 mx-auto max-w-5xl">
          <WrapUpLogo />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTicketDialogOpen(true)}
              className="hidden sm:inline-flex text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="link-help-header"
            >
              Help
            </button>
            <CreditDisplay
              credits={creditStatus?.credits || 0}
              freeUsageRemaining={creditStatus?.freeUsageRemaining || 0}
              isAuthenticated={creditStatus?.isAuthenticated || false}
              onBuyCredits={() => setShowPaywall(true)}
                onSignIn={() => setShowAuthModal(true)}
                hasPartnerAccount={hasPartnerAccount}
              />
</div>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-8 space-y-12">
        <section className="text-center space-y-4">
                      <RetryImg src="/wrapup ai flow.svg" alt="wrap visualization" className="w-3/4 md:w-1/2 block mx-auto my-6" />
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            See Your Kitchen in Any Finish
          </h1>
          <p className="text-xl font-medium" style={{ color: "#D2D915" }}>
            &ldquo;Preview it, before you renovate it&rdquo;
          </p>
            <p className="text-xs text-muted-foreground mt-2">
              Upload a photo of your kitchen · Choose a cabinet finish · See your remodel come to life with AI-powered visualization
            </p>
          {!creditStatus?.isAuthenticated && (creditStatus?.freeUsageRemaining ?? 0) > 0 && (
            <p className="text-sm text-muted-foreground">
              Try {creditStatus?.freeUsageRemaining} free preview{(creditStatus?.freeUsageRemaining ?? 0) !== 1 ? "s" : ""} with watermark, then upgrade for high-res downloads.
            </p>
          )}
        </section>

        <Card className="p-6 md:p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
              <div className="space-y-2" ref={previewRef}>
                <Label className="text-base font-medium">
                  Step 1: Upload Your Kitchen Photo
                </Label>
                <ImageUpload
                  onImageUpload={handleImageUpload}
                  onImageRemove={handleImageRemove}
                  currentImage={imagePreview}
                />
              </div>

              <div className="space-y-2" ref={step2Ref}>
                <Label className="text-base font-medium">
                  Step 2: Choose Your Finish
                </Label>
                <SwatchPicker
                  selectedSwatchId={selectedSwatchId}
                  onSwatchSelect={handleSwatchSelect}
                />
              </div>

              {!consented && (
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="privacy-consent"
                    checked={consented}
                    onCheckedChange={(checked) => recordConsent(checked === true)}
                    className="mt-1"
                    data-testid="checkbox-privacy-consent"
                  />
                  <Label
                    htmlFor="privacy-consent"
                    className="text-sm font-normal leading-relaxed cursor-pointer"
                  >
                    I have read and agree to the{" "}
                    <Link
                      href="/privacy"
                      className="underline hover:text-foreground"
                      onClick={(e) => e.stopPropagation()}
                      data-testid="link-privacy-consent"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </Label>
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full h-14 text-lg"
                disabled={!canGenerate || !consented || generateMutation.isPending}
                data-testid="button-generate"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                {generateMutation.isPending
                  ? "Generating..."
                  : creditStatus?.isAuthenticated && (creditStatus?.credits ?? 0) > 0
                  ? "Generate HD Design (1 credit)"
                  : "Generate Preview"}
              </Button>

              {!canGenerate && (
                <p className="text-center text-sm text-muted-foreground">
                  {!uploadedImage
                    ? "Please upload a kitchen photo to continue"
                    : "Please select a finish"}
                </p>
              )}
            </form>
          </Form>
        </Card>
      </main>

      <footer className="border-t py-8 mt-12">
        <div className="container mx-auto max-w-4xl px-4 text-center text-sm text-muted-foreground">
          <p className="mb-2">Wrap Up AI - AI-Powered Car Wrap Visualization</p>
          <div className="flex justify-center gap-4">
            <Link href="/terms" className="hover:underline" data-testid="link-terms">Terms and Conditions</Link>
            <span>|</span>
            <Link href="/privacy" className="hover:underline" data-testid="link-privacy">Privacy Policy</Link>
            <span>|</span>
            <button
              type="button"
              onClick={() => setTicketDialogOpen(true)}
              className="hover:underline cursor-pointer"
              data-testid="link-submit-ticket"
            >
              Submit a ticket
            </button>
          </div>
          <p className="mt-4 text-xs leading-relaxed max-w-2xl mx-auto font-light">
            WrapUp is an independent service and is not affiliated with, endorsed by, or sponsored by any of the brands we mention. All brand and product names are trademarks of their respective owners.
          </p>
        </div>
      </footer>

      <PaywallModal
        open={showPaywall}
        onOpenChange={setShowPaywall}
        userEmail={checkoutEmail}
        isOutOfCredits={(creditStatus?.freeUsageRemaining || 0) === 0 && (creditStatus?.credits || 0) === 0}
      />
      <AuthModal open={showAuthModal} defaultTab={authModalDefaultTab} onOpenChange={(open) => { setShowAuthModal(open); if (!open) { setAuthModalDefaultTab("login"); refetchCreditStatus(); } }} />
      <PipelineBrandDialog
        open={pipelineDialog.open}
        mode={pipelineDialog.mode}
        brandName={pipelineDialog.brandName}
        onCancel={() => setPipelineDialog((s) => ({ ...s, open: false }))}
        onSignUp={() => {
          setPipelineDialog((s) => ({ ...s, open: false }));
          setAuthModalDefaultTab("register");
          setShowAuthModal(true);
        }}
      />
      <EmailVerificationGate
        open={showGate}
        onOpenChange={setShowGate}
        onVerified={handleGateVerified}
      />
      <TicketDialog
        open={ticketDialogOpen}
        onOpenChange={setTicketDialogOpen}
        defaultEmail={isAuthenticated && user?.email ? user.email : ""}
      />
    </div>
  );
}
