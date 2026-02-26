import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "@/contexts/TenantContext";
import KPICard from "@/components/KPICard";
import { BarChart3, Users, TrendingUp, DollarSign, Loader2, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend } from "recharts";
import { useSimulations } from "@/hooks/useSimulations";
import { format, subMonths, startOfMonth } from "date-fns";

export default function Analytics() {
  const { activeTenant } = useTenantContext();
  const tenantId = activeTenant?.tenant_id;
  const { data: simulations, isLoading } = useSimulations();

  // Fetch user activity: simulations + trips per user
  const { data: userActivity = [] } = useQuery({
    queryKey: ["user-activity", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      // Get simulations grouped by owner
      const { data: sims } = await supabase
        .from("simulations")
        .select("owner_id")
        .eq("tenant_id", tenantId);

      // Get trips grouped by creator
      const { data: trips } = await supabase
        .from("trips")
        .select("created_by")
        .eq("tenant_id", tenantId);

      // Get profiles for display names
      const userIds = new Set([
        ...(sims ?? []).map((s) => s.owner_id),
        ...(trips ?? []).map((t) => t.created_by),
      ]);
      if (userIds.size === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", Array.from(userIds));

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? "Unknown"]));

      // Aggregate
      const counts: Record<string, { name: string; simulations: number; trips: number }> = {};
      for (const s of sims ?? []) {
        if (!counts[s.owner_id]) counts[s.owner_id] = { name: profileMap.get(s.owner_id) ?? "Unknown", simulations: 0, trips: 0 };
        counts[s.owner_id].simulations++;
      }
      for (const t of trips ?? []) {
        if (!counts[t.created_by]) counts[t.created_by] = { name: profileMap.get(t.created_by) ?? "Unknown", simulations: 0, trips: 0 };
        counts[t.created_by].trips++;
      }

      return Object.values(counts)
        .map((u) => ({ ...u, total: u.simulations + u.trips }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
    },
    enabled: !!tenantId,
  });

  const stats = useMemo(() => {
    if (!simulations) return null;

    const now = new Date();
    const thisMonth = startOfMonth(now);
    const lastMonth = startOfMonth(subMonths(now, 1));

    const thisMonthSims = simulations.filter((s) => new Date(s.created_at) >= thisMonth);
    const lastMonthSims = simulations.filter((s) => {
      const d = new Date(s.created_at);
      return d >= lastMonth && d < thisMonth;
    });

    const simChange = lastMonthSims.length > 0
      ? ((thisMonthSims.length - lastMonthSims.length) / lastMonthSims.length * 100).toFixed(1)
      : null;

    const completedSims = simulations.filter((s) => s.status === "completed");
    const avgCost = completedSims.length > 0
      ? Math.round(completedSims.reduce((sum, s) => sum + (s.total_cost ?? 0), 0) / completedSims.length)
      : 0;

    // Monthly trend (last 6 months)
    const monthlyData = Array.from({ length: 6 }, (_, i) => {
      const month = subMonths(now, 5 - i);
      const start = startOfMonth(month);
      const end = startOfMonth(subMonths(now, 4 - i));
      const count = simulations.filter((s) => {
        const d = new Date(s.created_at);
        return d >= start && (i < 5 ? d < end : true);
      }).length;
      return { month: format(month, "MMM"), simulations: count };
    });

    // By destination country
    const byCountry: Record<string, number> = {};
    simulations.forEach((s) => {
      byCountry[s.destination_country] = (byCountry[s.destination_country] || 0) + 1;
    });
    const topDestinations = Object.entries(byCountry)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([country, count]) => ({ country, simulations: count }));

    return {
      total: simulations.length,
      thisMonth: thisMonthSims.length,
      simChange,
      completed: completedSims.length,
      avgCost,
      monthlyData,
      topDestinations,
    };
  }, [simulations]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics & Reporting</h1>
        <p className="text-sm text-muted-foreground mt-1">Usage metrics and simulation insights for your organization</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Simulations"
          value={String(stats?.total ?? 0)}
          change={`${stats?.completed ?? 0} completed`}
          changeType="neutral"
          icon={<BarChart3 className="w-5 h-5" />}
        />
        <KPICard
          title="This Month"
          value={String(stats?.thisMonth ?? 0)}
          change={stats?.simChange ? `${Number(stats.simChange) >= 0 ? "↑" : "↓"} ${Math.abs(Number(stats.simChange))}% vs last month` : "—"}
          changeType={stats?.simChange && Number(stats.simChange) >= 0 ? "positive" : "negative"}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <KPICard
          title="Avg. Assignment Cost"
          value={stats?.avgCost ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(stats.avgCost) : "—"}
          change="Across completed simulations"
          changeType="neutral"
          icon={<DollarSign className="w-5 h-5" />}
        />
        <KPICard
          title="Completion Rate"
          value={stats?.total ? `${Math.round((stats.completed / stats.total) * 100)}%` : "—"}
          change={`${stats?.completed ?? 0} of ${stats?.total ?? 0} simulations`}
          changeType="neutral"
          icon={<Users className="w-5 h-5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-lg border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Simulations Over Time</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={stats?.monthlyData ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="simulations" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-lg border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Top Destination Countries</h3>
          {(stats?.topDestinations?.length ?? 0) > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats?.topDestinations ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                <YAxis dataKey="country" type="category" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} width={100} />
                <Tooltip />
                <Bar dataKey="simulations" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
              No simulation data yet
            </div>
          )}
        </div>
      </div>

      {/* Usage by User */}
      <div className="bg-card rounded-lg border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">System Usage by User</h3>
        </div>
        {userActivity.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={userActivity} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                width={120}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="simulations" name="Simulations" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
              <Bar dataKey="trips" name="Trips" stackId="a" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
            No user activity data yet
          </div>
        )}
      </div>
    </div>
  );
}
