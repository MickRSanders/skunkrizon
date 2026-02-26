import { useState, useRef, useEffect, useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ArrowRightLeft, Clock, Download, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import PageTransition from "@/components/PageTransition";

const PAGE_SIZE = 30;

interface AuditEntry {
  id: string;
  user_id: string;
  action: string;
  details: {
    from_tenant_id?: string;
    from_tenant_name?: string;
    to_tenant_id?: string;
    to_tenant_name?: string;
  };
  created_at: string;
  profile?: { display_name: string | null; avatar_url: string | null } | null;
}

export default function AuditLog() {
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      // Fetch ALL entries for export (not just loaded pages)
      const { data: allRows, error } = await supabase
        .from("superadmin_audit_log")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((allRows ?? []).map((d: any) => d.user_id))];
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("id, display_name").in("id", userIds)
        : { data: [] };
      const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

      const csvRows = [
        ["Timestamp", "User", "User ID", "Action", "From Organization", "To Organization"].join(","),
        ...(allRows ?? []).map((row: any) => {
          const d = row.details as AuditEntry["details"];
          const name = profileMap[row.user_id]?.display_name || "Unknown";
          return [
            `"${format(new Date(row.created_at), "yyyy-MM-dd HH:mm:ss")}"`,
            `"${name.replace(/"/g, '""')}"`,
            row.user_id,
            row.action,
            `"${(d.from_tenant_name || "—").replace(/"/g, '""')}"`,
            `"${(d.to_tenant_name || "—").replace(/"/g, '""')}"`,
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
      // silent fail
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
    queryKey: ["superadmin_audit_log"],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data: rows, error } = await supabase
        .from("superadmin_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;

      const userIds = [...new Set((rows ?? []).map((d: any) => d.user_id))];
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("id, display_name, avatar_url").in("id", userIds)
        : { data: [] };

      const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

      const entries = (rows ?? []).map((entry: any) => ({
        ...entry,
        details: entry.details as AuditEntry["details"],
        profile: profileMap[entry.user_id] ?? null,
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
      e.details.from_tenant_name?.toLowerCase().includes(q) ||
      e.details.to_tenant_name?.toLowerCase().includes(q) ||
      e.action.toLowerCase().includes(q)
    );
  });

  // Intersection observer for infinite scroll
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

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track superadmin organization switches for compliance.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="text-base">Organization Switches</CardTitle>
                <CardDescription>
                  {filtered.length} entries{hasNextPage ? "+" : ""}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search by user or organization…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="max-w-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filtered.length === 0 || exporting}
                  onClick={handleExportCsv}
                >
                  {exporting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  ) : (
                    <Download className="w-4 h-4 mr-1.5" />
                  )}
                  Export CSV
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
                  Entries appear when a superadmin switches organizations.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((entry) => {
                  const initials = (entry.profile?.display_name || "?")
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <div
                      key={entry.id}
                      className="flex items-start gap-4 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                        {entry.profile?.avatar_url ? (
                          <img
                            src={entry.profile.avatar_url}
                            alt=""
                            className="w-9 h-9 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-[11px] font-semibold text-primary-foreground">
                            {initials}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground">
                            {entry.profile?.display_name || "Unknown user"}
                          </span>
                          <Badge variant="outline" className="text-[10px] gap-1 font-normal">
                            <ArrowRightLeft className="w-2.5 h-2.5" />
                            org_switch
                          </Badge>
                        </div>

                        <p className="text-[13px] text-muted-foreground mt-0.5">
                          Switched from{" "}
                          <span className="font-medium text-foreground">
                            {entry.details.from_tenant_name || "—"}
                          </span>{" "}
                          to{" "}
                          <span className="font-medium text-foreground">
                            {entry.details.to_tenant_name || "—"}
                          </span>
                        </p>

                        <div className="flex items-center gap-1.5 mt-1">
                          <Clock className="w-3 h-3 text-muted-foreground/50" />
                          <span className="text-[11px] text-muted-foreground/60">
                            {format(new Date(entry.created_at), "MMM d, yyyy 'at' h:mm:ss a")}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-1" />
            {isFetchingNextPage && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!hasNextPage && allEntries.length > 0 && (
              <p className="text-center text-xs text-muted-foreground/50 py-3">
                End of log
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
