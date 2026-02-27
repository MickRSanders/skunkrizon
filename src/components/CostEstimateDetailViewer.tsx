import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowRightLeft, DollarSign, FileSpreadsheet, Home, MapPin,
  Receipt, TrendingUp, Building2, Calculator,
} from "lucide-react";
import { format } from "date-fns";
import StatusBadge from "@/components/StatusBadge";

interface CostEstimateDetailViewerProps {
  estimate: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CostEstimateDetailViewer({ estimate, open, onOpenChange }: CostEstimateDetailViewerProps) {
  const [tab, setTab] = useState("overview");

  if (!estimate) return null;

  const lineItems: any[] = Array.isArray(estimate.line_items) ? estimate.line_items : [];
  const details: Record<string, any> = typeof estimate.details_snapshot === "object" && estimate.details_snapshot ? estimate.details_snapshot : {};
  const taxSnapshot: Record<string, any> = typeof estimate.tax_snapshot === "object" && estimate.tax_snapshot ? estimate.tax_snapshot : {};
  const sourceSnapshot: Record<string, any> = typeof estimate.source_snapshot === "object" && estimate.source_snapshot ? estimate.source_snapshot : {};

  // Group line items by category
  const categories = lineItems.reduce<Record<string, any[]>>((acc, item) => {
    const cat = item.display_category || item.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  // Separate home vs host items
  const homeItems = lineItems.filter((i) => i.home_country || i.location === "home");
  const hostItems = lineItems.filter((i) => i.host_country || i.location === "host");
  const sharedItems = lineItems.filter((i) => !i.home_country && !i.host_country && !i.location);

  const totalCost = estimate.total_cost ?? lineItems.reduce((sum: number, i: any) => sum + (Number(i.amount) || Number(i.default_value) || 0), 0);

  const fmtCurrency = (val: number | undefined | null) => {
    if (val == null) return "—";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: estimate.display_currency || "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-accent" />
            </div>
            <div>
              <DialogTitle className="text-lg">Cost Estimate — {estimate.employee_name}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Version {estimate.version} · Created {format(new Date(estimate.created_at), "MMM d, yyyy")}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
          <SummaryCard icon={DollarSign} label="Total Cost" value={fmtCurrency(totalCost)} accent />
          <SummaryCard icon={Receipt} label="Line Items" value={String(lineItems.length)} />
          <SummaryCard icon={ArrowRightLeft} label="Currency" value={estimate.display_currency || "USD"} />
          <SummaryCard icon={TrendingUp} label="Status" value={<StatusBadge status={estimate.status === "active" ? "active" : "draft"} />} />
        </div>

        {/* Detail Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="text-xs gap-1"><Calculator className="w-3.5 h-3.5" /> By Category</TabsTrigger>
            <TabsTrigger value="home-host" className="text-xs gap-1"><ArrowRightLeft className="w-3.5 h-3.5" /> Home / Host</TabsTrigger>
            <TabsTrigger value="tax" className="text-xs gap-1"><Receipt className="w-3.5 h-3.5" /> Tax</TabsTrigger>
            <TabsTrigger value="source" className="text-xs gap-1"><Building2 className="w-3.5 h-3.5" /> Source Data</TabsTrigger>
          </TabsList>

          {/* By Category */}
          <TabsContent value="overview" className="space-y-4 mt-3">
            {Object.keys(categories).length === 0 ? (
              <EmptySection message="No compensation items recorded." />
            ) : (
              Object.entries(categories).map(([cat, items]) => {
                const catTotal = items.reduce((s: number, i: any) => s + (Number(i.amount) || Number(i.default_value) || 0), 0);
                return (
                  <div key={cat} className="rounded-lg border border-border overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b border-border">
                      <span className="text-sm font-semibold text-foreground">{cat}</span>
                      <span className="text-sm font-bold text-foreground">{fmtCurrency(catTotal)}</span>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Item</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Paycode</th>
                          <th className="text-center px-4 py-2 text-xs font-medium text-muted-foreground">Taxable</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item: any, idx: number) => (
                          <tr key={idx} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-2.5 text-foreground">{item.display_label || item.label || item.name || "—"}</td>
                            <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{item.paycode || "—"}</td>
                            <td className="px-4 py-2.5 text-center">
                              {item.is_taxable !== undefined ? (
                                <Badge variant={item.is_taxable ? "default" : "secondary"} className="text-[10px]">
                                  {item.is_taxable ? "Yes" : "No"}
                                </Badge>
                              ) : "—"}
                            </td>
                            <td className="px-4 py-2.5 text-right font-medium text-foreground">
                              {fmtCurrency(Number(item.amount) || Number(item.default_value) || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })
            )}
            {/* Grand Total */}
            <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-primary/5 border border-primary/20">
              <span className="text-sm font-semibold text-foreground">Grand Total</span>
              <span className="text-lg font-bold text-primary">{fmtCurrency(totalCost)}</span>
            </div>
          </TabsContent>

          {/* Home / Host Split */}
          <TabsContent value="home-host" className="mt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SplitColumn
                icon={Home}
                title="Home Country"
                subtitle={details.origin || sourceSnapshot.origin_country || "—"}
                items={homeItems.length > 0 ? homeItems : sharedItems}
                fmtCurrency={fmtCurrency}
                emptyLabel={homeItems.length === 0 && sharedItems.length === 0 ? "No home items" : undefined}
              />
              <SplitColumn
                icon={MapPin}
                title="Host Country"
                subtitle={details.destination || sourceSnapshot.destination_country || "—"}
                items={hostItems}
                fmtCurrency={fmtCurrency}
                emptyLabel={hostItems.length === 0 ? "No host-specific items" : undefined}
              />
            </div>
          </TabsContent>

          {/* Tax */}
          <TabsContent value="tax" className="mt-3">
            {Object.keys(taxSnapshot).length === 0 ? (
              <EmptySection message="No tax calculations recorded for this estimate." />
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/40 border-b border-border">
                  <span className="text-sm font-semibold text-foreground">Tax Calculation Details</span>
                </div>
                <div className="divide-y divide-border/50">
                  {Object.entries(taxSnapshot).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors">
                      <span className="text-sm text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                      <span className="text-sm font-medium text-foreground">
                        {typeof value === "number" ? fmtCurrency(value) : String(value ?? "—")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Taxable vs Non-Taxable summary */}
            {lineItems.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="rounded-lg border border-border p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Taxable Items</p>
                  <p className="text-lg font-bold text-foreground">
                    {fmtCurrency(lineItems.filter((i: any) => i.is_taxable !== false).reduce((s: number, i: any) => s + (Number(i.amount) || Number(i.default_value) || 0), 0))}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{lineItems.filter((i: any) => i.is_taxable !== false).length} items</p>
                </div>
                <div className="rounded-lg border border-border p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Non-Taxable Items</p>
                  <p className="text-lg font-bold text-foreground">
                    {fmtCurrency(lineItems.filter((i: any) => i.is_taxable === false).reduce((s: number, i: any) => s + (Number(i.amount) || Number(i.default_value) || 0), 0))}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{lineItems.filter((i: any) => i.is_taxable === false).length} items</p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Source Data */}
          <TabsContent value="source" className="mt-3">
            <div className="space-y-4">
              {Object.keys(details).length > 0 && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="px-4 py-2.5 bg-muted/40 border-b border-border">
                    <span className="text-sm font-semibold text-foreground">Assignment Details</span>
                  </div>
                  <div className="divide-y divide-border/50">
                    {Object.entries(details).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors">
                        <span className="text-sm text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                        <span className="text-sm font-medium text-foreground">{String(value ?? "—")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {Object.keys(sourceSnapshot).length > 0 && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="px-4 py-2.5 bg-muted/40 border-b border-border">
                    <span className="text-sm font-semibold text-foreground">Simulation Snapshot</span>
                  </div>
                  <div className="divide-y divide-border/50">
                    {Object.entries(sourceSnapshot).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors">
                        <span className="text-sm text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                        <span className="text-sm font-medium text-foreground truncate max-w-[50%] text-right">
                          {typeof value === "object" ? JSON.stringify(value).slice(0, 80) : String(value ?? "—")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {Object.keys(details).length === 0 && Object.keys(sourceSnapshot).length === 0 && (
                <EmptySection message="No source data recorded." />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-components ─────────────────────────────────────────

function SummaryCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: any; accent?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${accent ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-3.5 h-3.5 ${accent ? "text-primary" : "text-muted-foreground"}`} />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className={`text-sm font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</div>
    </div>
  );
}

function SplitColumn({ icon: Icon, title, subtitle, items, fmtCurrency, emptyLabel }: {
  icon: any; title: string; subtitle: string; items: any[]; fmtCurrency: (v: number | null | undefined) => string; emptyLabel?: string;
}) {
  const total = items.reduce((s: number, i: any) => s + (Number(i.amount) || Number(i.default_value) || 0), 0);
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b border-border">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <div>
          <span className="text-sm font-semibold text-foreground">{title}</span>
          <span className="text-xs text-muted-foreground ml-2">{subtitle}</span>
        </div>
      </div>
      {emptyLabel ? (
        <p className="px-4 py-6 text-sm text-muted-foreground text-center">{emptyLabel}</p>
      ) : (
        <>
          <div className="divide-y divide-border/30">
            {items.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between px-4 py-2 hover:bg-muted/20 transition-colors">
                <span className="text-sm text-foreground">{item.display_label || item.label || item.name || "—"}</span>
                <span className="text-sm font-medium text-foreground">{fmtCurrency(Number(item.amount) || Number(item.default_value) || 0)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20 border-t border-border">
            <span className="text-xs font-semibold text-muted-foreground">Subtotal</span>
            <span className="text-sm font-bold text-foreground">{fmtCurrency(total)}</span>
          </div>
        </>
      )}
    </div>
  );
}

function EmptySection({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
      {message}
    </div>
  );
}
