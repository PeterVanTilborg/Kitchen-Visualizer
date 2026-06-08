import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bug,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2,
  AlertCircle,
  Image,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type TabStatus = "open" | "resolved" | "all";

interface BugReportListItem {
  id: number;
  description: string;
  category: string;
  photoMimeType: string | null;
  surface: string;
  partnerId: number | null;
  url: string | null;
  renderIdConsumer: number | null;
  renderIdWidget: number | null;
  userId: string | null;
  userAgent: string | null;
  viewport: string | null;
  status: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  deletedAt: string | null;
  createdAt: string;
  partnerName: string | null;
  renderConsumerColorName: string | null;
  renderConsumerCreatedAt: string | null;
  renderWidgetColorName: string | null;
  renderWidgetCreatedAt: string | null;
  reporterEmail: string | null;
  hasPhoto: boolean;
}

interface ListResponse {
  reports: BugReportListItem[];
  total: number;
}

const PAGE_SIZE = 50;

const CATEGORY_LABELS: Record<string, string> = {
  color_issue: "Color issue",
  render_quality: "Render quality",
  ui_bug: "UI bug",
  other: "Other",
};

function categoryVariant(cat: string): "default" | "secondary" | "destructive" | "outline" {
  if (cat === "ui_bug") return "destructive";
  if (cat === "color_issue" || cat === "render_quality") return "secondary";
  return "outline";
}

