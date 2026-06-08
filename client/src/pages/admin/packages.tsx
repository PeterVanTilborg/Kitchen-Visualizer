import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Loader2, PackagePlus, Check, X, CreditCard, Zap, RefreshCw, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface CreditPackage {
  id: number;
  package_id: string;
  name: string;
  description: string;
  credits: number;
  price: number;
  price_id: string | null;
  savings: string | null;
  popular: boolean;
  plan_type: string;
  active: boolean;
  sort_order: number;
  created_at: string;
}

const emptyForm = {
  package_id: "",
  name: "",
  description: "",
  credits: "",
  price: "",
  price_id: "",
  savings: "",
  popular: false,
  plan_type: "plan",
  active: true,
  sort_order: "0",
};

export default function AdminPackages() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<CreditPackage | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: packages = [], isLoading } = useQuery<CreditPackage[]>({
    queryKey: ["/api/admin/packages"],
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof emptyForm) => apiRequest("POST", "/api/admin/packages", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/packages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credit-packages"] });
      toast({ title: "Package created and synced to Stripe" });
      setDialogOpen(false);
    },
    onError: (e: any) => {
      toast({ title: "Failed to create package", description: e.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof emptyForm) =>
      apiRequest("PUT", `/api/admin/packages/${editingPackage?.package_id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/packages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credit-packages"] });
      toast({ title: "Package updated and synced to Stripe" });
      setDialogOpen(false);
    },
    onError: (e: any) => {
      toast({ title: "Failed to update package", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (packageId: string) => apiRequest("DELETE", `/api/admin/packages/${packageId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/packages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credit-packages"] });
      toast({ title: "Package deleted" });
      setDeleteConfirm(null);
    },
    onError: () => {
      toast({ title: "Failed to delete package", variant: "destructive" });
    },
  });

  const syncStripeMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/packages/refresh-from-stripe"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/packages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credit-packages"] });
      toast({ title: "All packages synced to Stripe" });
    },
    onError: (e: any) => {
      toast({ title: "Stripe sync failed", description: e.message, variant: "destructive" });
    },
  });

  const openCreate = () => {
    setEditingPackage(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (pkg: CreditPackage) => {
    setEditingPackage(pkg);
    setForm({
      package_id: pkg.package_id,
      name: pkg.name,
      description: pkg.description,
      credits: String(pkg.credits),
      price: String(pkg.price),
      price_id: pkg.price_id || "",
      savings: pkg.savings || "",
      popular: pkg.popular,
      plan_type: pkg.plan_type,
      active: pkg.active,
      sort_order: String(pkg.sort_order),
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.package_id || !form.name || !form.description || !form.credits || !form.price) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    if (editingPackage) {
      updateMutation.mutate(form);
    } else {
      createMutation.mutate(form);
    }
  };

  const subscriptionPackages = packages.filter(p => p.plan_type === 'subscription');
  const planPackages = packages.filter(p => p.plan_type === 'plan');
  const topupPackages = packages.filter(p => p.plan_type === 'topup');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Credit Packages</h1>
          <p className="text-sm text-muted-foreground">
            Manage the pricing packages shown to customers in the purchase modal
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncStripeMutation.mutate()}
            disabled={syncStripeMutation.isPending}
            data-testid="button-refresh-stripe"
            className="text-xs sm:text-sm"
          >
            {syncStripeMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4 mr-2" />
            )}
            Refresh from Stripe
          </Button>
          <Button onClick={openCreate} size="sm" data-testid="button-add-package" className="text-xs sm:text-sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Package
          </Button>
        </div>
      </div>

      {/* Monthly Subscriptions */}
      {subscriptionPackages.length > 0 && (
        <Card>
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-primary" />
              Monthly Subscriptions
            </CardTitle>
            <CardDescription>
              Recurring monthly plans with included renders
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <PackageTable
              packages={subscriptionPackages}
              onEdit={openEdit}
              onDelete={setDeleteConfirm}
              deleteConfirm={deleteConfirm}
              onDeleteConfirm={(id) => deleteMutation.mutate(id)}
              onDeleteCancel={() => setDeleteConfirm(null)}
            />
          </CardContent>
        </Card>
      )}

      {/* Credit Plans */}
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-primary" />
            Credit Plans
          </CardTitle>
          <CardDescription>
            One-time credit purchases for pay-as-you-go usage
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <PackageTable
            packages={planPackages}
            onEdit={openEdit}
            onDelete={setDeleteConfirm}
            deleteConfirm={deleteConfirm}
            onDeleteConfirm={(id) => deleteMutation.mutate(id)}
            onDeleteCancel={() => setDeleteConfirm(null)}
          />
        </CardContent>
      </Card>

      {/* Top-ups */}
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Top-Up Packs
          </CardTitle>
          <CardDescription>
            Smaller top-up packs shown below the main plans
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <PackageTable
            packages={topupPackages}
            onEdit={openEdit}
            onDelete={setDeleteConfirm}
            deleteConfirm={deleteConfirm}
            onDeleteConfirm={(id) => deleteMutation.mutate(id)}
            onDeleteCancel={() => setDeleteConfirm(null)}
          />
        </CardContent>
      </Card>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPackage ? "Edit Package" : "Add Package"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Package ID *</Label>
                <Input
                  placeholder="plan_starter"
                  value={form.package_id}
                  onChange={e => setForm(f => ({ ...f, package_id: e.target.value }))}
                  disabled={!!editingPackage}
                  data-testid="input-package-id"
                />
                <p className="text-xs text-muted-foreground">Unique key, no spaces</p>
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.plan_type} onValueChange={v => setForm(f => ({ ...f, plan_type: v }))}>
                  <SelectTrigger data-testid="select-plan-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subscription">Subscription</SelectItem>
                    <SelectItem value="plan">Plan</SelectItem>
                    <SelectItem value="topup">Top-Up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                placeholder="Starter Pack"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                data-testid="input-package-name"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Input
                placeholder="Perfect to get started"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                data-testid="input-package-description"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Credits *</Label>
                <Input
                  type="number"
                  placeholder="20"
                  value={form.credits}
                  onChange={e => setForm(f => ({ ...f, credits: e.target.value }))}
                  data-testid="input-package-credits"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Price ($) *</Label>
                <Input
                  type="number"
                  placeholder="50"
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  data-testid="input-package-price"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.sort_order}
                  onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))}
                  data-testid="input-package-sort"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Savings label</Label>
                <Input
                  placeholder="Save 17%"
                  value={form.savings}
                  onChange={e => setForm(f => ({ ...f, savings: e.target.value }))}
                  data-testid="input-package-savings"
                />
                <p className="text-xs text-muted-foreground">Shown as-is on the badge</p>
              </div>
              <div className="space-y-1.5">
                <Label>Stripe Price ID</Label>
                <Input
                  placeholder="price_..."
                  value={form.price_id}
                  onChange={e => setForm(f => ({ ...f, price_id: e.target.value }))}
                  data-testid="input-package-priceid"
                />
                <p className="text-xs text-muted-foreground">Auto-filled on sync</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.popular}
                  onCheckedChange={v => setForm(f => ({ ...f, popular: v }))}
                  data-testid="switch-package-popular"
                />
                <Label>Mark as Popular</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.active}
                  onCheckedChange={v => setForm(f => ({ ...f, active: v }))}
                  data-testid="switch-package-active"
                />
                <Label>Active (visible to users)</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-package"
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {editingPackage ? "Save Changes" : "Create Package"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PackageTable({
  packages,
  onEdit,
  onDelete,
  deleteConfirm,
  onDeleteConfirm,
  onDeleteCancel,
}: {
  packages: CreditPackage[];
  onEdit: (pkg: CreditPackage) => void;
  onDelete: (id: string) => void;
  deleteConfirm: string | null;
  onDeleteConfirm: (id: string) => void;
  onDeleteCancel: () => void;
}) {
  if (packages.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">No packages yet</p>;
  }

  return (
    <div className="divide-y">
      {packages.map(pkg => (
        <div key={pkg.package_id} className="flex items-center gap-3 sm:gap-5 py-4 sm:py-5">
          {/* Price - big and bold on the left */}
          <div className="shrink-0 w-16 sm:w-24 text-center">
            <div className="text-lg sm:text-2xl font-bold">${pkg.price}</div>
            {pkg.plan_type === 'subscription' && (
              <div className="text-[10px] sm:text-xs text-muted-foreground">/month</div>
            )}
            {pkg.savings && (
              <Badge variant="secondary" className="mt-1 text-[10px] sm:text-xs font-medium">
                {pkg.savings}
              </Badge>
            )}
          </div>

          {/* Credits - prominent display */}
          <div className="shrink-0 w-12 sm:w-20 text-center">
            <div className="text-base sm:text-xl font-semibold text-primary">{pkg.credits}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">credits</div>
          </div>

          {/* Package info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm sm:text-base">{pkg.name}</span>
              {pkg.popular && <Badge className="text-[10px] sm:text-xs bg-primary">Popular</Badge>}
              {!pkg.active && <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-1 sm:line-clamp-none">{pkg.description}</p>
            <p className="text-xs text-muted-foreground/60 mt-1 font-mono hidden sm:block">
              {pkg.package_id}
              {pkg.price_id && <span> · {pkg.price_id}</span>}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {deleteConfirm === pkg.package_id ? (
              <>
                <span className="text-sm text-destructive">Delete?</span>
                <Button size="icon" variant="destructive" onClick={() => onDeleteConfirm(pkg.package_id)} data-testid={"button-confirm-delete-" + pkg.package_id}>
                  <Check className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="outline" onClick={onDeleteCancel}>
                  <X className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button size="icon" variant="outline" onClick={() => onEdit(pkg)} data-testid={"button-edit-" + pkg.package_id}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="outline" onClick={() => onDelete(pkg.package_id)} data-testid={"button-delete-" + pkg.package_id}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
