import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BeforeAfterSlider } from "@/components/before-after-slider";
import { useToast } from "@/hooks/use-toast";
import { formatCents } from "@/lib/format";
import {
  User, CreditCard, BarChart3, Image, FileText, Settings, ArrowLeft,
  Camera, Save, ExternalLink, Download, Calendar, Package, Star, AlertCircle,
  DollarSign, Clock, Wallet, Copy, Check
} from "lucide-react";

type Section = "profile" | "billing" | "usage" | "designs" | "invoices" | "ambassador";

async function apiRequest(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...options,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(data.message || "Request failed");
  }
  return res.json();
}

export default function AccountPage() {
  const [section, setSection] = useState<Section>(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab === "ambassador") return "ambassador";
    return "profile";
  });
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["/api/account/profile"],
    queryFn: () => apiRequest("/api/account/profile"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        <p className="text-muted-foreground">Please sign in to access your account.</p>
        <Button onClick={() => navigate("/")}>Go Home</Button>
      </div>
    );
  }

  const sidebarItems = [
    { id: "profile" as Section, label: "Profile & Contact", icon: User },
    { id: "billing" as Section, label: "Plan & Billing", icon: CreditCard },
    { id: "usage" as Section, label: "Usage Stats", icon: BarChart3 },
    { id: "designs" as Section, label: "My Designs", icon: Image },
    { id: "invoices" as Section, label: "Invoice Settings", icon: FileText },
    { id: "ambassador" as Section, label: "Ambassador", icon: Star },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <h1 className="text-xl font-semibold">My Account</h1>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row gap-6">
        <aside className="w-full md:w-64 shrink-0">
          <Card>
            <CardContent className="p-2">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                    section === item.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </CardContent>
          </Card>
        </aside>
        <main className="flex-1 min-w-0">
          {section === "profile" && <ProfileSection profile={profile} />}
          {section === "billing" && <BillingSection profile={profile} />}
          {section === "usage" && <UsageSection />}
          {section === "designs" && <DesignsSection />}
          {section === "invoices" && <InvoiceSection profile={profile} />}
            {section === "ambassador" && <AmbassadorSection />}
        </main>
      </div>
    </div>
  );
}