export default function AdminBugReports() {
  const { toast } = useToast();
  const [tab, setTab] = useState<TabStatus>("open");
  const [page, setPage] = useState(1);
  const [selectedReport, setSelectedReport] = useState<BugReportListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BugReportListItem | null>(null);

  useEffect(() => { setPage(1); }, [tab]);

  const queryUrl = useMemo(() => {
    const params = new URLSearchParams({
      status: tab,
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    return `/api/admin/bug-reports?${params.toString()}`;
  }, [tab, page]);

  const { data, isLoading, error, refetch, isFetching } = useQuery<ListResponse>({
    queryKey: ["/api/admin/bug-reports", tab, page],
    queryFn: async () => {
      const res = await fetch(queryUrl, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
  });

  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/admin/bug-reports"] });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: "open" | "resolved" }) => {
      await apiRequest("PATCH", `/api/admin/bug-reports/${id}/status`, { status });
    },
    onSuccess: () => {
      toast({ title: "Status updated" });
      invalidateList();
      setSelectedReport(null);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update status", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/bug-reports/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Bug report deleted" });
      invalidateList();
      setDeleteTarget(null);
      setSelectedReport(null);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
    },
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstRow = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRow = Math.min(page * PAGE_SIZE, total);

  function tabLabel(t: TabStatus): string {
    const base: Record<TabStatus, string> = { open: "Open", resolved: "Resolved", all: "All" };
    return t === tab && data != null ? `${base[t]} (${total})` : base[t];
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Bug className="h-6 w-6" />
          Bug Reports
        </h2>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabStatus)}>
        <TabsList>
          <TabsTrigger value="open">{tabLabel("open")}</TabsTrigger>
          <TabsTrigger value="resolved">{tabLabel("resolved")}</TabsTrigger>
          <TabsTrigger value="all">{tabLabel("all")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load bug reports. Please try again.</AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36">Created</TableHead>
                  <TableHead className="w-24">Surface</TableHead>
                  <TableHead className="w-32">Category</TableHead>
                  <TableHead className="w-32">Partner</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-16 text-center">Photo</TableHead>
                  <TableHead className="w-52 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : data?.reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      No bug reports.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm">
                              {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {format(new Date(report.createdAt), "yyyy-MM-dd HH:mm:ss")}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Badge variant={report.surface === "consumer" ? "default" : "secondary"}>
                          {report.surface}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={categoryVariant(report.category)}>
                          {CATEGORY_LABELS[report.category] ?? report.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {report.partnerName ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm max-w-xs">
                        <span className="line-clamp-2">
                          {report.description.length > 80
                            ? report.description.slice(0, 80) + "…"
                            : report.description}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {report.hasPhoto ? (
                          <Image className="h-4 w-4 mx-auto text-muted-foreground" />
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedReport(report)}
                          >
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              statusMutation.mutate({
                                id: report.id,
                                status: report.status === "open" ? "resolved" : "open",
                              })
                            }
                            disabled={statusMutation.isPending}
                          >
                            {report.status === "open" ? "Resolve" : "Reopen"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(report)}
                          >
                            Delete
                          </Button>
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
          {total === 0 ? "0 reports" : `Showing ${firstRow}–${lastRow} of ${total}`}
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

      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bug report #{selectedReport?.id}</DialogTitle>
            <DialogDescription>
              {selectedReport
                ? format(new Date(selectedReport.createdAt), "yyyy-MM-dd HH:mm:ss")
                : ""}
            </DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4 text-sm overflow-auto max-h-[70vh]">
              <dl className="grid grid-cols-[140px_1fr] gap-y-2">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <Badge variant={selectedReport.status === "open" ? "default" : "secondary"}>
                    {selectedReport.status}
                  </Badge>
                </dd>
                <dt className="text-muted-foreground">Surface</dt>
                <dd>
                  <Badge variant={selectedReport.surface === "consumer" ? "default" : "secondary"}>
                    {selectedReport.surface}
                  </Badge>
                </dd>
                <dt className="text-muted-foreground">Category</dt>
                <dd>
                  <Badge variant={categoryVariant(selectedReport.category)}>
                    {CATEGORY_LABELS[selectedReport.category] ?? selectedReport.category}
                  </Badge>
                </dd>
                <dt className="text-muted-foreground">Reporter</dt>
                <dd>{selectedReport.reporterEmail ?? "—"}</dd>
                <dt className="text-muted-foreground">URL</dt>
                <dd className="font-mono text-xs break-all">{selectedReport.url ?? "—"}</dd>
                <dt className="text-muted-foreground">Viewport</dt>
                <dd className="font-mono text-xs">{selectedReport.viewport ?? "—"}</dd>
                {selectedReport.renderIdConsumer != null && (
                  <>
                    <dt className="text-muted-foreground">Consumer render</dt>
                    <dd>
                      #{selectedReport.renderIdConsumer}
                      {selectedReport.renderConsumerColorName &&
                        ` — ${selectedReport.renderConsumerColorName}`}
                      {selectedReport.renderConsumerCreatedAt &&
                        ` (${format(new Date(selectedReport.renderConsumerCreatedAt), "yyyy-MM-dd")})`}
                    </dd>
                  </>
                )}
                {selectedReport.renderIdWidget != null && (
                  <>
                    <dt className="text-muted-foreground">Widget render</dt>
                    <dd>
                      #{selectedReport.renderIdWidget}
                      {selectedReport.renderWidgetColorName &&
                        ` — ${selectedReport.renderWidgetColorName}`}
                      {selectedReport.renderWidgetCreatedAt &&
                        ` (${format(new Date(selectedReport.renderWidgetCreatedAt), "yyyy-MM-dd")})`}
                    </dd>
                  </>
                )}
                {selectedReport.partnerName != null && (
                  <>
                    <dt className="text-muted-foreground">Partner</dt>
                    <dd>{selectedReport.partnerName}</dd>
                  </>
                )}
                {selectedReport.resolvedAt != null && (
                  <>
                    <dt className="text-muted-foreground">Resolved at</dt>
                    <dd>{format(new Date(selectedReport.resolvedAt), "yyyy-MM-dd HH:mm:ss")}</dd>
                  </>
                )}
              </dl>
              <div>
                <div className="text-muted-foreground mb-1">Description</div>
                <pre className="whitespace-pre-wrap break-all font-mono text-xs bg-muted p-3 rounded">
                  {selectedReport.description}
                </pre>
              </div>
              {selectedReport.hasPhoto && (
                <div>
                  <div className="text-muted-foreground mb-1">Screenshot</div>
                  <img
                    src={`/api/admin/bug-reports/${selectedReport.id}/photo`}
                    alt="Bug report screenshot"
                    className="rounded border max-w-full"
                  />
                </div>
              )}
              <div>
                <div className="text-muted-foreground mb-1">User agent</div>
                <pre className="whitespace-pre-wrap break-all font-mono text-xs bg-muted p-3 rounded">
                  {selectedReport.userAgent ?? "—"}
                </pre>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    statusMutation.mutate({
                      id: selectedReport.id,
                      status: selectedReport.status === "open" ? "resolved" : "open",
                    })
                  }
                  disabled={statusMutation.isPending}
                >
                  {statusMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {selectedReport.status === "open" ? "Mark resolved" : "Reopen"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    setDeleteTarget(selectedReport);
                    setSelectedReport(null);
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete bug report</AlertDialogTitle>
            <AlertDialogDescription>
              Delete report #{deleteTarget?.id}? The record will be soft-deleted and hidden from
              all views.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground"
            >
              {deleteMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
