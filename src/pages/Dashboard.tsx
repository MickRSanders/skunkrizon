import { useMemo } from "react";
import KPICard from "@/components/KPICard";
import StatusBadge from "@/components/StatusBadge";
import {
  Calculator, FileText, Users, TrendingUp, Globe, ArrowRight,
  Building2, Plus, Plane, Clock, AlertTriangle, CheckCircle2,
  Activity, Loader2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTenantContext } from "@/contexts/TenantContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { formatDistanceToNow } from "date-fns";
import { useDisabledNotificationTypes } from "@/hooks/useNotificationPreferences";

export default function Dashboard() {
  const { user } = useAuth();
  const { activeTenant, activeSubTenant } = useTenantContext();
  const navigate = useNavigate();
  const tenantId = activeTenant?.tenant_id;
  const subTenantId = activeSubTenant?.id;

  // ─── Live KPI queries ────────────────────────────────────────
  const tenantFilter = (q: any) => {
    if (!tenantId) return q;
    q = q.eq("tenant_id", tenantId);
    if (subTenantId) q = q.eq("sub_tenant_id", subTenantId);
    return q;
  };

  const { data: simStats, isLoading: loadingSims } = useQuery({
    queryKey: ["dashboard_sims", tenantId, subTenantId],
    queryFn: async () => {
      const { data, error } = await tenantFilter(
        supabase.from("simulations").select("id, status, total_cost, created_at")
      );
      if (error) throw error;
      return data || [];
    },
  });

  const { data: policies, isLoading: loadingPolicies } = useQuery({
    queryKey: ["dashboard_policies", tenantId, subTenantId],
    queryFn: async () => {
      const { data, error } = await tenantFilter(
        supabase.from("policies").select("id, status, name, tier")
      );
      if (error) throw error;
      return data || [];
    },
  });

  const { data: trips, isLoading: loadingTrips } = useQuery({
    queryKey: ["dashboard_trips", tenantId, subTenantId],
    queryFn: async () => {
      const q = supabase.from("trips").select("id, status, traveler_name, created_at, trip_code");
      if (tenantId) q.eq("tenant_id", tenantId);
      if (subTenantId) q.eq("sub_tenant_id", subTenantId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: recentSims } = useQuery({
    queryKey: ["dashboard_recent_sims", tenantId, subTenantId],
    queryFn: async () => {
      let q = supabase
        .from("simulations")
        .select("id, sim_code, employee_name, origin_country, origin_city, destination_country, destination_city, total_cost, status, created_at, currency")
        .order("created_at", { ascending: false })
        .limit(5);
      if (tenantId) q = q.eq("tenant_id", tenantId);
      if (subTenantId) q = q.eq("sub_tenant_id", subTenantId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // ─── Recent activity (notifications for this user) ───────────
  const { data: recentActivity } = useQuery({
    queryKey: ["dashboard_activity", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data || [];
    },
  });

  const disabledTypes = useDisabledNotificationTypes();
  const filteredActivity = useMemo(() => {
    if (!recentActivity) return [];
    return recentActivity.filter(
      (n: any) => !n.entity_type || !disabledTypes.has(n.entity_type)
    );
  }, [recentActivity, disabledTypes]);

  // ─── Derived stats ──────────────────────────────────────────
  const totalSims = simStats?.length ?? 0;
  const completedSims = simStats?.filter((s) => s.status === "completed").length ?? 0;
  const draftSims = simStats?.filter((s) => s.status === "draft").length ?? 0;
  const runningSims = simStats?.filter((s) => s.status === "running").length ?? 0;
  const activePolicies = policies?.filter((p) => p.status === "active").length ?? 0;
  const draftPolicies = policies?.filter((p) => p.status === "draft").length ?? 0;
  const totalTrips = trips?.length ?? 0;
  const attentionTrips = trips?.filter((t) => ["needs_info", "attention", "escalate"].includes(t.status)).length ?? 0;

  const avgCost = useMemo(() => {
    if (!simStats || simStats.length === 0) return 0;
    const withCost = simStats.filter((s) => s.total_cost != null);
    if (withCost.length === 0) return 0;
    return withCost.reduce((sum, s) => sum + (s.total_cost || 0), 0) / withCost.length;
  }, [simStats]);

  // Chart data from real sims grouped by month
  const simChartData = useMemo(() => {
    if (!simStats) return [];
    const months: Record<string, number> = {};
    simStats.forEach((s) => {
      const d = new Date(s.created_at);
      const key = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
      months[key] = (months[key] || 0) + 1;
    });
    return Object.entries(months)
      .slice(-6)
      .map(([month, count]) => ({ month, count }));
  }, [simStats]);

  // Policy tier distribution
  const tierData = useMemo(() => {
    if (!policies || policies.length === 0) return [];
    const tiers: Record<string, number> = {};
    policies.forEach((p) => {
      const t = p.tier || "custom";
      tiers[t] = (tiers[t] || 0) + 1;
    });
    const colors: Record<string, string> = {
      gold: "hsl(38, 92%, 50%)",
      silver: "hsl(220, 10%, 60%)",
      bronze: "hsl(25, 60%, 45%)",
      custom: "hsl(174, 62%, 40%)",
    };
    return Object.entries(tiers).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: colors[name.toLowerCase()] || "hsl(222, 62%, 40%)",
    }));
  }, [policies]);

  // ─── Tasks that need attention ──────────────────────────────
  const actionItems = useMemo(() => {
    const items: { label: string; count: number; icon: typeof AlertTriangle; link: string; color: string }[] = [];
    if (draftSims > 0) items.push({ label: "Draft simulations to complete", count: draftSims, icon: Calculator, link: "/simulations", color: "text-amber-500" });
    if (runningSims > 0) items.push({ label: "Simulations currently running", count: runningSims, icon: Loader2, link: "/simulations", color: "text-blue-500" });
    if (draftPolicies > 0) items.push({ label: "Policies in draft status", count: draftPolicies, icon: FileText, link: "/policies", color: "text-amber-500" });
    if (attentionTrips > 0) items.push({ label: "Trips needing attention", count: attentionTrips, icon: AlertTriangle, link: "/pre-travel", color: "text-destructive" });
    return items;
  }, [draftSims, runningSims, draftPolicies, attentionTrips]);

  const isLoading = loadingSims || loadingPolicies || loadingTrips;

  // ─── Sub-tenant counts (existing feature) ──────────────────
  const { data: subCounts } = useQuery({
    queryKey: ["sub_tenant_counts", tenantId, subTenantId],
    enabled: !!subTenantId && !!tenantId,
    queryFn: async () => {
      const filter = (q: any) => q.eq("tenant_id", tenantId!).eq("sub_tenant_id", subTenantId!);
      const [sims, pols, calcs] = await Promise.all([
        filter(supabase.from("simulations").select("id", { count: "exact", head: true })),
        filter(supabase.from("policies").select("id", { count: "exact", head: true })),
        filter(supabase.from("calculations").select("id", { count: "exact", head: true })),
      ]);
      return {
        simulations: sims.count ?? 0,
        policies: pols.count ?? 0,
        calculations: calcs.count ?? 0,
      };
    },
  });

  return (
    <div className="space-y-6">
      {/* Header with quick actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Platform overview and key metrics</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" onClick={() => navigate("/simulations")} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> New Simulation
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/pre-travel")} className="gap-1.5">
            <Plane className="w-3.5 h-3.5" /> New Trip
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/policies")} className="gap-1.5">
            <FileText className="w-3.5 h-3.5" /> New Policy
          </Button>
        </div>
      </div>

      {activeSubTenant && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-lg border border-accent/20 bg-accent/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-accent shrink-0" />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{activeSubTenant.name}</span>
              <Badge variant="outline" className="text-xs">Active Sub-organization</Badge>
            </div>
          </div>
          {subCounts && (
            <div className="sm:ml-auto flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span><strong className="text-foreground">{subCounts.simulations}</strong> Sims</span>
              <span><strong className="text-foreground">{subCounts.policies}</strong> Policies</span>
              <span><strong className="text-foreground">{subCounts.calculations}</strong> Calcs</span>
            </div>
          )}
        </div>
      )}

      {/* KPI Cards — live data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Simulations"
          value={isLoading ? "—" : String(totalSims)}
          change={completedSims > 0 ? `${completedSims} completed` : undefined}
          changeType="positive"
          icon={<Calculator className="w-5 h-5" />}
          subtitle={draftSims > 0 ? `${draftSims} drafts` : undefined}
          link="/simulations"
        />
        <KPICard
          title="Active Policies"
          value={isLoading ? "—" : String(activePolicies)}
          change={draftPolicies > 0 ? `${draftPolicies} in draft` : undefined}
          changeType="neutral"
          icon={<FileText className="w-5 h-5" />}
          subtitle={`${policies?.length ?? 0} total`}
          link="/policies"
        />
        <KPICard
          title="Trips"
          value={isLoading ? "—" : String(totalTrips)}
          change={attentionTrips > 0 ? `${attentionTrips} need attention` : undefined}
          changeType={attentionTrips > 0 ? "negative" : "neutral"}
          icon={<Plane className="w-5 h-5" />}
          subtitle="Pre-travel assessments"
          link="/pre-travel"
        />
        <KPICard
          title="Avg. Cost/Move"
          value={isLoading ? "—" : avgCost > 0 ? `$${Math.round(avgCost / 1000)}K` : "$0"}
          change={totalSims > 0 ? `Across ${totalSims} simulations` : undefined}
          changeType="neutral"
          icon={<TrendingUp className="w-5 h-5" />}
          subtitle="All assignments"
          link="/simulations"
        />
      </div>

      {/* Tasks & Alerts + Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tasks & Alerts */}
        <div className="bg-card rounded-lg border border-border p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Needs Attention
          </h3>
          {actionItems.length === 0 ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="w-8 h-8 text-accent/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">All clear! Nothing needs your attention right now.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {actionItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.link}
                  className="flex items-center gap-3 p-3 rounded-md border border-border hover:bg-muted/50 transition-colors group"
                >
                  <item.icon className={`w-4 h-4 ${item.color} shrink-0`} />
                  <span className="text-sm text-foreground flex-1">{item.label}</span>
                  <Badge variant="secondary" className="text-xs font-bold">{item.count}</Badge>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity Timeline */}
        <div className="bg-card rounded-lg border border-border p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-accent" />
            Recent Activity
          </h3>
          {filteredActivity.length === 0 ? (
            <div className="py-6 text-center">
              <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No recent activity yet.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredActivity.map((n: any) => {
                const linkMap: Record<string, string> = {
                  simulation: `/simulations?sim=${n.entity_id}`,
                  trip: `/pre-travel/${n.entity_id}`,
                  policy: "/policies",
                };
                const href = n.entity_type && n.entity_id ? linkMap[n.entity_type] : undefined;
                const Wrapper = href ? "a" : "div";
                return (
                  <div
                    key={n.id}
                    className={`group flex items-start gap-3 p-2 rounded-md hover:bg-muted/30 transition-colors ${href ? "cursor-pointer" : ""}`}
                    onClick={href ? () => navigate(href) : undefined}
                  >
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      n.type === "success" ? "bg-accent" : n.type === "error" ? "bg-destructive" : "bg-muted-foreground/40"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{n.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{n.message}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </span>
                      {href && <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card rounded-lg border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Simulations Over Time</h3>
          {simChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={simChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
              No simulation data yet
            </div>
          )}
        </div>
        <div className="bg-card rounded-lg border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Policy Tier Distribution</h3>
          {tierData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={tierData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {tierData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {tierData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-medium text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
              No policies yet
            </div>
          )}
        </div>
      </div>

      {/* Recent Simulations Table — live data */}
      <div className="bg-card rounded-lg border border-border">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Recent Cost Simulations</h3>
          <Link to="/simulations" className="text-xs font-medium text-accent hover:underline flex items-center gap-1">
            View All <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Employee</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Route</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Cost</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody>
              {recentSims && recentSims.length > 0 ? recentSims.map((sim) => (
                <tr key={sim.id} className="data-table-row cursor-pointer" onClick={() => navigate(`/simulations?sim=${sim.id}`)}>
                  <td className="px-5 py-3 font-mono text-xs text-accent">{sim.sim_code}</td>
                  <td className="px-5 py-3 font-medium text-foreground">{sim.employee_name}</td>
                  <td className="px-5 py-3 text-muted-foreground">
                    <div className="flex items-center gap-1 text-xs">
                      {sim.origin_city || sim.origin_country}
                      <ArrowRight className="w-3 h-3 text-accent" />
                      {sim.destination_city || sim.destination_country}
                    </div>
                  </td>
                  <td className="px-5 py-3 font-semibold text-foreground">
                    {sim.total_cost != null
                      ? `${sim.currency === "USD" ? "$" : sim.currency + " "}${Math.round(sim.total_cost).toLocaleString()}`
                      : "—"}
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={sim.status} /></td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(sim.created_at), { addSuffix: true })}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    No simulations yet. Create your first one!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
