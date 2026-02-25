import KPICard from "@/components/KPICard";
import { Globe, FileCheck, AlertTriangle, CheckCircle } from "lucide-react";

const countryPairs = [
  { home: "United States", host: "United Kingdom", treaty: "Yes", status: "Validated", scenarios: 42 },
  { home: "United States", host: "Japan", treaty: "Yes", status: "Validated", scenarios: 28 },
  { home: "Germany", host: "Singapore", treaty: "Yes", status: "Validated", scenarios: 19 },
  { home: "India", host: "Switzerland", treaty: "Yes", status: "Pending", scenarios: 15 },
  { home: "South Korea", host: "United States", treaty: "Yes", status: "Validated", scenarios: 12 },
  { home: "Spain", host: "Brazil", treaty: "Limited", status: "Validated", scenarios: 10 },
  { home: "Ireland", host: "Australia", treaty: "Yes", status: "In Progress", scenarios: 8 },
  { home: "France", host: "Canada", treaty: "Yes", status: "Validated", scenarios: 7 },
];

export default function TaxEngine() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tax Engine</h1>
        <p className="text-sm text-muted-foreground mt-1">Hypothetical tax modeling, gross-ups, and tax equalization</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Countries Supported" value="42" icon={<Globe className="w-5 h-5" />} subtitle="Tax jurisdictions" />
        <KPICard title="Tax Treaties" value="38" icon={<FileCheck className="w-5 h-5" />} subtitle="Active agreements" />
        <KPICard title="Validated Pairs" value="28" icon={<CheckCircle className="w-5 h-5" />} subtitle="Country combinations" change="6 pending validation" changeType="neutral" />
        <KPICard title="Exceptions" value="3" icon={<AlertTriangle className="w-5 h-5" />} subtitle="Requires review" change="Action needed" changeType="negative" />
      </div>

      {/* Country Pairs */}
      <div className="bg-card rounded-lg border border-border">
        <div className="p-5 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Priority Country Combinations</h3>
          <p className="text-xs text-muted-foreground mt-1">Tax modeling status for key origin-destination pairs</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Home Country</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Host Country</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Tax Treaty</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Validation</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Simulations</th>
              </tr>
            </thead>
            <tbody>
              {countryPairs.map((pair, i) => (
                <tr key={i} className="data-table-row">
                  <td className="px-5 py-3 font-medium text-foreground">{pair.home}</td>
                  <td className="px-5 py-3 font-medium text-foreground">{pair.host}</td>
                  <td className="px-5 py-3 text-muted-foreground">{pair.treaty}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${pair.status === "Validated" ? "text-success" : pair.status === "Pending" ? "text-warning" : "text-info"}`}>
                      {pair.status === "Validated" && <CheckCircle className="w-3 h-3" />}
                      {pair.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{pair.scenarios}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tax Treatment Config */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-lg border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Tax Treatment Options</h3>
          <div className="space-y-3">
            {["Tax Equalized", "Tax Protected", "Employee Borne", "Laissez-Faire"].map((opt) => (
              <div key={opt} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <span className="text-sm text-foreground">{opt}</span>
                <span className="text-xs text-muted-foreground">Available</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Gross-Up Controls</h3>
          <div className="space-y-3">
            {[
              { label: "Standard Gross-Up", desc: "Apply to all taxable benefits" },
              { label: "Selective Gross-Up", desc: "Per-benefit configuration" },
              { label: "Equalization Balance", desc: "Home vs host hypo tax offset" },
              { label: "Social Security", desc: "Include in gross-up calculations" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="text-sm text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <span className="text-xs text-accent font-medium">Configurable</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
