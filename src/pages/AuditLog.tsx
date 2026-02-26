import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ArrowRightLeft, Clock, Loader2, ShieldAlert, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import PageTransition from "@/components/PageTransition";
import { cn } from "@/lib/utils";

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

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["superadmin_audit_log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("superadmin_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;

      // Fetch profiles for unique user_ids
      const userIds = [...new Set((data ?? []).map((d: any) => d.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);

      const profileMap = Object.fromEntries(
        (profiles ?? []).map((p) => [p.id, p])
      );

      return (data ?? []).map((entry: any) => ({
        ...entry,
        details: entry.details as AuditEntry["details"],
        profile: profileMap[entry.user_id] ?? null,
      })) as AuditEntry[];
    },
  });

  const filtered = entries.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.profile?.display_name?.toLowerCase().includes(q) ||
      e.details.from_tenant_name?.toLowerCase().includes(q) ||
      e.details.to_tenant_name?.toLowerCase().includes(q) ||
      e.action.toLowerCase().includes(q)
    );
  });

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
                <CardDescription>{filtered.length} entries</CardDescription>
              </div>
              <Input
                placeholder="Search by user or organization…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs"
              />
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
                      {/* Avatar */}
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

                      {/* Content */}
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
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
