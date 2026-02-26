import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "@/contexts/TenantContext";
import KPICard from "@/components/KPICard";
import { BarChart3, Users, TrendingUp, DollarSign, Loader2, Activity, CalendarIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from "recharts";
import { useSimulations } from "@/hooks/useSimulations";
import { format, subMonths, subDays, startOfMonth, startOfYear, differenceInMonths, differenceInWeeks, addWeeks, addMonths } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Preset = "7d" | "30d" | "90d" | "6m" | "1y" | "all" | "custom";

const PRESETS: { value: Preset; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "6m", label: "6 months" },
  { value: "1y", label: "1 year" },
  { value: "all", label: "All time" },
];

function getPresetRange(preset: Preset): { from: Date | undefined; to: Date } {
  const now = new Date();
  switch (preset) {
    case "7d": return { from: subDays(now, 7), to: now };
    case "30d": return { from: subDays(now, 30), to: now };
    case "90d": return { from: subDays(now, 90), to: now };
    case "6m": return { from: subMonths(now, 6), to: now };
    case "1y": return { from: subMonths(now, 12), to: now };
    case "all": return { from: undefined, to: now };
    default: return { from: undefined, to: now };
  }
}

export default function Analytics() {
  const { activeTenant } = useTenantContext();
  const tenantId = activeTenant?.tenant_id;
  const { data: simulations, isLoading } = useSimulations();

  const [preset, setPreset] = useState<Preset>("all");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  const range = useMemo(() => {
    if (preset === "custom") return { from: customFrom, to: customTo ?? new Date() };
    return getPresetRange(preset);
  }, [preset, customFrom, customTo]);

  // Filter simulations by date range
  const filteredSims = useMemo(() => {
    if (!simulations) return [];
    return simulations.filter((s) => {
      const d = new Date(s.created_at);
      if (range.from && d < range.from) return false;
      if (range.to && d > range.to) return false;
      return true;
    });
  }, [simulations, range]);

  // Fetch user activity with date range
  const { data: userActivity = [] } = useQuery({
    queryKey: ["user-activity", tenantId, range.from?.toISOString(), range.to?.toISOString()],
    queryFn: async () => {
      if (!tenantId) return [];

      let simQ = supabase.from("simulations").select("owner_id, created_at").eq("tenant_id", tenantId);
      let tripQ = supabase.from("trips").select("created_by, created_at").eq("tenant_id", tenantId);

      if (range.from) {
        simQ = simQ.gte("created_at", range.from.toISOString());
        tripQ = tripQ.gte("created_at", range.from.toISOString());
      }
      if (range.to) {
        simQ = simQ.lte("created_at", range.to.toISOString());
        tripQ = tripQ.lte("created_at", range.to.toISOString());
      }

      const [{ data: sims }, { data: trips }] = await Promise.all([simQ, tripQ]);

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
    const sims = filteredSims;
    if (!sims.length && !simulations?.length) return null;

    const now = new Date();
    const thisMonth = startOfMonth(now);
    const lastMonth = startOfMonth(subMonths(now, 1));

    const thisMonthSims = sims.filter((s) => new Date(s.created_at) >= thisMonth);
    const lastMonthSims = (simulations ?? []).filter((s) => {
      const d = new Date(s.created_at);
      return d >= lastMonth && d < thisMonth;
    });

    const simChange = lastMonthSims.length > 0
      ? ((thisMonthSims.length - lastMonthSims.length) / lastMonthSims.length * 100).toFixed(1)
      : null;

    const completedSims = sims.filter((s) => s.status === "completed");
    const avgCost = completedSims.length > 0
      ? Math.round(completedSims.reduce((sum, s) => sum + (s.total_cost ?? 0), 0) / completedSims.length)
      : 0;

    // Time series — auto-bucket by range span
    const from = range.from ?? (sims.length > 0 ? new Date(sims[sims.length - 1].created_at) : subMonths(now, 6));
    const to = range.to ?? now;
    const spanMonths = differenceInMonths(to, from);

    let timeData: { label: string; simulations: number }[] = [];

    if (spanMonths <= 2) {
      // Weekly buckets
      const weeks = differenceInWeeks(to, from) + 1;
      timeData = Array.from({ length: Math.min(weeks, 12) }, (_, i) => {
        const start = addWeeks(from, i);
        const end = addWeeks(from, i + 1);
        const count = sims.filter((s) => {
          const d = new Date(s.created_at);
          return d >= start && d < end;
        }).length;
        return { label: format(start, "MMM d"), simulations: count };
      });
    } else {
      // Monthly buckets
      const months = Math.min(spanMonths + 1, 12);
      const bucketStart = spanMonths > 12 ? subMonths(to, 11) : from;
      timeData = Array.from({ length: months }, (_, i) => {
        const month = addMonths(startOfMonth(bucketStart), i);
        const next = addMonths(month, 1);
        const count = sims.filter((s) => {
          const d = new Date(s.created_at);
          return d >= month && d < next;
        }).length;
        return { label: format(month, "MMM yyyy"), simulations: count };
      });
    }

    // By destination country
    const byCountry: Record<string, number> = {};
    sims.forEach((s) => {
      byCountry[s.destination_country] = (byCountry[s.destination_country] || 0) + 1;
    });
    const topDestinations = Object.entries(byCountry)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([country, count]) => ({ country, simulations: count }));

    return {
      total: sims.length,
      thisMonth: thisMonthSims.length,
      simChange,
      completed: completedSims.length,
      avgCost,
      timeData,
      topDestinations,
    };
  }, [filteredSims, simulations, range]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Date Range */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics & Reporting</h1>
          <p className="text-sm text-muted-foreground mt-1">Usage metrics and simulation insights for your organization</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {PRESETS.map((p) => (
            <Button
              key={p.value}
              variant={preset === p.value ? "default" : "outline"}
              size="sm"
              className="text-xs h-8"
              onClick={() => setPreset(p.value)}
            >
              {p.label}
            </Button>
          ))}

          {/* Custom date pickers */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={preset === "custom" ? "default" : "outline"}
                size="sm"
                className={cn("text-xs h-8 gap-1.5", preset === "custom" && "min-w-[200px]")}
                onClick={() => { if (preset !== "custom") setPreset("custom"); }}
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                {preset === "custom" && customFrom
                  ? `${format(customFrom, "MMM d, yyyy")} – ${customTo ? format(customTo, "MMM d, yyyy") : "now"}`
                  : "Custom"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={{ from: customFrom, to: customTo }}
                onSelect={(r) => {
                  setCustomFrom(r?.from);
                  setCustomTo(r?.to);
                  setPreset("custom");
                }}
                numberOfMonths={2}
                className={cn("p-3 pointer-events-auto")}
                disabled={(date) => date > new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Date range indicator */}
      {range.from && (
        <p className="text-xs text-muted-foreground -mt-2">
          Showing data from {format(range.from, "MMM d, yyyy")} to {format(range.to, "MMM d, yyyy")}
        </p>
      )}

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
            <AreaChart data={stats?.timeData ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
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
