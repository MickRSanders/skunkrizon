import KPICard from "@/components/KPICard";
import { Globe, FileCheck, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useTaxConfig, type TaxTreatment, type GrossUpMode } from "@/contexts/TaxConfigContext";

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

const taxTreatmentInfo: Record<TaxTreatment, { label: string; desc: string }> = {
  equalized: { label: "Tax Equalized", desc: "Company bears the difference between home and host tax so the assignee pays only hypothetical home tax." },
  protected: { label: "Tax Protected", desc: "Assignee never pays more than home-country tax; savings in lower-tax hosts go to the employee." },
  employee_borne: { label: "Employee Borne", desc: "Assignee bears all actual home and host tax obligations with no company reimbursement." },
  laissez_faire: { label: "Laissez-Faire", desc: "No tax adjustment; assignee files in both jurisdictions independently." },
};

export default function TaxEngine() {
  const {
    taxTreatment, setTaxTreatment,
    grossUpMode, setGrossUpMode,
    includeSocialSecurity, setIncludeSocialSecurity,
    includeHousingInGrossUp, setIncludeHousingInGrossUp,
    includeEducationInGrossUp, setIncludeEducationInGrossUp,
    includeColaInGrossUp, setIncludeColaInGrossUp,
    hypoTaxMethod, setHypoTaxMethod,
    equalizationSettlement, setEqualizationSettlement,
  } = useTaxConfig();

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

      {/* Tax Treatment & Gross-Up Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tax Treatment Options */}
        <div className="bg-card rounded-lg border border-border p-5 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Tax Treatment Approach</h3>
            <p className="text-xs text-muted-foreground mt-1">Select the default tax treatment for assignments</p>
          </div>

          <RadioGroup value={taxTreatment} onValueChange={(v) => setTaxTreatment(v as TaxTreatment)} className="space-y-2">
            {(Object.entries(taxTreatmentInfo) as [TaxTreatment, { label: string; desc: string }][]).map(([key, { label, desc }]) => (
              <label
                key={key}
                className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                  taxTreatment === key ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"
                }`}
              >
                <RadioGroupItem value={key} className="mt-0.5" />
                <div className="min-w-0">
                  <span className="text-sm font-medium text-foreground">{label}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </label>
            ))}
          </RadioGroup>

          {/* Hypo Tax & Settlement */}
          <div className="space-y-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Label className="text-sm text-foreground">Hypothetical Tax Method</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[220px]">
                    <p className="text-xs">Marginal uses the assignee's actual bracket. Flat applies a fixed rate across all income.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Select value={hypoTaxMethod} onValueChange={setHypoTaxMethod}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="marginal">Marginal Rate</SelectItem>
                  <SelectItem value="flat">Flat Rate</SelectItem>
                  <SelectItem value="blended">Blended Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-sm text-foreground">Equalization Settlement</Label>
              <Select value={equalizationSettlement} onValueChange={setEqualizationSettlement}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="end_of_assignment">End of Assignment</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Gross-Up Controls */}
        <div className="bg-card rounded-lg border border-border p-5 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Gross-Up Controls</h3>
            <p className="text-xs text-muted-foreground mt-1">Configure which benefits are included in tax gross-up calculations</p>
          </div>

          {/* Gross-up mode */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gross-Up Mode</Label>
            <RadioGroup value={grossUpMode} onValueChange={(v) => setGrossUpMode(v as GrossUpMode)} className="flex gap-2">
              {([
                { value: "standard", label: "Standard" },
                { value: "selective", label: "Selective" },
                { value: "none", label: "None" },
              ] as const).map((opt) => (
                <label
                  key={opt.value}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-xs font-medium cursor-pointer transition-colors ${
                    grossUpMode === opt.value ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-muted/30"
                  }`}
                >
                  <RadioGroupItem value={opt.value} className="sr-only" />
                  {opt.label}
                </label>
              ))}
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              {grossUpMode === "standard" && "All taxable benefits are automatically grossed up."}
              {grossUpMode === "selective" && "Choose which benefits to include in gross-up below."}
              {grossUpMode === "none" && "No gross-up applied — assignee bears full tax on benefits."}
            </p>
          </div>

          {/* Benefit toggles - visible in selective mode, informational in standard */}
          <div className="space-y-1 pt-2 border-t border-border">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Benefit Inclusions</Label>
            {[
              { id: "social_security", label: "Social Security / NI", desc: "Include employer social contributions", value: includeSocialSecurity, setter: setIncludeSocialSecurity },
              { id: "housing", label: "Housing Allowance", desc: "Gross up housing benefits", value: includeHousingInGrossUp, setter: setIncludeHousingInGrossUp },
              { id: "education", label: "Education / Schooling", desc: "Dependent education benefits", value: includeEducationInGrossUp, setter: setIncludeEducationInGrossUp },
              { id: "cola", label: "COLA", desc: "Cost-of-living adjustment", value: includeColaInGrossUp, setter: setIncludeColaInGrossUp },
            ].map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                <div>
                  <p className="text-sm text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <div className="flex items-center gap-2">
                  {grossUpMode === "standard" && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Auto</Badge>
                  )}
                  <Switch
                    checked={grossUpMode === "standard" ? true : grossUpMode === "none" ? false : item.value}
                    disabled={grossUpMode !== "selective"}
                    onCheckedChange={item.setter}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
