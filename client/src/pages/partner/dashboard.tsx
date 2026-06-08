import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Loader2, Copy, Check, AlertCircle, ExternalLink } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PartnerStatus {
  id: number;
  businessName: string;
  allowedDomain: string;
  embedToken: string;
  subscriptionStatus: string;
  creditsRemaining: number;
  creditsPerMonth: number;
  selectedBrands: string[];
  freeRenderLimit?: number;
  quoteFormUrl?: string | null;
  logoUrl?: string | null;
  contactEmail?: string | null;
  cancelAtPeriodEnd?: boolean;
  cancelsAt?: string | null;
}

interface PartnerRender {
  customer_email: string;
  color_name: string;
  created_at: string;
}
interface WidgetCustomer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  verified: boolean;
  render_count: number;
  created_at: string;
}

function statusBadge(status: string) {
  if (status === "active") return <Badge className="bg-green-600/20 text-green-400 border-green-600/30">Active</Badge>;
  if (status === "past_due") return <Badge variant="destructive">Past Due</Badge>;
  if (status === "cancelled") return <Badge variant="secondary">Cancelled</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}

export default function PartnerDashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [brandsSaving, setBrandsSaving] = useState(false)
  const [frlInput, setFrlInput] = useState<number>(3)
  const [frlSaving, setFrlSaving] = useState(false);
  const [qfuInput, setQfuInput] = useState<string>("");
  const [qfuSaving, setQfuSaving] = useState(false);
  const [ceInput, setCeInput] = useState<string>("");
  const [ceSaving, setCeSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoClearing, setLogoClearing] = useState(false);

  // Check auth — redirect if not logged in
  // Fetch partner status — 401 = not logged in, 403 = no partner record
  const { data: status, isLoading: statusLoading, error: statusError } = useQuery<PartnerStatus>({
    queryKey: ["/api/partner/status"],
    queryFn: async () => {
      const res = await fetch("/api/partner/status", { credentials: "include" });
      if (!res.ok) {
        throw Object.assign(new Error("Request failed"), { status: res.status });
      }
      return res.json() as Promise<PartnerStatus>;
    },
    retry: false,
  });

  // Fetch render history once authenticated
  const { data: renders, isLoading: rendersLoading } = useQuery<PartnerRender[]>({
    queryKey: ["/api/partner/renders"],
    enabled: !!status,
    retry: false,
  });

  const { data: customers, isLoading: customersLoading } = useQuery<WidgetCustomer[]>({
    queryKey: ["/api/partner/customers"],
    enabled: !!status,
    retry: false,
  });

    // Fetch available brands
  useEffect(() => {
    fetch("/api/partner/brands-list")
      .then(r => r.json())
      .then(setAvailableBrands)
      .catch(() => {});
  }, []);

  // Sync selectedBrands from status once loaded
  useEffect(() => {
    if (status?.selectedBrands) setSelectedBrands(status.selectedBrands);
  }, [status]);

  // Sync quoteFormUrl input from status
  useEffect(() => {
    if (status) setQfuInput(status.quoteFormUrl || "");
  }, [status]);

  // Sync contactEmail input from status
  useEffect(() => {
    if (status) setCeInput(status.contactEmail || "");
  }, [status]);

  // Redirect based on HTTP status from partner status endpoint
  useEffect(() => {
    if (statusLoading || !statusError) return;
    const code = (statusError as any)?.status;
    if (code === 403) navigate("/partner/signup");
    else navigate("/auth"); // 401 or other = not authenticated
  }, [statusLoading, statusError, navigate]);

  const saveBrandsMutation = useMutation({
    mutationFn: async (brands: string[]) => {
      const res = await apiRequest("PUT", "/api/partner/brands", { brands });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/status"] });
      toast({ title: "Brands updated", description: "Your embed will now show the selected brands." });
    },
    onError: () => {
      toast({ title: "Failed to update brands", variant: "destructive" });
    },
  });

  const resumeCheckoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/partner/resume-checkout");
      return res.json() as Promise<{ url?: string }>;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      toast({
        title: "Unable to start checkout",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    },
    onError: () => {
      toast({
        title: "Unable to start checkout",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    },
  });

  const billingPortalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/partner/billing-portal");
      return res.json() as Promise<{ url?: string }>;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      toast({
        title: "Unable to open billing portal",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    },
    onError: () => {
      toast({
        title: "Unable to open billing portal",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    },
  });

  if (statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // statusError redirect is handled by useEffect above; return null while navigating
  if (statusError || !status) return null;

    // The <noscript> fallback gives non-JS crawlers (Bing, Yandex, Ahrefs,
    // Moz, SEMrush) a static-HTML view of the WRAP-UP.AI backlink. Human
    // visitors never see it because JS is enabled and the widget renders
    // its own footer.
    const embedCode = `<!-- Paste this code where you want the WrapUp AI widget to appear -->\n<div id="wrapup-widget"></div>\n<script src="https://www.wrap-up.ai/widget.js" data-token="${status.embedToken}" data-mode="inline"></script>\n<noscript><a href="https://www.wrap-up.ai" target="_blank" rel="noopener">Powered by WRAP-UP.AI</a></noscript>`;
    const isPending = status.subscriptionStatus === "pending";

  function copyEmbed() {
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function toggleBrand(brand: string) {
    setSelectedBrands(prev =>
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <img src="/logo-wrapup.svg" alt="WrapUp AI" className="h-7 shrink-0" />
          <Button variant="outline" size="sm" onClick={() => navigate("/")}>Back to app</Button>
        </div>
      </header>
        {status.subscriptionStatus === "pending" && (
          <div className="max-w-4xl mx-auto px-4 pt-6">
            <Alert className="border-yellow-500/50 bg-yellow-500/10">
              <AlertCircle className="h-4 w-4 !text-yellow-400" />
              <AlertTitle className="text-yellow-200">Complete your payment to activate</AlertTitle>
              <AlertDescription className="text-yellow-100/90">
                <p className="mb-2">
                  Your partner account is pending payment. Complete checkout to activate your widget.
                </p>
                <p className="text-xs text-yellow-100/70 mb-3">
                  This will activate your $199/month subscription.
                </p>
                <Button
                  onClick={() => resumeCheckoutMutation.mutate()}
                  disabled={resumeCheckoutMutation.isPending}
                  className="bg-yellow-500 hover:bg-yellow-400 text-yellow-950 font-semibold"
                >
                  {resumeCheckoutMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting checkout...
                    </>
                  ) : (
                    "Complete payment"
                  )}
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}
        {/* Welcome message */}
        <div className="max-w-4xl mx-auto px-4 pt-6 pb-2">
          <h1 className="text-2xl font-semibold">Welcome, {status.businessName}</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your WrapUp AI embed widget and account settings.</p>
        </div>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Status overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5">
              <div className="text-xs text-muted-foreground mb-1">Subscription</div>
              <div className="flex items-center gap-2">{statusBadge(status.subscriptionStatus)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="text-xs text-muted-foreground mb-1">Credits remaining</div>
              <div className="text-2xl font-bold">{status.creditsRemaining}</div>
              <div className="text-xs text-muted-foreground">of {status.creditsPerMonth}/month</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="text-xs text-muted-foreground mb-1">Registered domain</div>
              <div className="flex items-center gap-1.5 text-sm font-medium truncate">
                <a href={status.allowedDomain} target="_blank" rel="noopener"
                   className="hover:underline text-[#d2d915] truncate flex items-center gap-1">
                  {status.allowedDomain}
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subscription management — only render for active partners */}
        {status.subscriptionStatus === "active" && (
          <Card>
            <CardHeader>
              <CardTitle>Manage subscription</CardTitle>
              <CardDescription>
                Manage billing, invoices, or cancel your subscription at any time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {status.cancelAtPeriodEnd && (
                <Alert className="mb-4 border-yellow-500/50 bg-yellow-500/10">
                  <AlertCircle className="h-4 w-4 !text-yellow-400" />
                  <AlertTitle className="text-yellow-200">
                    Subscription will end on {status.cancelsAt
                      ? new Date(status.cancelsAt).toLocaleDateString()
                      : "end of current billing period"}
                  </AlertTitle>
                  <AlertDescription className="text-yellow-100/90">
                    You'll keep full access until then. Open the billing portal to renew if you change your mind.
                  </AlertDescription>
                </Alert>
              )}
              <Button
                onClick={() => billingPortalMutation.mutate()}
                disabled={billingPortalMutation.isPending}
              >
                {billingPortalMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Opening portal...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Manage subscription
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Embed code */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your embed code</CardTitle>
            <CardDescription>
              Paste this into any page on <strong>{status.allowedDomain}</strong>. The embed will not load on any other domain.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="bg-muted rounded-md p-4 text-xs overflow-x-auto text-muted-foreground leading-relaxed">
                {embedCode}
              </pre>
              <Button
                size="sm"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={copyEmbed}
                disabled={isPending}
              >
                {copied ? <><Check className="w-3.5 h-3.5 mr-1" />Copied!</> : <><Copy className="w-3.5 h-3.5 mr-1" />Copy</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Brand selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Brands shown in your embed</CardTitle>
            <CardDescription>
              Select which wrap brands to display. Leave all unchecked to show all brands.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {availableBrands.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />Loading brands…
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4 max-h-52 overflow-y-auto">
                  {availableBrands.map(brand => (
                    <label key={brand} className="flex items-center gap-2 cursor-pointer text-sm hover:text-foreground">
                      <Checkbox
                        checked={selectedBrands.includes(brand)}
                        onCheckedChange={() => toggleBrand(brand)}
                        disabled={isPending || saveBrandsMutation.isPending}
                      />
                      <span>{brand}</span>
                    </label>
                  ))}
                </div>
                <Button
                  size="sm"
                  onClick={() => saveBrandsMutation.mutate(selectedBrands)}
                  disabled={isPending || saveBrandsMutation.isPending}
                >
                  {saveBrandsMutation.isPending ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</> : "Save brands"}
                </Button>
                {selectedBrands.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-2">All brands will be shown.</p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Render history */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Render history</CardTitle>
            <CardDescription>Wrap previews generated through your embed.</CardDescription>
          </CardHeader>
          <CardContent>
            {rendersLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />Loading…
              </div>
            ) : !renders?.length ? (
              <p className="text-sm text-muted-foreground">No renders yet. Share your embed code to get started.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-xs">
                      <th className="text-left pb-2 font-medium">Customer email</th>
                      <th className="text-left pb-2 font-medium">Colour</th>
                      <th className="text-left pb-2 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renders.map((r, i) => (
                      <tr key={i} className="border-b border-border/50 last:border-0">
                        <td className="py-2 pr-4 text-muted-foreground">{r.customer_email || "—"}</td>
                        <td className="py-2 pr-4">{r.color_name || "—"}</td>
                        <td className="py-2 text-muted-foreground">
                          {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

      
        {/* Free Render Limit */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Free visualisations per visitor</CardTitle>
            <CardDescription>
              How many free AI renders each site visitor gets before seeing the paywall. Set to 0 to always require contact.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                max={100}
                value={frlInput}
                onChange={(e) => setFrlInput(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                disabled={isPending}
                className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button
                size="sm"
                disabled={isPending || frlSaving}
                onClick={async () => {
                  setFrlSaving(true)
                  try {
                    const res = await apiRequest("PUT", "/api/partner/free-render-limit", { freeRenderLimit: frlInput })
                    if (res.ok) {
                      queryClient.invalidateQueries({ queryKey: ["/api/partner/status"] })
                      toast({ title: "Saved", description: `Visitors get ${frlInput} free render${frlInput === 1 ? "" : "s"}.` })
                    } else {
                      toast({ title: "Error", description: "Could not save limit.", variant: "destructive" })
                    }
                  } finally {
                    setFrlSaving(false)
                  }
                }}
              >
                {frlSaving ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Savingâ¦</> : "Save"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Current limit: <strong>{status.freeRenderLimit ?? 3}</strong> free render{(status.freeRenderLimit ?? 3) === 1 ? "" : "s"} per visitor</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Partner Logo</CardTitle>
            <CardDescription>
              Upload your brand logo and it will replace the WRAP-UP.AI watermark on every widget render. PNG with transparency recommended; we resize to 1600px wide max. Leave empty to use the default watermark.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 flex-wrap">
              {status.logoUrl ? (
                <img src={status.logoUrl} alt="Partner logo" className="h-16 w-auto max-w-[240px] bg-[#1a1a1a] rounded border border-border object-contain p-2" />
              ) : (
                <div className="h-16 w-40 rounded border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">No logo uploaded</div>
              )}
              <div className="flex items-center gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    disabled={isPending}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setLogoUploading(true);
                      try {
                        const fd = new FormData();
                        fd.append("logo", file);
                        const res = await fetch("/api/partner/logo", { method: "POST", credentials: "include", body: fd });
                        if (res.ok) {
                          queryClient.invalidateQueries({ queryKey: ["/api/partner/status"] });
                          toast({ title: "Saved", description: "Logo uploaded — new widget renders will use it as watermark." });
                        } else {
                          const body = await res.json().catch(() => ({}));
                          toast({ title: "Error", description: body.message || "Upload failed.", variant: "destructive" });
                        }
                      } finally {
                        setLogoUploading(false);
                        (e.target as HTMLInputElement).value = "";
                      }
                    }}
                  />
                  <Button size="sm" asChild disabled={isPending || logoUploading}>
                    <span>{logoUploading ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Uploading</> : (status.logoUrl ? "Replace Logo" : "Upload Logo")}</span>
                  </Button>
                </label>
                {status.logoUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending || logoClearing}
                    onClick={async () => {
                      setLogoClearing(true);
                      try {
                        const res = await fetch("/api/partner/logo", { method: "DELETE", credentials: "include" });
                        if (res.ok) {
                          queryClient.invalidateQueries({ queryKey: ["/api/partner/status"] });
                          toast({ title: "Removed", description: "Logo cleared — widget renders now use the WRAP-UP.AI watermark." });
                        } else {
                          toast({ title: "Error", description: "Could not remove logo.", variant: "destructive" });
                        }
                      } finally {
                        setLogoClearing(false);
                      }
                    }}
                  >
                    {logoClearing ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Removing</> : "Remove"}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quote Form URL</CardTitle>
            <CardDescription>
              When a visitor runs out of free renders, the widget paywall shows a "Get a Quote" button linking to this URL. Leave empty to hide the button.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <input
                type="url"
                placeholder="https://yourshop.example/quote"
                value={qfuInput}
                onChange={(e) => setQfuInput(e.target.value)}
                disabled={isPending}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button
                size="sm"
                disabled={isPending || qfuSaving}
                onClick={async () => {
                  setQfuSaving(true);
                  try {
                    const res = await apiRequest("PUT", "/api/partner/quote-form-url", { quoteFormUrl: qfuInput.trim() });
                    if (res.ok) {
                      queryClient.invalidateQueries({ queryKey: ["/api/partner/status"] });
                      toast({ title: "Saved", description: qfuInput.trim() ? "Quote form URL updated." : "Quote form URL cleared." });
                    } else {
                      const body = await res.json().catch(() => ({}));
                      toast({ title: "Error", description: body.message || "Could not save URL.", variant: "destructive" });
                    }
                  } finally {
                    setQfuSaving(false);
                  }
                }}
              >
                {qfuSaving ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Saving</> : "Save"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Current: {status.quoteFormUrl ? <a href={status.quoteFormUrl} target="_blank" rel="noopener noreferrer" className="underline">{status.quoteFormUrl}</a> : <em>not set</em>}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Email</CardTitle>
            <CardDescription>
              Shown below every free widget render as a "Contact {status.businessName}" button (mailto: link). Leave empty to hide the button.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <input
                type="email"
                placeholder="contact@yourbusiness.com"
                value={ceInput}
                onChange={(e) => setCeInput(e.target.value)}
                disabled={isPending}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button
                size="sm"
                disabled={isPending || ceSaving}
                onClick={async () => {
                  setCeSaving(true);
                  try {
                    const res = await apiRequest("PUT", "/api/partner/contact-email", { contactEmail: ceInput.trim() });
                    if (res.ok) {
                      queryClient.invalidateQueries({ queryKey: ["/api/partner/status"] });
                      toast({ title: "Saved", description: ceInput.trim() ? "Contact email updated." : "Contact email cleared." });
                    } else {
                      const body = await res.json().catch(() => ({}));
                      toast({ title: "Error", description: body.message || "Could not save email.", variant: "destructive" });
                    }
                  } finally {
                    setCeSaving(false);
                  }
                }}
              >
                {ceSaving ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Saving</> : "Save"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Current: {status.contactEmail ? <a href={`mailto:${status.contactEmail}`} className="underline">{status.contactEmail}</a> : <em>not set</em>}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Widget Visitors</CardTitle>
            <CardDescription>Customers who verified their email through your widget</CardDescription>
          </CardHeader>
          <CardContent>
            {customersLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : !customers || customers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No verified visitors yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium">Name</th>
                      <th className="text-left py-2 pr-4 font-medium">Email</th>
                      <th className="text-left py-2 pr-4 font-medium">Phone</th>
                      <th className="text-left py-2 pr-4 font-medium">Verified</th>
                      <th className="text-left py-2 pr-4 font-medium">Renders</th>
                      <th className="text-left py-2 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c) => (
                      <tr key={c.id} className="border-b last:border-0">
                        <td className="py-2 pr-4">{c.name}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{c.email}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{c.phone ?? "—"}</td>
                        <td className="py-2 pr-4">{c.verified ? <Badge>Yes</Badge> : <Badge variant="outline">No</Badge>}</td>
                        <td className="py-2 pr-4">{c.render_count}</td>
                        <td className="py-2 text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

</main>
    </div>
  );
}
