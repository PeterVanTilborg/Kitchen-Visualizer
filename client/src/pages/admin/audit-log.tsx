import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ScrollText,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface AuditLogRow {
  id: number;
  user_id: string | null;
  user_email: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  changes: unknown | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface AuditLogResponse {
  rows: AuditLogRow[];
  total: number;
  page: number;
  pageSize: number;
}

interface AuditLogFilters {
  actors: string[];
  actions: string[];
  entityTypes: string[];
}

const PAGE_SIZE = 50;
const ALL_SENTINEL = "__all__";

function formatEntity(row: AuditLogRow): string {
  if (!row.entity_type) return "—";
  if (row.entity_id) return `${row.entity_type} #${row.entity_id}`;
  return row.entity_type;
}

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const h = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(h);
  }, [value, delay]);
  return debounced;
}

export default function AdminAuditLog() {
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [selectedRow, setSelectedRow] = useState<AuditLogRow | null>(null);

  const debouncedDateFrom = useDebounced(dateFrom, 300);
  const debouncedDateTo = useDebounced(dateTo, 300);

  // Reset to page 1 whenever any filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedDateFrom, debouncedDateTo, actor, action, entityType]);

  const queryUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    if (debouncedDateFrom) params.set("dateFrom", debouncedDateFrom);
    if (debouncedDateTo) params.set("dateTo", `${debouncedDateTo}T23:59:59.999`);
    if (actor) params.set("actor", actor);
    if (action) params.set("action", action);
    if (entityType) params.set("entityType", entityType);
    return `/api/admin/audit-log?${params.toString()}`;
  }, [page, debouncedDateFrom, debouncedDateTo, actor, action, entityType]);

  const { data, isLoading, error, refetch, isFetching } = useQuery<AuditLogResponse>({
    queryKey: [queryUrl],
  });

  const { data: filters } = useQuery<AuditLogFilters>({
    queryKey: ["/api/admin/audit-log/filters"],
  });

  // Escape closes modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedRow(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setActor("");
    setAction("");
    setEntityType("");
  };

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstRow = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRow = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ScrollText className="h-6 w-6" />
          Audit Log
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          data-testid="button-audit-log-refresh"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="filter-date-from" className="text-xs">Date From</Label>
            <Input
              id="filter-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-40"
              data-testid="input-audit-date-from"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="filter-date-to" className="text-xs">Date To</Label>
            <Input
              id="filter-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40"
              data-testid="input-audit-date-to"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Actor</Label>
            <Select
              value={actor || ALL_SENTINEL}
              onValueChange={(v) => setActor(v === ALL_SENTINEL ? "" : v)}
            >
              <SelectTrigger className="w-56" data-testid="select-audit-actor">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SENTINEL}>All actors</SelectItem>
                {filters?.actors.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Action</Label>
            <Select
              value={action || ALL_SENTINEL}
              onValueChange={(v) => setAction(v === ALL_SENTINEL ? "" : v)}
            >
              <SelectTrigger className="w-56" data-testid="select-audit-action">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SENTINEL}>All actions</SelectItem>
                {filters?.actions.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Entity Type</Label>
            <Select
              value={entityType || ALL_SENTINEL}
              onValueChange={(v) => setEntityType(v === ALL_SENTINEL ? "" : v)}
            >
              <SelectTrigger className="w-48" data-testid="select-audit-entity-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SENTINEL}>All types</SelectItem>
                {filters?.entityTypes.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            data-testid="button-audit-clear-filters"
          >
            Clear Filters
          </Button>
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load audit log. Please try again.</AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-44">Timestamp</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead className="w-28 text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : data?.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No audit log entries match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.rows.map((row) => (
                    <TableRow key={row.id} data-testid={`row-audit-${row.id}`}>
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
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{row.user_email ?? "(system)"}</span>
                          {row.actor_role && (
                            <Badge variant="secondary" className="text-xs">
                              {row.actor_role}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {row.action}
                        </code>
                      </TableCell>
                      <TableCell className="text-sm">{formatEntity(row)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {row.ip_address ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRow(row)}
                          data-testid={`button-audit-details-${row.id}`}
                        >
                          Details
                        </Button>
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
          {total === 0 ? "0 entries" : `Showing ${firstRow}–${lastRow} of ${total}`}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isLoading}
            data-testid="button-audit-prev-page"
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
            data-testid="button-audit-next-page"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      <Dialog open={!!selectedRow} onOpenChange={(open) => !open && setSelectedRow(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit log entry #{selectedRow?.id}</DialogTitle>
            <DialogDescription>
              Full details of this admin action.
            </DialogDescription>
          </DialogHeader>
          {selectedRow && (
            <div className="space-y-4 text-sm">
              <dl className="grid grid-cols-[120px_1fr] gap-y-2">
                <dt className="text-muted-foreground">Timestamp</dt>
                <dd className="font-mono text-xs">
                  {format(new Date(selectedRow.created_at), "yyyy-MM-dd HH:mm:ss")}
                </dd>
                <dt className="text-muted-foreground">Actor</dt>
                <dd>
                  {selectedRow.user_email ?? "(system)"}
                  {selectedRow.actor_role && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {selectedRow.actor_role}
                    </Badge>
                  )}
                </dd>
                <dt className="text-muted-foreground">Actor ID</dt>
                <dd className="font-mono text-xs">{selectedRow.user_id ?? "—"}</dd>
                <dt className="text-muted-foreground">Action</dt>
                <dd>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {selectedRow.action}
                  </code>
                </dd>
                <dt className="text-muted-foreground">Entity</dt>
                <dd>{formatEntity(selectedRow)}</dd>
                <dt className="text-muted-foreground">IP</dt>
                <dd className="font-mono text-xs">{selectedRow.ip_address ?? "—"}</dd>
              </dl>
              <div>
                <div className="text-muted-foreground mb-1">Changes</div>
                {selectedRow.changes === null ? (
                  <div className="text-muted-foreground italic text-xs">(no diff recorded)</div>
                ) : (
                  <pre className="whitespace-pre-wrap break-all font-mono text-xs bg-muted p-3 rounded max-h-80 overflow-auto">
                    {JSON.stringify(selectedRow.changes, null, 2)}
                  </pre>
                )}
              </div>
              <div>
                <div className="text-muted-foreground mb-1">User Agent</div>
                <pre className="whitespace-pre-wrap break-all font-mono text-xs bg-muted p-3 rounded">
                  {selectedRow.user_agent ?? "—"}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
