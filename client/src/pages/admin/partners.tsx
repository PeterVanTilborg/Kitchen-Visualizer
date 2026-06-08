import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Plus, PauseCircle, PlayCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Partner {
  id: number;
  user_id: string;
  user_email: string;
  business_name: string;
  allowed_domain: string;
  embed_token: string;
  subscription_status: string;
  credits_remaining: number;
  credits_per_month: number;
  total_renders: number;
  selected_brands_display: string;
  created_at: string;
}
interface PartnerRender {
  id: number;
  partner_id: number;
  customer_email: string | null;
  color_id: number | null;
  color_name: string | null;
  result_image_url: string | null;
  created_at: string | null;
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
  if (status === "suspended") return <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30">Suspended</Badge>;
  if (status === "cancelled") return <Badge variant="secondary">Cancelled</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}

export default function AdminPartners() {
  const { toast } = useToast();
  const [addCreditsPartnerId, setAddCreditsPartnerId] = useState<number | null>(null);
  const [creditsToAdd, setCreditsToAdd] = useState("");
  const [viewCustomersPartnerId, setViewCustomersPartnerId] = useState<number | null>(null);
  const [viewRendersPartnerId, setViewRendersPartnerId] = useState<number | null>(null);

  const { data: partners, isLoading } = useQuery<Partner[]>({
    queryKey: ["/api/admin/partners"],
  });

  const { data: partnerCustomers, isLoading: customersLoading } = useQuery<WidgetCustomer[]>({
    queryKey: ["/api/admin/partners", viewCustomersPartnerId, "customers"],
    queryFn: async () => {
      if (!viewCustomersPartnerId) return [];
      const res = await fetch(`/api/admin/partners/${viewCustomersPartnerId}/customers`, { credentials: "include" });
      return res.ok ? res.json() : [];
    },
    enabled: viewCustomersPartnerId !== null,
  });

  const { data: partnerRenders, isLoading: rendersLoading } = useQuery<PartnerRender[]>({
    queryKey: ["/api/admin/partners", viewRendersPartnerId, "renders"],
    queryFn: async () => {
      if (!viewRendersPartnerId) return [];
      const res = await fetch(`/api/admin/partners/${viewRendersPartnerId}/renders`, { credentials: "include" });
      return res.json();
    },
  });

  const addCreditsMutation = useMutation({
    mutationFn: async ({ partnerId, credits }: { partnerId: number; credits: number }) => {
      const res = await apiRequest("POST", `/api/admin/partners/${partnerId}/add-credits`, { credits });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners"] });
      toast({ title: "Credits added successfully" });
      setAddCreditsPartnerId(null);
      setCreditsToAdd("");
    },
    onError: () => {
      toast({ title: "Failed to add credits", variant: "destructive" });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async ({ partnerId, suspended }: { partnerId: number; suspended: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/partners/${partnerId}/suspend`, { suspended });
      return res.json();
    },
    onSuccess: (_, { suspended }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners"] });
      toast({ title: suspended ? "Partner suspended" : "Partner reactivated" });
    },
    onError: () => {
      toast({ title: "Failed to update partner status", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Partners</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage B2B partners who embed WrapUp AI on their websites.
          </p>
        </div>
        <Badge variant="outline" className="text-base px-3 py-1">
          {partners?.length ?? 0} partner{partners?.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {!partners?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No partners yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Partners sign up at <code className="text-xs bg-muted px-1 py-0.5 rounded">/partner/signup</code>
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Business</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Domain</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Credits</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Renders</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Brands</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {partners.map(p => (
                <tr key={p.id} className="border-t hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.business_name}</div>
                    <div className="text-xs text-muted-foreground">{p.user_email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={p.allowed_domain}
                      target="_blank"
                      rel="noopener"
                      className="text-[#d2d915] hover:underline text-xs"
                    >
                      {p.allowed_domain}
                    </a>
                  </td>
                  <td className="px-4 py-3">{statusBadge(p.subscription_status)}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{p.credits_remaining}</span>
                    <span className="text-muted-foreground text-xs"> / {p.credits_per_month}</span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{p.total_renders}</td>
                  <td className="px-4 py-3 max-w-[180px]">
                    <span className="text-xs text-muted-foreground truncate block" title={p.selected_brands_display}>
                      {p.selected_brands_display}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setAddCreditsPartnerId(p.id); setCreditsToAdd(""); }}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />Credits
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewCustomersPartnerId(p.id)}
                      >
                        Customers
                      </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-blue-400 border-blue-600/30 hover:bg-blue-600/10"
                  onClick={() => setViewRendersPartnerId(p.id)}
                >
                  View Renders
                </Button>
                      {p.subscription_status === "suspended" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-400 border-green-600/30 hover:bg-green-600/10"
                          onClick={() => suspendMutation.mutate({ partnerId: p.id, suspended: false })}
                          disabled={suspendMutation.isPending}
                        >
                          <PlayCircle className="w-3.5 h-3.5 mr-1" />Reactivate
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-yellow-400 border-yellow-600/30 hover:bg-yellow-600/10"
                          onClick={() => suspendMutation.mutate({ partnerId: p.id, suspended: true })}
                          disabled={suspendMutation.isPending || p.subscription_status === "cancelled"}
                        >
                          <PauseCircle className="w-3.5 h-3.5 mr-1" />Suspend
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

            {/* View customers dialog */}
      <Dialog open={viewCustomersPartnerId !== null} onOpenChange={open => !open && setViewCustomersPartnerId(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Widget Visitors</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {customersLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : !partnerCustomers || partnerCustomers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No verified visitors yet for this partner.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-3 font-medium">Name</th>
                    <th className="text-left py-2 pr-3 font-medium">Email</th>
                    <th className="text-left py-2 pr-3 font-medium">Phone</th>
                    <th className="text-left py-2 pr-3 font-medium">Verified</th>
                    <th className="text-left py-2 pr-3 font-medium">Renders</th>
                    <th className="text-left py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {partnerCustomers.map(c => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="py-2 pr-3">{c.name}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{c.email}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{c.phone ?? "—"}</td>
                      <td className="py-2 pr-3">{c.verified ? <Badge>Yes</Badge> : <Badge variant="outline">No</Badge>}</td>
                      <td className="py-2 pr-3">{c.render_count}</td>
                      <td className="py-2 text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewCustomersPartnerId(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewRendersPartnerId !== null} onOpenChange={open => !open && setViewRendersPartnerId(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Widget Renders</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {rendersLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading renders...</div>
            ) : !partnerRenders?.length ? (
              <div className="py-8 text-center text-muted-foreground">No renders yet for this partner.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Email</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Colour</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {partnerRenders.map(r => (
                    <tr key={r.id} className="border-b border-border hover:bg-muted/30">
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap text-xs">
                        {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-3 py-2">{r.customer_email ?? '—'}</td>
                      <td className="px-3 py-2">{r.color_name ?? '—'}</td>
                      <td className="px-3 py-2">
                        {r.result_image_url ? (
                          <img src={r.result_image_url} alt="render result" className="h-16 w-24 object-cover rounded border border-border" />
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add credits dialog */}
      <Dialog open={addCreditsPartnerId !== null} onOpenChange={open => !open && setAddCreditsPartnerId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add credits</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Credits will be added to the partner's remaining balance immediately.
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Number of credits to add</label>
              <Input
                type="number"
                min="1"
                max="10000"
                value={creditsToAdd}
                onChange={e => setCreditsToAdd(e.target.value)}
                placeholder="e.g. 50"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCreditsPartnerId(null)}>Cancel</Button>
            <Button
              onClick={() => {
                const n = parseInt(creditsToAdd, 10);
                if (!n || n < 1 || !addCreditsPartnerId) return;
                addCreditsMutation.mutate({ partnerId: addCreditsPartnerId, credits: n });
              }}
              disabled={addCreditsMutation.isPending || !creditsToAdd || parseInt(creditsToAdd) < 1}
            >
              {addCreditsMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Addingâ¦</> : "Add credits"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
