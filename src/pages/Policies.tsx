import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Search, FileText, Settings, Eye, Edit, ChevronRight } from "lucide-react";

const policies = [
  { id: "POL-001", name: "Global Executive Transfer – Gold", client: "Acme Corp", status: "active" as const, benefits: 24, lastUpdated: "Feb 20, 2026", version: "v3.2" },
  { id: "POL-002", name: "Standard International Assignment – Silver", client: "Acme Corp", status: "active" as const, benefits: 18, lastUpdated: "Feb 18, 2026", version: "v2.1" },
  { id: "POL-003", name: "Short-Term Assignment – Bronze", client: "Globex Inc", status: "active" as const, benefits: 12, lastUpdated: "Feb 15, 2026", version: "v1.4" },
  { id: "POL-004", name: "Graduate Mobility Program", client: "Globex Inc", status: "draft" as const, benefits: 8, lastUpdated: "Feb 22, 2026", version: "v0.3" },
  { id: "POL-005", name: "Executive Relocation – Premium", client: "Wayne Enterprises", status: "active" as const, benefits: 28, lastUpdated: "Feb 10, 2026", version: "v4.0" },
  { id: "POL-006", name: "Domestic Transfer Program", client: "Wayne Enterprises", status: "archived" as const, benefits: 10, lastUpdated: "Jan 30, 2026", version: "v2.0" },
  { id: "POL-007", name: "APAC Regional Transfer", client: "Initech Global", status: "pending" as const, benefits: 16, lastUpdated: "Feb 24, 2026", version: "v1.0" },
];

const policyComponents = [
  { name: "Housing Allowance", type: "Allowance", taxable: "Host only", calcMethod: "Lookup table by city", amount: "Up to $3,500/mo" },
  { name: "Cost of Living Adjustment", type: "Allowance", taxable: "Both", calcMethod: "COLA index differential", amount: "% of base salary" },
  { name: "Home Leave Travel", type: "Benefit", taxable: "Non-taxable", calcMethod: "Fixed per policy", amount: "2 trips/year" },
  { name: "Relocation Lump Sum", type: "One-time", taxable: "Host only", calcMethod: "Fixed amount", amount: "$15,000" },
  { name: "Tax Equalization", type: "Tax", taxable: "N/A", calcMethod: "Tax Engine", amount: "Calculated" },
  { name: "Education Allowance", type: "Allowance", taxable: "Non-taxable", calcMethod: "Lookup by country", amount: "Up to $25,000/child" },
];

export default function Policies() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Policy Agent</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-powered policy ingestion, configuration, and management</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-1" /> Upload Policy Doc
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1" /> New Policy
          </Button>
        </div>
      </div>

      {/* Policy List */}
      <div className="bg-card rounded-lg border border-border">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-sm bg-background border border-border rounded-md px-3 py-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Search policies..." className="bg-transparent text-sm outline-none w-full text-foreground placeholder:text-muted-foreground" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Policy</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Client</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Benefits</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Version</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Updated</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => (
                <tr key={p.id} className="data-table-row">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-accent shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{p.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{p.client}</td>
                  <td className="px-5 py-3 text-foreground">{p.benefits} items</td>
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{p.version}</td>
                  <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-5 py-3 text-muted-foreground">{p.lastUpdated}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="View"><Eye className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Edit"><Edit className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Configure"><Settings className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Policy Detail Preview */}
      <div className="bg-card rounded-lg border border-border">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">Policy Components – Gold Tier (POL-001)</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Benefit line items, taxability, and calculation methods</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Component</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Taxability</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Calculation</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount / Limit</th>
              </tr>
            </thead>
            <tbody>
              {policyComponents.map((c) => (
                <tr key={c.name} className="data-table-row">
                  <td className="px-5 py-3 font-medium text-foreground">{c.name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{c.type}</td>
                  <td className="px-5 py-3 text-muted-foreground">{c.taxable}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{c.calcMethod}</td>
                  <td className="px-5 py-3 font-medium text-foreground">{c.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
