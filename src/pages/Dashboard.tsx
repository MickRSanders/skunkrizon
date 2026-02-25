import KPICard from "@/components/KPICard";
import StatusBadge from "@/components/StatusBadge";
import { Calculator, FileText, Users, TrendingUp, Globe, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const simulationData = [
  { month: "Sep", count: 42 },
  { month: "Oct", count: 58 },
  { month: "Nov", count: 45 },
  { month: "Dec", count: 73 },
  { month: "Jan", count: 89 },
  { month: "Feb", count: 102 },
];

const costTrend = [
  { month: "Sep", avg: 125000 },
  { month: "Oct", avg: 132000 },
  { month: "Nov", avg: 128000 },
  { month: "Dec", avg: 141000 },
  { month: "Jan", avg: 138000 },
  { month: "Feb", avg: 145000 },
];

const policyDistribution = [
  { name: "Gold Tier", value: 35, color: "hsl(174, 62%, 40%)" },
  { name: "Silver Tier", value: 40, color: "hsl(222, 62%, 22%)" },
  { name: "Bronze Tier", value: 20, color: "hsl(38, 92%, 50%)" },
  { name: "Custom", value: 5, color: "hsl(220, 10%, 46%)" },
];

const recentSimulations = [
  { id: "SIM-2847", employee: "Sarah Chen", origin: "New York, US", destination: "London, UK", policy: "Gold Tier", totalCost: "$284,500", status: "completed" as const, date: "Feb 24, 2026" },
  { id: "SIM-2846", employee: "James Park", origin: "Seoul, KR", destination: "Singapore, SG", policy: "Silver Tier", totalCost: "$167,200", status: "running" as const, date: "Feb 24, 2026" },
  { id: "SIM-2845", employee: "Maria González", origin: "Madrid, ES", destination: "São Paulo, BR", policy: "Gold Tier", totalCost: "$312,800", status: "completed" as const, date: "Feb 23, 2026" },
  { id: "SIM-2844", employee: "Alex Thompson", origin: "Chicago, US", destination: "Tokyo, JP", policy: "Silver Tier", totalCost: "$198,400", status: "draft" as const, date: "Feb 23, 2026" },
  { id: "SIM-2843", employee: "Priya Sharma", origin: "Mumbai, IN", destination: "Zurich, CH", policy: "Gold Tier", totalCost: "$425,100", status: "completed" as const, date: "Feb 22, 2026" },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Horizon platform overview and key metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Simulations"
          value="409"
          change="↑ 14.5% from last month"
          changeType="positive"
          icon={<Calculator className="w-5 h-5" />}
          subtitle="This quarter"
        />
        <KPICard
          title="Active Policies"
          value="24"
          change="2 pending review"
          changeType="neutral"
          icon={<FileText className="w-5 h-5" />}
          subtitle="Across 8 clients"
        />
        <KPICard
          title="Active Users"
          value="156"
          change="↑ 8 new this month"
          changeType="positive"
          icon={<Users className="w-5 h-5" />}
          subtitle="12 clients"
        />
        <KPICard
          title="Avg. Cost/Move"
          value="$145K"
          change="↑ 3.2% vs last quarter"
          changeType="negative"
          icon={<TrendingUp className="w-5 h-5" />}
          subtitle="International assignments"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card rounded-lg border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Simulations Over Time</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={simulationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 89%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(220, 10%, 46%)" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(220, 10%, 46%)" }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(174, 62%, 40%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-lg border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Policy Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={policyDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                {policyDistribution.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {policyDistribution.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
                <span className="font-medium text-foreground">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Simulations Table */}
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
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Policy</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Cost</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentSimulations.map((sim) => (
                <tr key={sim.id} className="data-table-row">
                  <td className="px-5 py-3 font-mono text-xs text-accent">{sim.id}</td>
                  <td className="px-5 py-3 font-medium text-foreground">{sim.employee}</td>
                  <td className="px-5 py-3 text-muted-foreground">
                    <div className="flex items-center gap-1">
                      {sim.origin} <ArrowRight className="w-3 h-3 text-accent" /> {sim.destination}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{sim.policy}</td>
                  <td className="px-5 py-3 font-semibold text-foreground">{sim.totalCost}</td>
                  <td className="px-5 py-3"><StatusBadge status={sim.status} /></td>
                  <td className="px-5 py-3 text-muted-foreground">{sim.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
