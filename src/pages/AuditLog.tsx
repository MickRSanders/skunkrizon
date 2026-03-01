import { useState, useRef, useEffect, useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, endOfDay } from "date-fns";
import {
  ArrowRightLeft, CalendarIcon, Clock, Download, Loader2,
  ShieldAlert, X, Plus, Pencil, Trash2, RefreshCw, LogIn,
  Settings, FileText, Users, Database, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import PageTransition from "@/components/PageTransition";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 40;

interface AuditEntry {
  id: string;
  user_id: string | null;
  action: string;
  category: string;
  table_name: string | null;
  record_id: string | null;
  tenant_id: string | null;
  summary: string;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  changed_fields: string[] | null;
  metadata: Record<string, any> | null;
  created_at: string;
  profile?: { display_name: string | null; avatar_url: string | null } | null;
}

const ACTION_ICONS: Record<string, typeof Plus> = {
  INSERT: Plus,
  UPDATE: Pencil,
  DELETE: Trash2,
  STATUS_CHANGE: RefreshCw,
  LOGIN: LogIn,
  LOGOUT: LogIn,
  org_switch: ArrowRightLeft,
};

const ACTION_COLORS: Record<string, string> = {
  INSERT: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  UPDATE: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  DELETE: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  STATUS_CHANGE: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  LOGIN: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  LOGOUT: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  org_switch: "bg-primary/10 text-primary border-primary/20",
};

const CATEGORY_ICONS: Record<string, typeof Database> = {
  data: Database,
  config: Settings,
  status: RefreshCw,
  auth: LogIn,
  admin: ShieldAlert,
};

const TABLE_LABELS: Record<string, string> = {
  simulations: "Simulations",
  employees: "Employees",
  policies: "Policies",
  calculations: "Calculations",
  loa_templates: "LOA Templates",
  loa_documents: "LOA Documents",
  cost_estimate_templates: "CE Templates",
  cost_estimates: "Cost Estimates",
  remote_work_requests: "Remote Work",
  trips: "Trips",
  lookup_tables: "Lookup Tables",
  field_library: "Field Library",
  field_mappings: "Field Mappings",
  simulation_groups: "Sim Groups",
  balance_sheets: "Balance Sheets",
  pay_instructions: "Pay Instructions",
  pta_module_config: "PTA Config",
  tenant_tax_settings: "Tax Settings",
  tenant_modules: "Modules",
  role_permissions: "Permissions",
  tenants: "Organizations",
};

export default function AuditLog() {
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [detailEntry, setDetailEntry] = useState<AuditEntry | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const applyDateFilters = (query: any) => {
    if (dateFrom) query = query.gte("created_at", startOfDay(dateFrom).toISOString());
    if (dateTo) query = query.lte("created_at", endOfDay(dateTo).toISOString());
    return query;
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      let q = supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5000);
      q = applyDateFilters(q);
      if (categoryFilter !== "all") q = q.eq("category", categoryFilter);
      if (tableFilter !== "all") q = q.eq("table_name", tableFilter);
      if (actionFilter !== "all") q = q.eq("action", actionFilter);
      const { data: allRows, error } = await q;
      if (error) throw error;

      const userIds = [...new Set((allRows ?? []).map((d: any) => d.user_id).filter(Boolean))];
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("id, display_name").in("id", userIds)
        : { data: [] };
      const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

      const csvRows = [
        ["Timestamp", "User", "Action", "Category", "Table", "Summary", "Changed Fields"].join(","),
        ...(allRows ?? []).map((row: any) => {
          const name = row.user_id ? (profileMap[row.user_id]?.display_name || "Unknown") : "System";
          return [
            `"${format(new Date(row.created_at), "yyyy-MM-dd HH:mm:ss")}"`,
            `"${name.replace(/"/g, '""')}"`,
            row.action,
            row.category,
            row.table_name || "",
            `"${(row.summary || "").replace(/"/g, '""')}"`,
            `"${(row.changed_fields || []).join(", ")}"`,
          ].join(",");
        }),
      ];

      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    } finally {
      setExporting(false);
    }
  };

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["audit_log", dateFrom?.toISOString(), dateTo?.toISOString(), categoryFilter, tableFilter, actionFilter],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let q = supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, to);
      q = applyDateFilters(q);
      if (categoryFilter !== "all") q = q.eq("category", categoryFilter);
      if (tableFilter !== "all") q = q.eq("table_name", tableFilter);
      if (actionFilter !== "all") q = q.eq("action", actionFilter);
      const { data: rows, error } = await q;
      if (error) throw error;

      const userIds = [...new Set((rows ?? []).map((d: any) => d.user_id).filter(Boolean))];
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("id, display_name, avatar_url").in("id", userIds)
        : { data: [] };

      const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

      const entries = (rows ?? []).map((entry: any) => ({
        ...entry,
        profile: entry.user_id ? (profileMap[entry.user_id] ?? null) : null,
      })) as AuditEntry[];

      return { entries, nextPage: entries.length === PAGE_SIZE ? pageParam + 1 : undefined };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });

  const allEntries = data?.pages.flatMap((p) => p.entries) ?? [];

  const filtered = allEntries.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.profile?.display_name?.toLowerCase().includes(q) ||
      e.summary?.toLowerCase().includes(q) ||
      e.table_name?.toLowerCase().includes(q) ||
      e.action.toLowerCase().includes(q)
    );
  });

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleObserver]);

  const renderEntry = (entry: AuditEntry) => {
    const Icon = ACTION_ICONS[entry.action] || Pencil;
    const colorClass = ACTION_COLORS[entry.action] || ACTION_COLORS.UPDATE;
    const initials = (entry.profile?.display_name || "S")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    return (
      <div
        key={entry.id}
        className="flex items-start gap-3 py-3 first:pt-0 last:pb-0 cursor-pointer hover:bg-muted/30 rounded-md px-2 -mx-2 transition-colors"
        onClick={() => setDetailEntry(entry)}
      >
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
          {entry.profile?.avatar_url ? (
            <img src={entry.profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <span className="text-[10px] font-semibold text-muted-foreground">{initials}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">
              {entry.profile?.display_name || "System"}
            </span>
            <Badge variant="outline" className={cn("text-[10px] gap-1 font-normal border", colorClass)}>
              <Icon className="w-2.5 h-2.5" />
              {entry.action.toLowerCase().replace("_", " ")}
            </Badge>
            {entry.table_name && (
              <Badge variant="secondary" className="text-[10px] font-normal">
                {TABLE_LABELS[entry.table_name] || entry.table_name}
              </Badge>
            )}
          </div>

          <p className="text-[13px] text-muted-foreground mt-0.5 truncate">
            {entry.summary}
          </p>

          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-muted-foreground/50" />
              <span className="text-[11px] text-muted-foreground/60">
                {format(new Date(entry.created_at), "MMM d, yyyy 'at' h:mm:ss a")}
              </span>
            </div>
            {entry.changed_fields && entry.changed_fields.length > 0 && (
              <span className="text-[11px] text-muted-foreground/50">
                {entry.changed_fields.length} field{entry.changed_fields.length !== 1 ? "s" : ""} changed
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Stats
  const stats = {
    total: filtered.length,
    inserts: filtered.filter((e) => e.action === "INSERT").length,
    updates: filtered.filter((e) => e.action === "UPDATE").length,
    deletes: filtered.filter((e) => e.action === "DELETE").length,
    statusChanges: filtered.filter((e) => e.action === "STATUS_CHANGE").length,
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track all data changes, status transitions, and admin activity.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total Events", value: stats.total, icon: Database },
            { label: "Created", value: stats.inserts, icon: Plus },
            { label: "Updated", value: stats.updates, icon: Pencil },
            { label: "Deleted", value: stats.deletes, icon: Trash2 },
            { label: "Status Changes", value: stats.statusChanges, icon: RefreshCw },
          ].map((s) => (
            <Card key={s.label} className="py-3">
              <CardContent className="p-0 px-4 flex items-center gap-2">
                <s.icon className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-lg font-bold text-foreground">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="text-base">Activity Feed</CardTitle>
                <CardDescription>
                  {filtered.length} entries{hasNextPage ? "+" : ""}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Category filter */}
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[130px] h-8 text-xs">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    <SelectItem value="data">Data</SelectItem>
                    <SelectItem value="config">Config</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="auth">Auth</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>

                {/* Action filter */}
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-[130px] h-8 text-xs">
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All actions</SelectItem>
                    <SelectItem value="INSERT">Created</SelectItem>
                    <SelectItem value="UPDATE">Updated</SelectItem>
                    <SelectItem value="DELETE">Deleted</SelectItem>
                    <SelectItem value="STATUS_CHANGE">Status Change</SelectItem>
                  </SelectContent>
                </Select>

                {/* Table filter */}
                <Select value={tableFilter} onValueChange={setTableFilter}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue placeholder="Table" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All tables</SelectItem>
                    {Object.entries(TABLE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Date From */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn("w-[130px] justify-start text-left font-normal h-8 text-xs", !dateFrom && "text-muted-foreground")}
                    >
                      <CalendarIcon className="w-3 h-3 mr-1" />
                      {dateFrom ? format(dateFrom, "MMM d, yyyy") : "From"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} disabled={(d) => (dateTo ? d > dateTo : false)} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>

                {/* Date To */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn("w-[130px] justify-start text-left font-normal h-8 text-xs", !dateTo && "text-muted-foreground")}
                    >
                      <CalendarIcon className="w-3 h-3 mr-1" />
                      {dateTo ? format(dateTo, "MMM d, yyyy") : "To"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateTo} onSelect={setDateTo} disabled={(d) => (dateFrom ? d < dateFrom : false)} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>

                {(dateFrom || dateTo || categoryFilter !== "all" || tableFilter !== "all" || actionFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setDateFrom(undefined); setDateTo(undefined); setCategoryFilter("all"); setTableFilter("all"); setActionFilter("all"); }}
                    className="px-2 h-8"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}

                <Input
                  placeholder="Search…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="max-w-[180px] h-8 text-xs"
                />
                <Button variant="outline" size="sm" disabled={filtered.length === 0 || exporting} onClick={handleExportCsv} className="h-8">
                  {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Download className="w-3.5 h-3.5 mr-1" />}
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <ShieldAlert className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No audit entries found.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Entries appear automatically when data is created, updated, or deleted.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map(renderEntry)}
              </div>
            )}

            <div ref={sentinelRef} className="h-1" />
            {isFetchingNextPage && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!hasNextPage && allEntries.length > 0 && (
              <p className="text-center text-xs text-muted-foreground/50 py-3">End of log</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailEntry} onOpenChange={(open) => !open && setDetailEntry(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Audit Entry Detail
              {detailEntry && (
                <Badge variant="outline" className={cn("text-xs", ACTION_COLORS[detailEntry.action])}>
                  {detailEntry.action.toLowerCase().replace("_", " ")}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {detailEntry && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">User</p>
                    <p className="font-medium">{detailEntry.profile?.display_name || "System"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Timestamp</p>
                    <p className="font-medium">{format(new Date(detailEntry.created_at), "MMM d, yyyy h:mm:ss a")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Table</p>
                    <p className="font-medium">{TABLE_LABELS[detailEntry.table_name || ""] || detailEntry.table_name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Category</p>
                    <p className="font-medium capitalize">{detailEntry.category}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs">Summary</p>
                    <p className="font-medium">{detailEntry.summary}</p>
                  </div>
                  {detailEntry.record_id && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs">Record ID</p>
                      <p className="font-mono text-xs">{detailEntry.record_id}</p>
                    </div>
                  )}
                </div>

                {detailEntry.changed_fields && detailEntry.changed_fields.length > 0 && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-2">Changed Fields</p>
                    <div className="flex flex-wrap gap-1.5">
                      {detailEntry.changed_fields.map((f) => (
                        <Badge key={f} variant="secondary" className="text-xs font-mono">{f}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {detailEntry.changed_fields && detailEntry.old_data && detailEntry.new_data && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-2">Field Changes</p>
                    <div className="border rounded-md overflow-hidden text-xs">
                      <div className="grid grid-cols-3 gap-0 bg-muted/50 px-3 py-1.5 font-medium text-muted-foreground">
                        <span>Field</span>
                        <span>Before</span>
                        <span>After</span>
                      </div>
                      {detailEntry.changed_fields.map((field) => (
                        <div key={field} className="grid grid-cols-3 gap-0 px-3 py-1.5 border-t">
                          <span className="font-mono text-muted-foreground">{field}</span>
                          <span className="text-red-600 dark:text-red-400 truncate">
                            {JSON.stringify(detailEntry.old_data?.[field]) ?? "—"}
                          </span>
                          <span className="text-emerald-600 dark:text-emerald-400 truncate">
                            {JSON.stringify(detailEntry.new_data?.[field]) ?? "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detailEntry.action === "INSERT" && detailEntry.new_data && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-2">Created Record Data</p>
                    <pre className="text-xs bg-muted/50 rounded-md p-3 overflow-auto max-h-48 font-mono">
                      {JSON.stringify(detailEntry.new_data, null, 2)}
                    </pre>
                  </div>
                )}

                {detailEntry.action === "DELETE" && detailEntry.old_data && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-2">Deleted Record Data</p>
                    <pre className="text-xs bg-muted/50 rounded-md p-3 overflow-auto max-h-48 font-mono">
                      {JSON.stringify(detailEntry.old_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