// ── Profile & Contact Section ────────────────────────────
function ProfileSection({ profile }: { profile: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState(profile.firstName || "");
  const [lastName, setLastName] = useState(profile.lastName || "");
  const [email, setEmail] = useState(profile.email || "");
  const [newPassword, setNewPassword] = useState("");

  const profileMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/account/profile", { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/account/profile"] });
      toast({ title: "Profile updated" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const passwordMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/account/password", { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      setNewPassword("");
      toast({ title: "Password changed successfully" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const photoMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/account/profile-photo", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/account/profile"] });
      toast({ title: "Photo updated" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      photoMutation.mutate({ imageData: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Manage your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              {profile.profileImageUrl ? (
                <img src={profile.profileImageUrl} alt="Profile" className="w-20 h-20 rounded-full object-cover border" width="80" height="80" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border">
                  <User className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <label className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1 cursor-pointer hover:bg-primary/90">
                <Camera className="h-3 w-3" />
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>
            <div>
              <p className="font-medium">{profile.firstName} {profile.lastName}</p>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              <p className="text-xs text-muted-foreground">Member since {new Date(profile.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <div>
              <Label>First Name</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <Label>Last Name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            </div>
          </div>
          <Button onClick={() => profileMutation.mutate({ firstName, lastName, email })} disabled={profileMutation.isPending}>
            <Save className="h-4 w-4 mr-2" /> Save Changes
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>New Password</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" />
          </div>
          <Button onClick={() => passwordMutation.mutate({ newPassword })} disabled={passwordMutation.isPending || newPassword.length < 6}>
            Update Password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Billing Section ──────────────────────────────────────
function BillingSection({ profile }: { profile: any }) {
  const { toast } = useToast();

  const portalMutation = useMutation({
    mutationFn: () => apiRequest("/api/account/billing-portal", { method: "POST" }),
    onSuccess: (data) => { window.open(data.url, "_blank"); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/account/usage-stats"],
    queryFn: () => apiRequest("/api/account/usage-stats"),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Plan & Credits</CardTitle>
          <CardDescription>Your current subscription and credit balance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-muted rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-primary">{profile.credits}</p>
              <p className="text-sm text-muted-foreground">Credits Remaining</p>
            </div>
            <div className="bg-muted rounded-lg p-4 text-center">
              <p className="text-lg font-semibold capitalize">{stats?.subscriptionStatus || "No subscription"}</p>
              <p className="text-sm text-muted-foreground">Subscription Status</p>
            </div>
            <div className="bg-muted rounded-lg p-4 text-center">
              <p className="text-lg font-semibold">{stats?.subscriptionCreditsTotal || 0}</p>
              <p className="text-sm text-muted-foreground">Monthly Credits</p>
            </div>
          </div>
          {stats?.subscriptionResetDate && (
            <p className="text-sm text-muted-foreground mt-3">
              <Calendar className="h-3 w-3 inline mr-1" />
              Credits reset on {new Date(stats.subscriptionResetDate).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Manage Billing</CardTitle>
          <CardDescription>Update payment methods, view invoices, and manage your subscription via Stripe</CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.cancelAtPeriodEnd && stats?.subscriptionStatus === "active" && (
            <Alert className="mb-4 border-yellow-500/50 bg-yellow-500/10">
              <AlertCircle className="h-4 w-4 !text-yellow-400" />
              <AlertTitle className="text-yellow-200">
                Subscription will end on {stats?.cancelsAt
                  ? new Date(stats.cancelsAt).toLocaleDateString()
                  : "end of current billing period"}
              </AlertTitle>
              <AlertDescription className="text-yellow-100/90">
                You'll keep full access until then. Open the billing portal to renew if you change your mind.
              </AlertDescription>
            </Alert>
          )}
          <Button onClick={() => portalMutation.mutate()} disabled={portalMutation.isPending}>
            <ExternalLink className="h-4 w-4 mr-2" />
            {portalMutation.isPending ? "Opening..." : "Manage subscription"}
          </Button>
          {!profile.stripeCustomerId && (
            <p className="text-sm text-muted-foreground mt-2">You need to make a purchase before you can access the billing portal.</p>
          )}
        </CardContent>
      </Card>
      <PurchaseHistory />
    </div>
  );
}

function PurchaseHistory() {
  const { data: purchases, isLoading } = useQuery({
    queryKey: ["/api/account/purchases"],
    queryFn: () => apiRequest("/api/account/purchases"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchase History</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : !purchases?.length ? (
          <p className="text-muted-foreground text-sm">No purchases yet.</p>
        ) : (
          <div className="space-y-2">
            {purchases.map((p: any) => (
              <div key={p.id} className="flex justify-between items-center py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{p.credits} credits</p>
                  <p className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</p>
                </div>
                <p className="font-medium">${(p.amountPaid / 100).toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Usage Stats Section ──────────────────────────────────
function UsageSection() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/account/usage-stats"],
    queryFn: () => apiRequest("/api/account/usage-stats"),
  });

  if (isLoading) return <Card><CardContent className="p-6"><p className="text-muted-foreground">Loading stats...</p></CardContent></Card>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Usage Overview</CardTitle>
          <CardDescription>Your activity summary</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-primary">{stats?.credits || 0}</p>
              <p className="text-xs text-muted-foreground">Credits Left</p>
            </div>
            <div className="bg-muted rounded-lg p-4 text-center">
              <p className="text-2xl font-bold">{stats?.designsGenerated || 0}</p>
              <p className="text-xs text-muted-foreground">Designs Created</p>
            </div>
            <div className="bg-muted rounded-lg p-4 text-center">
              <p className="text-2xl font-bold">{stats?.totalCreditsPurchased || 0}</p>
              <p className="text-xs text-muted-foreground">Credits Purchased</p>
            </div>
            <div className="bg-muted rounded-lg p-4 text-center">
              <p className="text-2xl font-bold">${((stats?.totalSpent || 0) / 100).toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">Total Spent</p>
            </div>
          </div>
          {stats?.memberSince && (
            <p className="text-sm text-muted-foreground mt-4">
              Member since {new Date(stats.memberSince).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Designs Gallery Section ──────────────────────────────
type DesignItem = {
  id: number;
  colorName: string | null;
  createdAt: string;
  hasOriginal: boolean;
};

function DesignsSection() {
  const [items, setItems] = useState<DesignItem[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lightboxItem, setLightboxItem] = useState<DesignItem | null>(null);
  const [showCompare, setShowCompare] = useState(false);

  // Lazy-load observer. Initialised once via useState lazy initializer so it
  // is available synchronously on first render — observe() in the ref
  // callback wires up before the browser commits paint.
  const [observer] = useState<IntersectionObserver | null>(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return null;
    return new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;
            if (src && !img.src) img.src = src;
            obs.unobserve(img);
          }
        });
      },
      { rootMargin: "100px" }
    );
  });

  useEffect(() => () => observer?.disconnect(), [observer]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiRequest("/api/account/designs?limit=20&offset=0");
        if (cancelled) return;
        setItems(Array.isArray(data?.items) ? data.items : []);
        setTotal(Number(data?.total ?? 0));
      } catch {
        // best-effort; empty state will render on failure
      } finally {
        if (!cancelled) setIsLoadingInitial(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const lazyImgRef = useCallback((node: HTMLImageElement | null) => {
    if (!node || !node.dataset.src) return;
    if (observer) observer.observe(node);
    else node.src = node.dataset.src;
  }, [observer]);

  const loadMore = async () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const data = await apiRequest(`/api/account/designs?limit=100&offset=${items.length}`);
      const next = Array.isArray(data?.items) ? data.items : [];
      setItems((prev) => [...prev, ...next]);
      setTotal(Number(data?.total ?? total ?? 0));
    } catch {
      // best-effort; user can click again
    } finally {
      setIsLoadingMore(false);
    }
  };

  const downloadRender = (id: number, colorName: string | null) => {
    const link = document.createElement("a");
    link.href = `/api/designs/${id}/image`;
    link.download = `wrap-design-${colorName || "custom"}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const closeLightbox = () => { setLightboxItem(null); setShowCompare(false); };

  if (isLoadingInitial) {
    return <Card><CardContent className="p-6"><p className="text-muted-foreground">Loading designs...</p></CardContent></Card>;
  }

  const hasMore = total !== null && items.length < total;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Designs</CardTitle>
          <CardDescription>{total ?? 0} designs generated</CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-sm text-muted-foreground space-y-3">
              <p>No designs yet. Generate your first wrap visualization on the home page.</p>
              <Button variant="outline" size="sm" onClick={() => window.location.assign("/")}>Go to home</Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {items.map((d) => {
                  const imgUrl = `/api/designs/${d.id}/image`;
                  return (
                    <div
                      key={d.id}
                      className="group relative rounded-lg overflow-hidden border bg-muted cursor-pointer"
                      onClick={() => { setLightboxItem(d); setShowCompare(false); }}
                    >
                      <img
                        ref={lazyImgRef}
                        data-src={imgUrl}
                        alt={d.colorName || "Design"}
                        className="w-full aspect-[4/3] object-cover bg-muted"
                        width="400"
                        height="300"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        <p className="text-white text-sm font-medium">{d.colorName || "Custom Color"}</p>
                        <p className="text-white/70 text-xs">{new Date(d.createdAt).toLocaleDateString()}</p>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => { e.stopPropagation(); downloadRender(d.id, d.colorName); }}
                        >
                          <Download className="h-3 w-3 mr-1" /> Download
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {hasMore && (
                <div className="mt-6 text-center">
                  <Button variant="outline" onClick={loadMore} disabled={isLoadingMore}>
                    {isLoadingMore ? "Loading..." : "Load more"}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!lightboxItem} onOpenChange={(open) => { if (!open) closeLightbox(); }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{lightboxItem?.colorName || "Design"}</DialogTitle>
            <DialogDescription>
              {lightboxItem?.createdAt ? new Date(lightboxItem.createdAt).toLocaleDateString() : ""}
            </DialogDescription>
          </DialogHeader>
          {lightboxItem && (
            <div className="space-y-3">
              {showCompare && lightboxItem.hasOriginal ? (
                <BeforeAfterSlider
                  beforeImage={`/api/designs/${lightboxItem.id}/original`}
                  afterImage={`/api/designs/${lightboxItem.id}/image`}
                />
              ) : (
                <img
                  src={`/api/designs/${lightboxItem.id}/image`}
                  alt={lightboxItem.colorName || "Design"}
                  className="w-full max-h-[70vh] object-contain rounded-lg"
                />
              )}
              <div className="flex gap-2">
                {lightboxItem.hasOriginal && (
                  <Button variant="outline" size="sm" onClick={() => setShowCompare((v) => !v)}>
                    {showCompare ? "Show render only" : "Show before/after"}
                  </Button>
                )}
                <Button size="sm" onClick={() => downloadRender(lightboxItem.id, lightboxItem.colorName)}>
                  <Download className="h-4 w-4 mr-1" /> Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Invoice Settings Section ─────────────────────────────
function InvoiceSection({ profile }: { profile: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [companyName, setCompanyName] = useState(profile.companyName || "");
  const [companyAddress, setCompanyAddress] = useState(profile.companyAddress || "");
  const [vatNumber, setVatNumber] = useState(profile.vatNumber || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [invoiceEmail, setInvoiceEmail] = useState(profile.invoiceEmail || "");

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/account/invoice-settings", { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/account/profile"] });
      toast({ title: "Invoice settings saved" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const portalMutation = useMutation({
    mutationFn: () => apiRequest("/api/account/billing-portal", { method: "POST" }),
    onSuccess: (data) => { window.open(data.url, "_blank"); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
          <CardDescription>These details will appear on your invoices and PDF downloads</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Company Name</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Your company name" />
            </div>
            <div>
              <Label>VAT / Tax Number</Label>
              <Input value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} placeholder="e.g. NL123456789B01" />
            </div>
            <div className="md:col-span-2">
              <Label>Company Address</Label>
              <Input value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} placeholder="Street, City, Country" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+31 6 12345678" />
            </div>
            <div>
              <Label>Invoice Email</Label>
              <Input value={invoiceEmail} onChange={(e) => setInvoiceEmail(e.target.value)} placeholder="billing@company.com" type="email" />
            </div>
          </div>
          <Button onClick={() => mutation.mutate({ companyName, companyAddress, vatNumber, phone, invoiceEmail })} disabled={mutation.isPending}>
            <Save className="h-4 w-4 mr-2" /> Save Invoice Settings
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Download Invoices</CardTitle>
          <CardDescription>Access and download your invoices from the Stripe billing portal</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => portalMutation.mutate()} disabled={portalMutation.isPending}>
            <ExternalLink className="h-4 w-4 mr-2" />
            {portalMutation.isPending ? "Opening..." : "View Invoices in Stripe Portal"}
          </Button>
          {!profile.stripeCustomerId && (
            <p className="text-sm text-muted-foreground mt-2">Invoices will be available after your first purchase.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Ambassador Section ───────────────────────────────────
function AmbassadorSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [instagramUrl, setInstagramUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [otherSocialUrl, setOtherSocialUrl] = useState("");
  const [motivation, setMotivation] = useState("");

  const { data: status, isLoading } = useQuery<{
    hasApplication: boolean;
    status: "pending" | "approved" | "rejected" | null;
    createdAt?: string;
    adminNotes?: string | null;
  }>({
    queryKey: ["/api/influencer/status"],
    queryFn: () => apiRequest("/api/influencer/status"),
  });

  // PR #74a — load the ambassador dashboard data only once we know the
  // user's application is approved. Avoids a 403 round-trip for users
  // with pending or rejected applications.
  const isApproved = status?.hasApplication === true && status.status === "approved";
  const { data: dashboard, isLoading: dashboardLoading } = useQuery<{
    referral_handle: string | null;
    stats: { total_cents: number; pending_cents: number; paid_cents: number };
    recent_commissions: Array<{
      id: number;
      amount_cents: number;
      status: "pending" | "paid" | "voided";
      created_at: string;
      paid_at: string | null;
      referred_first_name: string | null;
    }>;
  }>({
    queryKey: ["/api/ambassador/dashboard"],
    queryFn: () => apiRequest("/api/ambassador/dashboard"),
    enabled: isApproved,
  });

  const [copied, setCopied] = useState(false);
  function copyTrackingLink(handle: string) {
    const url = `https://wrap-up.ai/?ref=${handle}`;
    navigator.clipboard.writeText(url).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ title: "Tracking link copied!" });
      },
      () => {
        toast({ title: "Could not copy link", variant: "destructive" });
      },
    );
  }

  const applyMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/influencer/apply", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/influencer/status"] });
      toast({ title: "Application submitted!", description: "We will review your application and get back to you." });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });
  const withdrawMutation = useMutation({
    mutationFn: () => apiRequest("/api/influencer/withdraw", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/influencer/status"] });
      toast({ title: "Application withdrawn", description: "You can now submit a new application." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) return <Card><CardContent className="p-6"><p className="text-muted-foreground">Loading...</p></CardContent></Card>;

  // Show status if already applied
  if (status?.hasApplication && status.status) {
    const appStatus = status.status;
    const statusColors: Record<string, string> = {
      pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      approved: "bg-green-500/20 text-green-400 border-green-500/30",
      rejected: "bg-red-500/20 text-red-400 border-red-500/30",
    };
    const statusMessages: Record<string, string> = {
      pending: "Your application is being reviewed. We will contact you here in your account when we have made a decision.",
      approved: "Congratulations! You have been approved as a Wrap Up AI Ambassador!",
      rejected: "Unfortunately, your application was not approved at this time. Feel free to apply again in the future.",
    };

    if (appStatus === "approved") {
      const handle = dashboard?.referral_handle ?? null;
      const trackingUrl = handle ? `https://wrap-up.ai/?ref=${handle}` : null;
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" /> Ambassador Program
              </CardTitle>
              <CardDescription>Your dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`inline-flex items-center px-3 py-1 rounded-full border text-sm font-medium ${statusColors.approved}`}>
                Approved
              </div>
              <p className="text-muted-foreground">{statusMessages.approved}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your tracking link</CardTitle>
              <CardDescription>
                Share this link. New customers who sign up after clicking it earn you 20% commission on their first purchase.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {handle && trackingUrl ? (
                <div className="flex items-center gap-2">
                  <Input readOnly value={trackingUrl} className="font-mono text-sm" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyTrackingLink(handle)}
                    aria-label="Copy tracking link"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Your tracking handle has not been set yet. Contact the team if you don&rsquo;t see one within a day of approval.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total earned</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardLoading ? "..." : formatCents(dashboard?.stats.total_cents)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending payout</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardLoading ? "..." : formatCents(dashboard?.stats.pending_cents)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Paid out</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardLoading ? "..." : formatCents(dashboard?.stats.paid_cents)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent commissions</CardTitle>
              <CardDescription>Last 10 commissions earned from your referrals.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Date</TableHead>
                    <TableHead>Referred customer</TableHead>
                    <TableHead className="w-28">Amount</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : !dashboard?.recent_commissions.length ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No commissions yet. Share your tracking link to start earning.
                      </TableCell>
                    </TableRow>
                  ) : (
                    dashboard.recent_commissions.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-sm">
                          {new Date(row.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.referred_first_name ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {formatCents(row.amount_cents)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={row.status === "paid" ? "secondary" : row.status === "voided" ? "destructive" : "default"}>
                            {row.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" /> Ambassador Program
          </CardTitle>
          <CardDescription>Your application status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`inline-flex items-center px-3 py-1 rounded-full border text-sm font-medium ${statusColors[appStatus] || ""}`}>
            {appStatus.charAt(0).toUpperCase() + appStatus.slice(1)}
          </div>
          <p className="text-muted-foreground">{statusMessages[appStatus]}</p>
          {status.adminNotes && (
            <div className="bg-muted rounded-lg p-3">
              <p className="text-sm font-medium mb-1">Note from our team:</p>
              <p className="text-sm text-muted-foreground">{status.adminNotes}</p>
            </div>
          )}
          {appStatus === 'pending' && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => withdrawMutation.mutate()}
              disabled={withdrawMutation.isPending}
            >
              {withdrawMutation.isPending ? "Withdrawing..." : "Withdraw Application"}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Show application form
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5" /> Become an Ambassador
        </CardTitle>
        <CardDescription>
          Want to be an Ambassador for Wrap Up AI? Fill in the form below and tell us why you would be the perfect influencer. We will evaluate your application and contact you here in your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Instagram Page *</Label>
          <Input value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/yourpage" />
        </div>
        <div>
          <Label>TikTok (optional)</Label>
          <Input value={tiktokUrl} onChange={(e) => setTiktokUrl(e.target.value)} placeholder="https://tiktok.com/@yourpage" />
        </div>
        <div>
          <Label>YouTube (optional)</Label>
          <Input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/@yourchannel" />
        </div>
        <div>
          <Label>Other Social Media (optional)</Label>
          <Input value={otherSocialUrl} onChange={(e) => setOtherSocialUrl(e.target.value)} placeholder="Any other social media link" />
        </div>
        <div>
          <Label>Why would you be a great ambassador? *</Label>
          <textarea
            className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={motivation}
            onChange={(e) => setMotivation(e.target.value)}
            placeholder="Tell us about yourself, your audience, and why you'd be a great ambassador for Wrap Up AI (minimum 50 characters)"
          />
          <p className="text-xs text-muted-foreground mt-1">{motivation.length}/50 characters minimum</p>
        </div>
        <Button
          onClick={() => applyMutation.mutate({ instagramUrl, tiktokUrl, youtubeUrl, otherSocialUrl, motivation })}
          disabled={applyMutation.isPending || !instagramUrl || motivation.length < 50}
        >
          {applyMutation.isPending ? "Submitting..." : "Submit Application"}
        </Button>
      </CardContent>
    </Card>
  );
}
