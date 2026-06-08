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
  DialogFooter,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Star, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type TabStatus = "pending" | "approved" | "rejected" | "all";

// Handle validation mirrors server/routes.ts:validateAndNormalizeHandle.
// Match runs against the trimmed+lowercased value. Server is authoritative;
// this client check just keeps the submit button disabled and surfaces an
// inline hint while the user is typing.
const HANDLE_REGEX = /^[a-zA-Z0-9_-]+$/;
function isHandleValid(raw: string): boolean {
  const v = raw.trim().toLowerCase();
  return v.length >= 3 && v.length <= 30 && HANDLE_REGEX.test(v);
}

interface ApplicationRow {
  id: number;
  user_id: string;
  instagram_url: string;
  tiktok_url: string | null;
  youtube_url: string | null;
  other_social_url: string | null;
  motivation: string;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  created_at: string;
  updated_at: string | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  referral_handle: string | null;
  is_ambassador: boolean;
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "pending") return "default";
  if (status === "approved") return "secondary";
  if (status === "rejected") return "destructive";
  return "outline";
}

function applicantName(row: ApplicationRow): string {
  const parts = [row.first_name, row.last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return row.email ?? row.user_id;
}

export default function AdminAmbassadors() {
  const { toast } = useToast();
  const [tab, setTab] = useState<TabStatus>("pending");
  const [selected, setSelected] = useState<ApplicationRow | null>(null);
  const [approveTarget, setApproveTarget] = useState<ApplicationRow | null>(null);
  const [approveHandle, setApproveHandle] = useState("");
  const [rejectTarget, setRejectTarget] = useState<ApplicationRow | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [editHandleTarget, setEditHandleTarget] = useState<ApplicationRow | null>(null);
  const [editHandle, setEditHandle] = useState("");

  // Reset reject notes when the reject dialog opens for a different target.
  useEffect(() => {
    setRejectNotes("");
  }, [rejectTarget]);

  // Reset approve handle when the approve dialog opens for a different target.
  useEffect(() => {
    setApproveHandle("");
  }, [approveTarget]);

  // Seed edit-handle input from the row's current handle when the dialog opens.
  useEffect(() => {
    setEditHandle(editHandleTarget?.referral_handle ?? "");
  }, [editHandleTarget]);

  const { data, isLoading, error, refetch, isFetching } = useQuery<ApplicationRow[]>({
    queryKey: ["/api/admin/influencer-applications"],
    queryFn: async () => {
      const res = await fetch("/api/admin/influencer-applications", { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    if (tab === "all") return data;
    return data.filter((r) => r.status === tab);
  }, [data, tab]);

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0, all: data?.length ?? 0 };
    if (data) {
      for (const r of data) {
        if (r.status === "pending") c.pending++;
        else if (r.status === "approved") c.approved++;
        else if (r.status === "rejected") c.rejected++;
      }
    }
    return c;
  }, [data]);

  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/admin/influencer-applications"] });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      adminNotes,
      referralHandle,
    }: {
      id: number;
      status: "approved" | "rejected";
      adminNotes?: string | null;
      referralHandle?: string;
    }) => {
      await apiRequest("PATCH", `/api/admin/influencer-applications/${id}`, {
        status,
        adminNotes: adminNotes ?? null,
        ...(status === "approved" && referralHandle ? { referralHandle } : {}),
      });
    },
    onSuccess: (_data, vars) => {
      toast({
        title: vars.status === "approved" ? "Application approved" : "Application rejected",
      });
      invalidateList();
      setApproveTarget(null);
      setRejectTarget(null);
      setSelected(null);
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to update application",
        description: err.message.replace(/^\d+:\s*/, ""),
        variant: "destructive",
      });
    },
  });

  const editHandleMutation = useMutation({
    mutationFn: async ({ userId, referralHandle }: { userId: string; referralHandle: string | null }) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}/referral-handle`, {
        referralHandle,
      });
    },
    onSuccess: () => {
      toast({ title: "Handle updated" });
      invalidateList();
      setEditHandleTarget(null);
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to update handle",
        description: err.message.replace(/^\d+:\s*/, ""),
        variant: "destructive",
      });
    },
  });

  function tabLabel(t: TabStatus): string {
    const base: Record<TabStatus, string> = {
      pending: "Pending",
      approved: "Approved",
      rejected: "Rejected",
      all: "All",
    };
    return data ? `${base[t]} (${counts[t]})` : base[t];
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Star className="h-6 w-6" />
          Ambassadors
        </h2>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabStatus)}>
        <TabsList>
          <TabsTrigger value="pending">{tabLabel("pending")}</TabsTrigger>
          <TabsTrigger value="approved">{tabLabel("approved")}</TabsTrigger>
          <TabsTrigger value="rejected">{tabLabel("rejected")}</TabsTrigger>
          <TabsTrigger value="all">{tabLabel("all")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load applications. Please try again.</AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36">Submitted</TableHead>
                  <TableHead className="w-48">Applicant</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead className="w-40">Handle</TableHead>
                  <TableHead>Motivation</TableHead>
                  <TableHead className="w-80 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No applications.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => (
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
                        <div className="text-sm font-medium">{applicantName(row)}</div>
                        {row.email && (
                          <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                            {row.email}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.status === "approved" ? (
                          row.referral_handle ? (
                            <code className="font-mono text-xs">{row.referral_handle}</code>
                          ) : (
                            <span className="text-muted-foreground italic">— backfill needed</span>
                          )
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm max-w-md">
                        <span className="line-clamp-2">
                          {row.motivation.length > 100
                            ? row.motivation.slice(0, 100) + "…"
                            : row.motivation}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => setSelected(row)}>
                            View
                          </Button>
                          {row.status === "approved" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditHandleTarget(row)}
                              disabled={editHandleMutation.isPending}
                            >
                              Edit Handle
                            </Button>
                          )}
                          {row.status !== "approved" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setApproveTarget(row)}
                              disabled={updateMutation.isPending}
                            >
                              Approve
                            </Button>
                          )}
                          {row.status !== "rejected" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setRejectTarget(row)}
                              disabled={updateMutation.isPending}
                            >
                              Reject
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

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Application #{selected?.id}</DialogTitle>
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
                <dt className="text-muted-foreground">Applicant</dt>
                <dd>{applicantName(selected)}</dd>
                <dt className="text-muted-foreground">Email</dt>
                <dd>{selected.email ?? "—"}</dd>
                <dt className="text-muted-foreground">Instagram</dt>
                <dd>
                  <a
                    href={selected.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline break-all"
                  >
                    {selected.instagram_url}
                  </a>
                </dd>
                <dt className="text-muted-foreground">TikTok</dt>
                <dd>
                  {selected.tiktok_url ? (
                    <a
                      href={selected.tiktok_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline break-all"
                    >
                      {selected.tiktok_url}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
                <dt className="text-muted-foreground">YouTube</dt>
                <dd>
                  {selected.youtube_url ? (
                    <a
                      href={selected.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline break-all"
                    >
                      {selected.youtube_url}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
                <dt className="text-muted-foreground">Other social</dt>
                <dd>
                  {selected.other_social_url ? (
                    <a
                      href={selected.other_social_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline break-all"
                    >
                      {selected.other_social_url}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
                {selected.status === "approved" && (
                  <>
                    <dt className="text-muted-foreground">Handle</dt>
                    <dd>
                      {selected.referral_handle ? (
                        <code className="font-mono text-xs">{selected.referral_handle}</code>
                      ) : (
                        <span className="text-muted-foreground italic">— backfill needed</span>
                      )}
                    </dd>
                  </>
                )}
                {selected.updated_at && selected.updated_at !== selected.created_at && (
                  <>
                    <dt className="text-muted-foreground">Updated</dt>
                    <dd>{format(new Date(selected.updated_at), "yyyy-MM-dd HH:mm:ss")}</dd>
                  </>
                )}
              </dl>
              <div>
                <div className="text-muted-foreground mb-1">Motivation</div>
                <pre className="whitespace-pre-wrap break-all font-mono text-xs bg-muted p-3 rounded">
                  {selected.motivation}
                </pre>
              </div>
              {selected.admin_notes && (
                <div>
                  <div className="text-muted-foreground mb-1">Admin notes</div>
                  <pre className="whitespace-pre-wrap break-all font-mono text-xs bg-muted p-3 rounded">
                    {selected.admin_notes}
                  </pre>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                {selected.status === "approved" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditHandleTarget(selected);
                      setSelected(null);
                    }}
                  >
                    Edit Handle
                  </Button>
                )}
                {selected.status !== "approved" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setApproveTarget(selected);
                      setSelected(null);
                    }}
                  >
                    Approve
                  </Button>
                )}
                {selected.status !== "rejected" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      setRejectTarget(selected);
                      setSelected(null);
                    }}
                  >
                    Reject
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve application</AlertDialogTitle>
            <AlertDialogDescription>
              Approve application #{approveTarget?.id} from{" "}
              {approveTarget ? applicantName(approveTarget) : ""}? Pick a referral handle for
              their tracking link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Input
              value={approveHandle}
              onChange={(e) => setApproveHandle(e.target.value)}
              placeholder="referral handle (e.g. jantje)"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              3-30 chars, letters/digits/_/-, stored as lowercase.
            </p>
            {approveHandle.length > 0 && !isHandleValid(approveHandle) && (
              <p className="text-xs text-destructive">Invalid format.</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!isHandleValid(approveHandle) || updateMutation.isPending}
              onClick={() =>
                approveTarget &&
                updateMutation.mutate({
                  id: approveTarget.id,
                  status: "approved",
                  referralHandle: approveHandle.trim().toLowerCase(),
                })
              }
            >
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editHandleTarget} onOpenChange={(open) => !open && setEditHandleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit referral handle</DialogTitle>
            <DialogDescription>
              {editHandleTarget ? `${applicantName(editHandleTarget)} — application #${editHandleTarget.id}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              value={editHandle}
              onChange={(e) => setEditHandle(e.target.value)}
              placeholder="referral handle (e.g. jantje)"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              3-30 chars, letters/digits/_/-, stored as lowercase.
            </p>
            {editHandle.length > 0 && !isHandleValid(editHandle) && (
              <p className="text-xs text-destructive">Invalid format.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditHandleTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={
                !editHandleTarget ||
                !isHandleValid(editHandle) ||
                editHandle.trim().toLowerCase() === (editHandleTarget?.referral_handle ?? "") ||
                editHandleMutation.isPending
              }
              onClick={() =>
                editHandleTarget &&
                editHandleMutation.mutate({
                  userId: editHandleTarget.user_id,
                  referralHandle: editHandle.trim().toLowerCase(),
                })
              }
            >
              {editHandleMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject application</AlertDialogTitle>
            <AlertDialogDescription>
              Reject application #{rejectTarget?.id} from{" "}
              {rejectTarget ? applicantName(rejectTarget) : ""}? You can optionally include a note
              that will be visible to the applicant.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            placeholder="Optional note for the applicant"
            className="min-h-[80px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                rejectTarget &&
                updateMutation.mutate({
                  id: rejectTarget.id,
                  status: "rejected",
                  adminNotes: rejectNotes.trim() ? rejectNotes.trim() : null,
                })
              }
              className="bg-destructive text-destructive-foreground"
            >
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
