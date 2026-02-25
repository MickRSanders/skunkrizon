import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Plus, Search, Shield, Mail, MoreHorizontal } from "lucide-react";

const users = [
  { name: "Jennifer Adams", email: "j.adams@cartus.com", role: "Global Admin", org: "Cartus", status: "active" as const, lastLogin: "Feb 25, 2026" },
  { name: "Michael Torres", email: "m.torres@cartus.com", role: "Implementation Consultant", org: "Cartus", status: "active" as const, lastLogin: "Feb 25, 2026" },
  { name: "Sarah Chen", email: "s.chen@acme.com", role: "Client Manager", org: "Acme Corp", status: "active" as const, lastLogin: "Feb 24, 2026" },
  { name: "David Kim", email: "d.kim@globex.com", role: "Client Manager", org: "Globex Inc", status: "active" as const, lastLogin: "Feb 22, 2026" },
  { name: "Lisa Wong", email: "l.wong@cartus.com", role: "Tax Specialist", org: "Cartus", status: "active" as const, lastLogin: "Feb 24, 2026" },
  { name: "Robert Smith", email: "r.smith@wayne.com", role: "Employee User", org: "Wayne Enterprises", status: "active" as const, lastLogin: "Feb 20, 2026" },
  { name: "Anna Petrov", email: "a.petrov@initech.com", role: "Client Manager", org: "Initech Global", status: "draft" as const, lastLogin: "Never" },
  { name: "Tom Bradley", email: "t.bradley@cartus.com", role: "Account Manager", org: "Cartus", status: "active" as const, lastLogin: "Feb 21, 2026" },
];

const roles = [
  { name: "Global Admin", permissions: "Full access to all features and tenant management", count: 3 },
  { name: "Implementation Consultant", permissions: "Policy config, calculations, simulations across clients", count: 8 },
  { name: "Client Manager", permissions: "Simulations, reports, users within own organization", count: 24 },
  { name: "Tax Specialist", permissions: "Tax engine, simulation review, rate management", count: 5 },
  { name: "Account Manager", permissions: "Usage reports, billing, client overview", count: 4 },
  { name: "Employee User", permissions: "View assigned simulations only", count: 112 },
];

export default function UserManagement() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">RBAC, SSO, and user activity monitoring</p>
        </div>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-1" /> Add User
        </Button>
      </div>

      {/* Roles Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {roles.map((role) => (
          <div key={role.name} className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-accent" />
              <h4 className="text-sm font-semibold text-foreground">{role.name}</h4>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{role.permissions}</p>
            <p className="text-xs font-medium text-foreground">{role.count} users</p>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="bg-card rounded-lg border border-border">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-sm bg-background border border-border rounded-md px-3 py-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Search users..." className="bg-transparent text-sm outline-none w-full text-foreground placeholder:text-muted-foreground" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">User</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Organization</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Login</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.email} className="data-table-row">
                  <td className="px-5 py-3">
                    <p className="font-medium text-foreground">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{u.role}</td>
                  <td className="px-5 py-3 text-muted-foreground">{u.org}</td>
                  <td className="px-5 py-3"><StatusBadge status={u.status} /></td>
                  <td className="px-5 py-3 text-muted-foreground">{u.lastLogin}</td>
                  <td className="px-5 py-3">
                    <button className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
