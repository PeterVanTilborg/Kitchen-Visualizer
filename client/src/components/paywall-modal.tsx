import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  CreditCard,
  Zap,
  Sparkles,
  LogIn,
  Check,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { getFingerprint } from "@/lib/fingerprint";

interface CreditPackage {
  id: string;
  name: string;
  description: string;
  credits: number;
  price: number;
  priceId: string | null;
  savings?: string;
  popular?: boolean;
  plan_type: string;
}

interface SubscriptionStatus {
  hasSubscription: boolean;
  subscriptionId?: string;
  status?: string;
  planId?: string;
  renewsAt?: string;
  creditsPerMonth?: number;
}

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  userEmail?: string;
  isOutOfCredits?: boolean;
}

export function PaywallModal({
  open,
  onOpenChange,
  title,
  description,
  userEmail,
  isOutOfCredits = true,
}: PaywallModalProps) {
  const displayTitle =
    title ||
    (isOutOfCredits ? "You're Out of Free Previews" : "Unlock More Designs");
  const displayDescription =
    description ||
    (isOutOfCredits
      ? "Choose a plan to continue creating stunning car wrap designs in full HD."
      : "Purchase credits or subscribe for high-resolution wrap visualizations.");
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<"monthly" | "credits" | "professionals">("monthly");

  // Fetch packages
  const { data: packagesData, isLoading: packagesLoading } = useQuery<
    CreditPackage[] | { packages: CreditPackage[] }
  >({
    queryKey: ["/api/credit-packages"],
    enabled: open,
  });

  // Fetch subscription status (only for authenticated users)
  const { data: subStatus } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription/status"],
    enabled: open && isAuthenticated,
  });

  const packages = (Array.isArray(packagesData)
    ? packagesData
    : (packagesData as { packages: CreditPackage[] })?.packages || []
  ).filter((p: CreditPackage) => p.plan_type !== 'partner');

  const monthlyPlans = packages.filter((p) => p.plan_type === "subscription");
  const creditPacks = packages.filter((p) => p.plan_type === "plan");
  const topUpPack = packages.find((p) => p.plan_type === "topup");
  const hasSubscription = subStatus?.hasSubscription || false;

  // Find current subscription plan details
  const currentPlan = hasSubscription
    ? monthlyPlans.find((p) => p.id === subStatus?.planId)
    : null;

  const checkoutMutation = useMutation({
    mutationFn: async ({
      priceId,
      credits,
      planType,
      packageId,
    }: {
      priceId: string;
      credits: number;
      planType: string;
      packageId: string;
    }) => {
      const fingerprintId = getFingerprint();

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          priceId,
          credits,
          planType,
          packageId,
          fingerprintId,
          email: userEmail,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to start checkout");
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Checkout Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePurchase = (pkg: CreditPackage) => {
    if (!pkg.priceId) {
      toast({
        title: "Payment Not Available",
        description: "Payment system is being set up. Please try again later.",
        variant: "destructive",
      });
      return;
    }

    checkoutMutation.mutate({
      priceId: pkg.priceId,
      credits: pkg.credits,
      planType: pkg.plan_type,
      packageId: pkg.id,
    });
  };

  // âââ Subscriber View: current plan + top-up + change plan âââ
  const renderSubscriberView = () => {
    const otherPlans = monthlyPlans.filter((p) => p.id !== subStatus?.planId);
    const renewDate = subStatus?.renewsAt
      ? new Date(subStatus.renewsAt).toLocaleDateString()
      : null;

    return (
      <div className="space-y-4">
        {/* Current plan card */}
        <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-primary uppercase tracking-wide">
                Your Plan
              </p>
              <p className="text-lg font-bold mt-1">
                {currentPlan?.name || "Monthly Subscription"}
              </p>
              <p className="text-sm text-muted-foreground">
                {subStatus?.creditsPerMonth} renders/month
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">${currentPlan?.price || 0}</p>
              <p className="text-xs text-muted-foreground">/month</p>
            </div>
          </div>
          {renewDate && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Renews {renewDate}
            </p>
          )}
        </div>

        {/* Top-Up option */}
        {topUpPack && (
          <div className="border rounded-xl p-4 hover:border-primary/50 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <h3 className="font-semibold">{topUpPack.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {topUpPack.credits} extra renders â one-time purchase
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => handlePurchase(topUpPack)}
                disabled={checkoutMutation.isPending}
              >
                <CreditCard className="w-4 h-4 mr-1" />
                ${topUpPack.price}
              </Button>
            </div>
          </div>
        )}

        {/* Upgrade / Downgrade */}
        {otherPlans.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Change Plan
            </p>
            <div className="space-y-2">
              {otherPlans.map((plan) => {
                const isUpgrade =
                  plan.credits > (currentPlan?.credits || 0);
                return (
                  <div
                    key={plan.id}
                    className="border rounded-xl p-4 hover:border-primary/50 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isUpgrade ? (
                          <ArrowUpCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <ArrowDownCircle className="w-5 h-5 text-orange-500" />
                        )}
                        <div>
                          <h3 className="font-semibold">{plan.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {plan.credits} renders/month
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={isUpgrade ? "default" : "outline"}
                        onClick={() => handlePurchase(plan)}
                        disabled={checkoutMutation.isPending}
                      >
                        ${plan.price}/mo
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // âââ Non-subscriber View: toggle between Monthly and Credit Packs âââ
  const renderProfessionalsTab = () => (
    <div className="space-y-5">
      {/* Header */}
      <div className="text-center">
        <h3 className="font-bold text-lg">For Wrap Shops</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Embed WrapUp AI on your website. Your customers visualize wraps — you get real leads. Instant embed code, live in 5 minutes.
        </p>
      </div>

      {/* Two plan cards side by side */}
      <div className="grid grid-cols-2 gap-3">
        {/* Monthly Plan */}
        <div className="relative border rounded-xl p-4 border-border hover:border-primary/50 transition-all">
          <h3 className="font-semibold text-base">Monthly Plan</h3>
          <div className="text-2xl font-bold mt-2">$199</div>
          <div className="text-xs text-muted-foreground">/month</div>
          <ul className="text-xs text-muted-foreground mt-3 space-y-1.5">
            <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-primary shrink-0" /> 150 renders/month</li>
            <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-primary shrink-0" /> Auto top-up ($25 / 40 renders)</li>
          </ul>
          <Button className="w-full mt-4" size="sm" onClick={() => (window.location.href = "/partner/signup")}>
            Get Started
          </Button>
        </div>

        {/* Annual Plan */}
        <div className="relative border-2 rounded-xl p-4 transition-all" style={{ borderColor: "#D2D915" }}>
          <Badge
            className="absolute -top-2.5 left-3 text-xs font-bold px-2 py-0.5"
            style={{ backgroundColor: "#D2D915", color: "#000" }}
          >
            Best Value
          </Badge>
          <h3 className="font-semibold text-base mt-1">Annual Plan</h3>
          <div className="text-2xl font-bold mt-2">$1,990</div>
          <div className="text-xs text-muted-foreground">/year</div>
          <ul className="text-xs text-muted-foreground mt-3 space-y-1.5">
            <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-primary shrink-0" /> 150 renders/month</li>
            <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-primary shrink-0" /> 2 months free vs monthly</li>
            <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-primary shrink-0" /> Auto top-up available</li>
          </ul>
          <Button
            className="w-full mt-4 font-semibold"
            size="sm"
            onClick={() => (window.location.href = "/partner/signup?plan=annual")}
            style={{ backgroundColor: "#D2D915", color: "#000" }}
          >
            Get Started
          </Button>
        </div>
      </div>

      {/* Small print */}
      <p className="text-xs text-center text-muted-foreground">
        You will set up your website URL and receive your personal embed code instantly after payment.
      </p>
    </div>
  );

    const renderNonSubscriberView = () => (
    <div className="space-y-0">
      {/* Booklet tabs */}
      <div className="flex items-end gap-1 relative z-10">
        <button
          className={`flex-1 text-sm transition-all ${
            activeTab === "monthly"
              ? "bg-[#D2D915] text-black font-semibold shadow-[0_-2px_6px_rgba(0,0,0,0.08)] rounded-t-lg rounded-b-none border border-[#D2D915] border-b-0 py-2.5 px-4 -mb-px relative z-20"
              : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground rounded-t-md rounded-b-none border border-border py-2 px-4 relative z-0"
          }`}
          onClick={() => setActiveTab("monthly")}
        >
          Monthly Plans
        </button>
        <button
          className={`flex-1 text-sm transition-all ${
            activeTab === "credits"
              ? "bg-[#D2D915] text-black font-semibold shadow-[0_-2px_6px_rgba(0,0,0,0.08)] rounded-t-lg rounded-b-none border border-[#D2D915] border-b-0 py-2.5 px-4 -mb-px relative z-20"
              : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground rounded-t-md rounded-b-none border border-border py-2 px-4 relative z-0"
          }`}
          onClick={() => setActiveTab("credits")}
        >
          Credit Packs
        </button>
        <button
          className={`flex-1 text-sm transition-all ${
            activeTab === "professionals"
              ? "bg-[#D2D915] text-black font-semibold shadow-[0_-2px_6px_rgba(0,0,0,0.08)] rounded-t-lg rounded-b-none border border-[#D2D915] border-b-0 py-2.5 px-4 -mb-px relative z-20"
              : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground rounded-t-md rounded-b-none border border-border py-2 px-4 relative z-0"
          }`}
          onClick={() => setActiveTab("professionals")}
        >
          For Professionals
        </button>
      </div>

      {/* Content panel */}
      <div className="rounded-xl border bg-muted/50 p-4 space-y-4 relative">
        {/* Package cards */}
        <div className="space-y-3">
        {(activeTab === "monthly" ? monthlyPlans : activeTab === "credits" ? creditPacks : []).map((pkg) => (
          <div
            key={pkg.id}
            className={`relative border rounded-xl p-4 transition-all hover:border-primary/50 ${
              pkg.popular
                ? "ring-2 ring-primary border-primary/30"
                : "border-border"
            }`}
          >
            {pkg.popular && (
              <Badge className="absolute -top-2.5 left-4 bg-primary text-primary-foreground">
                {activeTab === "monthly" ? "Most Popular" : "Best Value"}
              </Badge>
            )}

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-base">{pkg.name}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {pkg.credits}{" "}
                  {activeTab === "monthly" ? "renders/month" : "renders"}
                </p>
                {pkg.savings && (
                  <Badge variant="secondary" className="mt-1.5 text-xs">
                    {pkg.savings}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-2xl font-bold">${pkg.price}</div>
                  {activeTab === "monthly" && (
                    <div className="text-xs text-muted-foreground">/month</div>
                  )}
                  {activeTab === "credits" && (
                    <div className="text-xs text-muted-foreground">
                      ${pkg.credits > 0 ? (pkg.price / pkg.credits).toFixed(2) : "â"}/render
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => handlePurchase(pkg)}
                  disabled={checkoutMutation.isPending}
                >
                  <CreditCard className="w-4 h-4 mr-1" />
                  {checkoutMutation.isPending ? "..." : "Buy"}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {activeTab === "monthly" && (
        <p className="text-xs text-center text-muted-foreground">
          Cancel anytime. Credits renew each month.
        </p>
      )}
      {activeTab === "professionals" && renderProfessionalsTab()}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5 text-primary" />
            {displayTitle}
          </DialogTitle>
          <DialogDescription className="text-base">
            {displayDescription}
          </DialogDescription>
        </DialogHeader>

        {/* Benefits for first-time visitors */}
        {isOutOfCredits && !hasSubscription && (
          <div className="bg-primary/5 rounded-lg p-4 space-y-2">
            <p className="font-medium text-sm">What you get:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary shrink-0" />
                Full HD resolution (2048x1536)
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary shrink-0" />
                No watermarks on your designs
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary shrink-0" />
                Credits never expire
              </li>
            </ul>
          </div>
        )}

        <div className="py-2">
          {!isAuthenticated ? (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <LogIn className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium mb-2">Sign in to Purchase</p>
                <p className="text-sm text-muted-foreground mb-4">
                  You need an account to purchase credits and access your
                  high-resolution designs.
                </p>
                <Button
                  className="w-full"
                  onClick={() => (window.location.href = "/auth")}
                  data-testid="button-login-to-purchase"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In to Continue
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Quick sign-in with Google, GitHub, or email.
              </p>
            </div>
          ) : packagesLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading packages...
            </div>
          ) : hasSubscription ? (
            renderSubscriberView()
          ) : (
            renderNonSubscriberView()
          )}
        </div>

        <div className="text-center border-t pt-3">
          <p className="text-xs text-muted-foreground">
            Secure payment powered by Stripe
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
