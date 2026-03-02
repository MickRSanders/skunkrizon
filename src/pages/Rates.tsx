import { useState } from "react";
import {
  DollarSign,
  Plus,
  Upload,
  Trash2,
  ChevronRight,
  Search,
  FileSpreadsheet,
  Globe,
  Calculator,
  Gauge,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  useRateTables,
  useCreateRateTable,
  useDeleteRateTable,
  useRateTableEntries,
  useBulkInsertRateEntries,
  useDeleteRateEntries,
  RATE_TABLE_TYPES,
  type RateTable,
  type RateTableEntry,
} from "@/hooks/useRates";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { read, utils } from "@e965/xlsx";

const TYPE_ICONS: Record<string, any> = {
  estimate_service: Globe,
  estimate_cash: DollarSign,
  factor_cash_percentage: Calculator,
  factor_cash_scope: Gauge,
  data_provider: Database,
  lookup: FileSpreadsheet,
};

function CreateRateTableDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const createRateTable = useCreateRateTable();
  const [name, setName] = useState("");
  const [tableType, setTableType] = useState("estimate_service");
  const [description, setDescription] = useState("");
  const [customerCode, setCustomerCode] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      await createRateTable.mutateAsync({
        name: name.trim(),
        table_type: tableType,
        description: description.trim() || undefined,
        customer_code: customerCode.trim() || undefined,
      });
      toast.success("Rate table created");
      setName("");
      setDescription("");
      setCustomerCode("");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Rate Table</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. ESTIMATE_SHIPPING" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={tableType} onValueChange={setTableType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RATE_TABLE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <div>
                      <div className="font-medium">{t.label}</div>
                      <div className="text-xs text-muted-foreground">{t.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Customer Code (optional)</Label>
            <Input value={customerCode} onChange={(e) => setCustomerCode(e.target.value)} placeholder="e.g. ACME — leave blank for Topia standard" />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe this rate table..." rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={createRateTable.isPending}>
            {createRateTable.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RateTableDetail({
  table,
  onBack,
}: {
  table: RateTable;
  onBack: () => void;
}) {
  const { data: entries, isLoading } = useRateTableEntries(table.id);
  const bulkInsert = useBulkInsertRateEntries();
  const deleteEntries = useDeleteRateEntries();
  const [search, setSearch] = useState("");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const wb = read(buffer);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: Record<string, any>[] = utils.sheet_to_json(ws);

      if (rows.length === 0) {
        toast.error("File is empty");
        return;
      }

      // Map spreadsheet columns to entry fields
      const mapped: Partial<RateTableEntry>[] = rows.map((row) => {
        const entry: Partial<RateTableEntry> = {
          status: String(row.status || row.Status || "ACTIVE"),
          currency: String(row.currency || row.Currency || "USD"),
        };

        // Standard fields mapping (case-insensitive)
        const fieldMap: Record<string, keyof RateTableEntry> = {
          amount: "amount",
          cost: "amount",
          percentage: "percentage",
          customer_code: "customer_code",
          customercode: "customer_code",
          origin_location_id: "origin_location_id",
          origin_location_type: "origin_location_type",
          destination_location_id: "destination_location_id",
          destination_location_type: "destination_location_type",
          location_id: "location_id",
          location_type: "location_type",
          time_span: "time_span",
          timespan: "time_span",
          valid_from: "valid_from",
          validfromdate: "valid_from",
          valid_to: "valid_to",
          validtodate: "valid_to",
          frequency: "frequency",
          scope_option_code: "scope_option_code",
          scope_group: "scope_group",
          source_profile_item: "source_profile_item",
          source_currency_profile_item: "source_currency_profile_item",
          not_required: "not_required",
        };

        const dimensions: Record<string, any> = {};
        const standardKeys = new Set(Object.keys(fieldMap));
        standardKeys.add("status");
        standardKeys.add("currency");

        for (const [key, val] of Object.entries(row)) {
          const lk = key.toLowerCase().replace(/\s+/g, "_");
          if (fieldMap[lk]) {
            (entry as any)[fieldMap[lk]] = val === "*" ? null : val;
          } else if (!standardKeys.has(lk)) {
            // Treat as dimension — wildcards become null
            dimensions[key] = val === "*" ? null : val;
          }
        }

        entry.dimensions = dimensions;
        return entry;
      });

      await bulkInsert.mutateAsync({ rateTableId: table.id, entries: mapped });
      toast.success(`Imported ${mapped.length} rate entries`);
    } catch (err: any) {
      toast.error(`Import failed: ${err.message}`);
    }

    e.target.value = "";
  };

  const handleClearAll = async () => {
    try {
      await deleteEntries.mutateAsync({ rateTableId: table.id });
      toast.success("All entries cleared");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filteredEntries = (entries || []).filter((entry) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      entry.location_id?.toLowerCase().includes(s) ||
      entry.location_type?.toLowerCase().includes(s) ||
      entry.origin_location_id?.toLowerCase().includes(s) ||
      entry.destination_location_id?.toLowerCase().includes(s) ||
      entry.customer_code?.toLowerCase().includes(s) ||
      entry.currency?.toLowerCase().includes(s) ||
      JSON.stringify(entry.dimensions).toLowerCase().includes(s)
    );
  });

  const typeInfo = RATE_TABLE_TYPES.find((t) => t.value === table.table_type);
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">{table.name}</h2>
            <Badge variant="outline" className="text-xs">{typeInfo?.label}</Badge>
            {table.customer_code && (
              <Badge variant="secondary" className="text-xs">{table.customer_code}</Badge>
            )}
          </div>
          {table.description && (
            <p className="text-xs text-muted-foreground mt-1">{table.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search entries…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label>
          <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileUpload} />
          <Button variant="outline" size="sm" asChild>
            <span className="cursor-pointer">
              <Upload className="w-4 h-4 mr-1" /> Import CSV/Excel
            </span>
          </Button>
        </label>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setConfirmClear(true)}
          disabled={!entries?.length}
        >
          <Trash2 className="w-4 h-4 mr-1" /> Clear All
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Loading entries…</div>
      ) : filteredEntries.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <FileSpreadsheet className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No rate entries yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Import a CSV or Excel file with rate data. Columns will be auto-detected.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Use <code className="bg-muted px-1 rounded">*</code> in dimension cells for wildcard/fallback values.
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-auto max-h-[60vh]">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Location</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Origin → Dest</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Amount</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Currency</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">%</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Dimensions</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Valid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredEntries.slice(0, 200).map((entry) => (
                <tr key={entry.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <Badge variant={entry.status === "ACTIVE" ? "default" : "secondary"} className="text-[10px]">
                      {entry.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {entry.location_id ? (
                      <span>{entry.location_type}: {entry.location_id}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {entry.origin_location_id ? (
                      <span>
                        {entry.origin_location_type}: {entry.origin_location_id} →{" "}
                        {entry.destination_location_type}: {entry.destination_location_id}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {entry.amount != null ? Number(entry.amount).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">{entry.currency || "—"}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {entry.percentage != null ? `${entry.percentage}%` : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {Object.keys(entry.dimensions || {}).length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(entry.dimensions).map(([k, v]) => (
                          <Badge key={k} variant="outline" className="text-[10px]">
                            {k}: {v === null ? "*" : String(v)}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {entry.valid_from
                      ? `${new Date(entry.valid_from).toLocaleDateString()}${entry.valid_to ? ` – ${new Date(entry.valid_to).toLocaleDateString()}` : ""}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredEntries.length > 200 && (
            <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/30">
              Showing 200 of {filteredEntries.length} entries. Use search to narrow results.
            </div>
          )}
        </div>
      )}

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all entries?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {entries?.length} rate entries from "{table.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAll}>Delete All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function Rates() {
  const { data: rateTables, isLoading } = useRateTables();
  const deleteRateTable = useDeleteRateTable();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedTable, setSelectedTable] = useState<RateTable | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RateTable | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = (rateTables || []).filter((t) => {
    const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || t.table_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRateTable.mutateAsync(deleteTarget.id);
      toast.success("Rate table deleted");
      setDeleteTarget(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (selectedTable) {
    return (
      <div className="space-y-6">
        <RateTableDetail table={selectedTable} onBack={() => setSelectedTable(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rates Engine</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage rate tables for mobility services, policy allowances, and scope configurations
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> New Rate Table
        </Button>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-foreground">Service Rates</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Shipping, housing, airfare — route & location-based rates consumed by Cost API
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calculator className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-foreground">Policy Allowances</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Cash amounts & percentage factors driven by family size, job grade, location
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Gauge className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-foreground">Policy Scope</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Scope options like temp housing duration based on host city & employee level
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileSpreadsheet className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-foreground">Lookup Tables</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Reference data tables for calculations, field sources, and exchange rates
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search rate tables…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {RATE_TABLE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table list */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <DollarSign className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No rate tables yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create a rate table to start importing rates</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((table) => {
            const TypeIcon = TYPE_ICONS[table.table_type] || DollarSign;
            const typeInfo = RATE_TABLE_TYPES.find((t) => t.value === table.table_type);
            return (
              <div
                key={table.id}
                className="bg-card border border-border rounded-lg p-4 flex items-center gap-4 hover:border-accent/50 transition-colors cursor-pointer group"
                onClick={() => setSelectedTable(table)}
              >
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <TypeIcon className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground">{table.name}</span>
                    <Badge variant="outline" className="text-[10px]">{typeInfo?.label}</Badge>
                    {table.customer_code && (
                      <Badge variant="secondary" className="text-[10px]">{table.customer_code}</Badge>
                    )}
                    <Badge variant={table.status === "active" ? "default" : "secondary"} className="text-[10px]">
                      {table.status}
                    </Badge>
                  </div>
                  {table.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{table.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(table);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateRateTableDialog open={createOpen} onOpenChange={setCreateOpen} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete rate table?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.name}" and all its entries. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
