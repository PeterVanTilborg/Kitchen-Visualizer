import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DollarSign,
  Wallet,
  RefreshCw,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCents } from "@/lib/format";

type TabStatus = "pending" | "paid" | "all";

interface CommissionRow {
  id: number;
  amount_cents: number;
  rate_percent: number;
  status: "pending" | "paid" | "voided";
  paid_at: string | null;
  created_at: string;
  referrer_user_id: string;
  referred_user_id: string;
  source_purchase_id: number;
  referred_email: string | null;
  referred_first_name: string | null;
  referred_last_name: string | null;
  ambassador_email: string | null;
  ambassador_first_name: string | null;
  ambassador_last_name: string | null;
  referral_handle: string | null;
}

interface ListResponse {
  commissions: CommissionRow[];
  total: number;
}

interface StatsResponse {
  total_pending_cents: number;
  total_paid_cents: number;
  pending_count: number;
  paid_count: number;
}

const PAGE_SIZE = 50;

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "pending") return "default";
  if (status === "paid") return "secondary";
  if (status === "voided") return "destructive";
  return "outline";
}

function ambassadorName(row: CommissionRow): string {
  const parts = [row.ambassador_first_name, row.ambassador_last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return row.ambassador_email ?? row.referrer_user_id;
}

function referredName(row: CommissionRow): string {
  const parts = [row.referred_first_name, row.referred_last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return row.referred_email ?? row.referred_user_id;
}

export default function AdminPayouts() {
  const { toast } = useToast();
  const [tab, setTab] = useState<TabStatus>("pending");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<CommissionRow | null>(null);
  const [markPaidTarget, setMarkPaidTarget] = useState<CommissionRow | null>(null);
  const [paymentReference, setPaymentReference] = useState("");

  useEffect(() => { setPage(1); }, [tab]);
  useEffect(() => { setPaymentReference(""); }, [markPaidTarget]);

  const queryUrl = useMemo(() => {
    const params = new URLSearchParams({
      status: tab,
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    return `/api/admin/commission-ledger?${params.toString()}`;
  }, [tab, page]);

  const { data, isLoading, error, refetch, isFetching } = useQuery<ListResponse>({
    queryKey: ["/api/admin/commission-ledger", tab, page],
    queryFn: async () => {
      const res = await fetch(queryUrl, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
  });

  const { data: stats, isLoading: statsLoading } = useQuery<StatsResponse>({
    queryKey: ["/api/admin/commission-ledger/stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/commission-ledger/stats", { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/commission-ledger"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/commission-ledger/stats"] });
  };

  const markPaidMutation = useMutation({
    mutationFn: async ({ id, paymentReference }: { id: number; paymentReference?: string }) => {
      await apiRequest("PATCH", `/api/admin/commission-ledger/${id}/mark-paid`, {
        paymentReference: paymentReference ?? null,
      });
    },
    onSuccess: () => {
      toast({ title: "Commission marked paid" });
      invalidateAll();
      setMarkPaidTarget(null);
      setSelected(null);
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to mark commission paid",
        description: err.message.replace(/^\d+:\s*/, ""),
        variant: "destructive",
      });
    },
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstRow = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRow = Math.min(page * PAGE_SIZE, total);

  function tabLabel(t: TabStatus): string {
    if (!stats) return t === "pending" ? "Pending" : t === "paid" ? "Paid" : "All";
    if (t === "pending") return `Pending (${stats.pending_count})`;
    if (t === "paid") return `Paid (${stats.paid_count})`;
    return `All (${stats.pending_count + stats.paid_count})`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="h-6 w-6" />
          Payouts
        </h2>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total pending</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : formatCents(stats?.total_pending_cents)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total paid all-time</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : formatCents(stats?.total_paid_cents)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabStatus)}>
        <TabsList>
          <TabsTrigger value="pending">{tabLabel("pending")}</TabsTrigger>
          <TabsTrigger value="paid">{tabLabel("paid")}</TabsTrigger>
          <TabsTrigger value="all">{tabLabel("all")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load commission ledger. Please try again.</AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36">Date</TableHead>
                  <TableHead>Ambassador</TableHead>
                  <TableHead>Referred user</TableHead>
                  <TableHead className="w-28">Amount</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-56 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : !data?.commissions.length ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No commissions.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.commissions.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm">
                              {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {format(new Date(row.created_at), "yyyy-MM-dd HH:mm:ss")}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{ambassadorName(row)}</div>
                        {row.referral_handle && (
                          <div className="text-xs text-muted-foreground">
                            <code className="font-mono">@{row.referral_handle}</code>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{referredName(row)}</div>
                        {row.referred_email && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {row.referred_email}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {formatCents(row.amount_cents)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => setSelected(row)}>
                            View
                          </Button>
                          {row.status === "pending" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setMarkPaidTarget(row)}
                              disabled={markPaidMutation.isPending}
                            >
                              Mark Paid
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {total === 0 ? "0 commissions" : `Showing ${firstRow}–${lastRow} of ${total}`}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || isLoading}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Commission #{selected?.id}</DialogTitle>
            <DialogDescription>
              {selected ? format(new Date(selected.created_at), "yyyy-MM-dd HH:mm:ss") : ""}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm overflow-auto max-h-[70vh]">
              <dl className="grid grid-cols-[140px_1fr] gap-y-2">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <Badge variant={statusVariant(selected.status)}>{selected.status}</Badge>
                </dd>
                <dt className="text-muted-foreground">Created at</dt>
                <dd>{format(new Date(selected.created_at), "yyyy-MM-dd HH:mm:ss")}</dd>
                {selected.paid_at && (
                  <>
                    <dt className="text-muted-foreground">Paid at</dt>
                    <dd>{format(new Date(selected.paid_at), "yyyy-MM-dd HH:mm:ss")}</dd>
                  </>
                )}
                <dt className="text-muted-foreground">Ambassador</dt>
                <dd>
                  <div className="font-medium">{ambassadorName(selected)}</div>
                  {selected.ambassador_email && (
                    <div className="text-xs text-muted-foreground">{selected.ambassador_email}</div>
                  )}
                  {selected.referral_handle && (
                    <div className="text-xs text-muted-foreground">
                      <code className="font-mono">@{selected.referral_handle}</code>
                    </div>
                  )}
                </dd>
                <dt className="text-muted-foreground">Referred user</dt>
                <dd>
                  <div className="font-medium">{referredName(selected)}</div>
                  {selected.referred_email && (
                    <div className="text-xs text-muted-foreground">{selected.referred_email}</div>
                  )}
                </dd>
                <dt className="text-muted-foreground">Source purchase</dt>
                <dd>#{selected.source_purchase_id}</dd>
                <dt className="text-muted-foreground">Amount</dt>
                <dd className="font-medium">{formatCents(selected.amount_cents)}</dd>
                <dt className="text-muted-foreground">Rate</dt>
                <dd>{selected.rate_percent}%</dd>
              </dl>
              {selected.status === "pending" && (
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMarkPaidTarget(selected);
                      setSelected(null);
                    }}
                  >
                    Mark Paid
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!markPaidTarget} onOpenChange={(open) => !open && setMarkPaidTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark commission as paid</AlertDialogTitle>
            <AlertDialogDescription>
              Mark {markPaidTarget ? formatCents(markPaidTarget.amount_cents) : ""} commission to{" "}
              {markPaidTarget ? ambassadorName(markPaidTarget) : ""} as paid? You can optionally
              record a payment reference (e.g. PayPal transaction ID) for the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
            placeholder="Payment reference (e.g. PayPal transaction ID)"
            maxLength={200}
            className="min-h-[80px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={markPaidMutation.isPending}
              onClick={() =>
                markPaidTarget &&
                markPaidMutation.mutate({
                  id: markPaidTarget.id,
                  paymentReference: paymentReference.trim() ? paymentReference.trim() : undefined,
                })
              }
            >
              {markPaidMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Mark Paid
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
