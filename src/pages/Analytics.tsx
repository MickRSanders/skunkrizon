import KPICard from "@/components/KPICard";
import { BarChart3, Users, TrendingUp, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart } from "recharts";

const usageByClient = [
  { client: "Acme Corp", simulations: 142 },
  { client: "Globex Inc", simulations: 98 },
  { client: "Wayne Ent.", simulations: 76 },
  { client: "Initech", simulations: 54 },
  { client: "Umbrella", simulations: 39 },
];

const monthlyUsage = [
  { month: "Sep", users: 98, simulations: 42 },
  { month: "Oct", users: 112, simulations: 58 },
  { month: "Nov", users: 108, simulations: 45 },
  { month: "Dec", users: 125, simulations: 73 },
  { month: "Jan", users: 142, simulations: 89 },
  { month: "Feb", users: 156, simulations: 102 },
];

export default function Analytics() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics & Reporting</h1>
        <p className="text-sm text-muted-foreground mt-1">Usage metrics, billing, and platform insights</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Monthly Simulations" value="102" change="↑ 14.6% vs last month" changeType="positive" icon={<BarChart3 className="w-5 h-5" />} />
        <KPICard title="Active Users" value="156" change="↑ 9.9% vs last month" changeType="positive" icon={<Users className="w-5 h-5" />} />
        <KPICard title="Avg. Cost Accuracy" value="97.2%" change="Validated by SMEs" changeType="neutral" icon={<TrendingUp className="w-5 h-5" />} />
        <KPICard title="Platform Cost" value="$12,400" change="Usage-based billing" changeType="neutral" icon={<DollarSign className="w-5 h-5" />} subtitle="This billing period" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-lg border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Active Users & Simulations Over Time</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthlyUsage}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 89%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(220, 10%, 46%)" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(220, 10%, 46%)" }} />
              <Tooltip />
              <Area type="monotone" dataKey="users" stroke="hsl(222, 62%, 22%)" fill="hsl(222, 62%, 22%)" fillOpacity={0.1} />
              <Area type="monotone" dataKey="simulations" stroke="hsl(174, 62%, 40%)" fill="hsl(174, 62%, 40%)" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-lg border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Simulations by Client</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={usageByClient} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 89%)" />
              <XAxis type="number" tick={{ fontSize: 12, fill: "hsl(220, 10%, 46%)" }} />
              <YAxis dataKey="client" type="category" tick={{ fontSize: 12, fill: "hsl(220, 10%, 46%)" }} width={80} />
              <Tooltip />
              <Bar dataKey="simulations" fill="hsl(174, 62%, 40%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
