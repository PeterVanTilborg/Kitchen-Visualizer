import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function PartnerSignup() {
  const [, navigate] = useLocation();

  const [form, setForm] = useState({
    businessName: "",
    email: "",
    password: "",
    allowedDomain: "",
  });
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('plan') === 'annual') setSelectedPlan('annual');
  }, []);

    useEffect(() => {
    fetch("/api/partner/brands-list")
      .then(r => r.json())
      .then(data => { setAvailableBrands(data); setBrandsLoading(false); })
      .catch(() => setBrandsLoading(false));
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  function toggleBrand(brand: string) {
    setSelectedBrands(prev =>
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.businessName || !form.email || !form.password || !form.allowedDomain) {
      setError("All fields are required.");
      return;
    }
    if (!form.allowedDomain.startsWith("http")) {
      setError('Domain must start with https:// — e.g. https://www.yourcompany.com');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/partner/signup", {
        ...form,
        brands: selectedBrands,
      planType: selectedPlan,
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setError("Signup succeeded but no checkout URL was returned. Please contact support.");
      }
        } catch (err: any) {
      let errMsg = "Signup failed. Please try again.";
      try {
        const colonIdx = err.message?.indexOf(': ');
        if (colonIdx > -1) {
          const body = JSON.parse(err.message.slice(colonIdx + 2));
          if (body?.message) errMsg = body.message;
        }
      } catch {}
      setError(errMsg);
        } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <img src="/logo-wrapup.svg" alt="WrapUp AI" className="h-10 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Become a Partner</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Embed the WrapUp AI wrap visualiser on your website
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create your partner account</CardTitle>
            <CardDescription>
              150 renders/month · $199/month · Instant embed code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">

              <div className="space-y-1.5">
                <Label htmlFor="businessName">Business name</Label>
                <Input
                  id="businessName"
                  name="businessName"
                  value={form.businessName}
                  onChange={handleChange}
                  placeholder="Your business name"
                  disabled={submitting}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  disabled={submitting}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min. 6 characters"
                  disabled={submitting}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="allowedDomain">
                  Enter the exact URL where you will embed WrapUp AI
                </Label>
                <Input
                  id="allowedDomain"
                  name="allowedDomain"
                  value={form.allowedDomain}
                  onChange={handleChange}
                  placeholder="https://www.yourcompany.com"
                  disabled={submitting}
                />
                <p className="text-xs text-muted-foreground">
                  Must include https:// — the embed will only work on this exact domain.
                </p>
              </div>

              {/* Brand selection */}
              <div className="space-y-2">
                <Label>
                  Select which wrap brands to show in your embed
                </Label>
                <p className="text-xs text-muted-foreground">
                  Leave all unchecked to show all brands.
                </p>
                {brandsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading brands…
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3 bg-muted/20">
                    {availableBrands.map(brand => (
                      <label key={brand} className="flex items-center gap-2 cursor-pointer hover:text-foreground text-sm">
                        <Checkbox
                          checked={selectedBrands.includes(brand)}
                          onCheckedChange={() => toggleBrand(brand)}
                          disabled={submitting}
                        />
                        <span>{brand}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Plan selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select your plan</label>
                <div className="flex bg-muted rounded-lg p-1">
                  <button
                    type="button"
                    className={`flex-1 text-sm font-medium py-2 px-3 rounded-md transition-all ${selectedPlan === 'monthly' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setSelectedPlan('monthly')}
                    disabled={submitting}
                  >
                    Monthly &mdash; $199/mo
                  </button>
                  <button
                    type="button"
                    className={`flex-1 text-sm font-medium py-2 px-3 rounded-md transition-all ${selectedPlan === 'annual' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setSelectedPlan('annual')}
                    disabled={submitting}
                  >
                    Annual &mdash; $1,990/yr{' '}
                    <span className="text-xs font-bold" style={{ color: '#D2D915' }}>2 months free</span>
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating account…</>
                ) : (
                  "Continue to payment →"
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Already have a partner account?{" "}
                <a href="/auth" className="underline">Sign in</a>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
