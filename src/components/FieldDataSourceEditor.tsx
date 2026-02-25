import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Database,
  Globe,
  FileSpreadsheet,
  Table2,
  Upload,
  Loader2,
  Plus,
  Trash2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  useLookupTables,
  useCreateLookupTable,
  useLookupTableRows,
  useBulkInsertRows,
  type CalculationField,
} from "@/hooks/useCalculations";
import type { Json } from "@/integrations/supabase/types";

// Pre-built API connectors available
const API_CONNECTORS = [
  { id: "exchange_rates", name: "Exchange Rate API", description: "Live currency exchange rates", fields: ["from", "to", "date"] },
  { id: "tax_rates", name: "Global Tax Rates", description: "Corporate & personal tax rates by country", fields: ["country", "year", "type"] },
  { id: "cola_index", name: "COLA Index", description: "Cost of Living Adjustment indices", fields: ["city", "base_city"] },
  { id: "hardship_index", name: "Hardship Index", description: "Location hardship ratings and premiums", fields: ["country"] },
];

interface FieldDataSourceEditorProps {
  field: CalculationField;
  currentSource?: {
    source_type: string;
    connector_name?: string | null;
    connector_config?: Json | null;
    rate_file_path?: string | null;
    rate_file_name?: string | null;
    lookup_table_id?: string | null;
    lookup_key_column?: string | null;
    lookup_value_column?: string | null;
  } | null;
  onSave: (source: {
    field_id: string;
    source_type: string;
    connector_name?: string | null;
    connector_config?: Json | null;
    rate_file_path?: string | null;
    rate_file_name?: string | null;
    lookup_table_id?: string | null;
    lookup_key_column?: string | null;
    lookup_value_column?: string | null;
  }) => void;
  onClose: () => void;
}

export default function FieldDataSourceEditor({
  field,
  currentSource,
  onSave,
  onClose,
}: FieldDataSourceEditorProps) {
  const initialType = (currentSource?.source_type as string) || "manual";
  const [sourceType, setSourceType] = useState(initialType);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">
            Data Source for "{field.label}"
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose how this field gets its value
          </p>
        </div>
      </div>

      <Tabs value={sourceType} onValueChange={setSourceType}>
        <TabsList className="w-full justify-start bg-muted/30">
          <TabsTrigger value="manual" className="text-xs gap-1">
            <Database className="w-3 h-3" /> Manual
          </TabsTrigger>
          <TabsTrigger value="api_connector" className="text-xs gap-1">
            <Globe className="w-3 h-3" /> API Connector
          </TabsTrigger>
          <TabsTrigger value="rate_file" className="text-xs gap-1">
            <FileSpreadsheet className="w-3 h-3" /> Rate File
          </TabsTrigger>
          <TabsTrigger value="lookup_table" className="text-xs gap-1">
            <Table2 className="w-3 h-3" /> Lookup Table
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="mt-3">
          <ManualSourceTab
            field={field}
            onSave={() =>
              onSave({ field_id: field.id, source_type: "manual" })
            }
            onClose={onClose}
          />
        </TabsContent>

        <TabsContent value="api_connector" className="mt-3">
          <APIConnectorTab
            field={field}
            currentConnector={currentSource?.connector_name || null}
            currentConfig={currentSource?.connector_config as Record<string, string> || {}}
            onSave={(connector, config) =>
              onSave({
                field_id: field.id,
                source_type: "api_connector",
                connector_name: connector,
                connector_config: config as unknown as Json,
              })
            }
            onClose={onClose}
          />
        </TabsContent>

        <TabsContent value="rate_file" className="mt-3">
          <RateFileTab
            field={field}
            currentPath={currentSource?.rate_file_path || null}
            currentName={currentSource?.rate_file_name || null}
            onSave={(path, name) =>
              onSave({
                field_id: field.id,
                source_type: "rate_file",
                rate_file_path: path,
                rate_file_name: name,
              })
            }
            onClose={onClose}
          />
        </TabsContent>

        <TabsContent value="lookup_table" className="mt-3">
          <LookupTableTab
            field={field}
            currentTableId={currentSource?.lookup_table_id || null}
            currentKeyCol={currentSource?.lookup_key_column || null}
            currentValueCol={currentSource?.lookup_value_column || null}
            onSave={(tableId, keyCol, valueCol) =>
              onSave({
                field_id: field.id,
                source_type: "lookup_table",
                lookup_table_id: tableId,
                lookup_key_column: keyCol,
                lookup_value_column: valueCol,
              })
            }
            onClose={onClose}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Manual ────────────────────────────────────────────────────

function ManualSourceTab({ field, onSave, onClose }: { field: CalculationField; onSave: () => void; onClose: () => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Users will enter this value manually when running the calculation.
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={onSave}>Save</Button>
      </div>
    </div>
  );
}

// ─── API Connector ─────────────────────────────────────────────

function APIConnectorTab({
  field,
  currentConnector,
  currentConfig,
  onSave,
  onClose,
}: {
  field: CalculationField;
  currentConnector: string | null;
  currentConfig: Record<string, string>;
  onSave: (connector: string, config: Record<string, string>) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(currentConnector || "");
  const [config, setConfig] = useState<Record<string, string>>(currentConfig);
  const connector = API_CONNECTORS.find((c) => c.id === selected);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Select Connector</Label>
        <Select value={selected} onValueChange={(v) => { setSelected(v); setConfig({}); }}>
          <SelectTrigger><SelectValue placeholder="Choose a connector..." /></SelectTrigger>
          <SelectContent>
            {API_CONNECTORS.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-accent" />
                  <span>{c.name}</span>
                  <span className="text-xs text-muted-foreground ml-1">— {c.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {connector && (
        <div className="space-y-3 p-3 rounded-md border border-border bg-muted/10">
          <p className="text-xs text-muted-foreground">{connector.description}</p>
          <div className="grid grid-cols-2 gap-3">
            {connector.fields.map((f) => (
              <div key={f} className="space-y-1">
                <Label className="text-xs text-muted-foreground capitalize">{f.replace("_", " ")}</Label>
                <Input
                  value={config[f] || ""}
                  onChange={(e) => setConfig({ ...config, [f]: e.target.value })}
                  placeholder={`Enter ${f}...`}
                  className="h-8 text-xs"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={() => onSave(selected, config)} disabled={!selected}>
          Save Connector
        </Button>
      </div>
    </div>
  );
}

// ─── Rate File ─────────────────────────────────────────────────

function RateFileTab({
  field,
  currentPath,
  currentName,
  onSave,
  onClose,
}: {
  field: CalculationField;
  currentPath: string | null;
  currentName: string | null;
  onSave: (path: string, name: string) => void;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [filePath, setFilePath] = useState(currentPath || "");
  const [fileName, setFileName] = useState(currentName || "");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const ext = file.name.split(".").pop();
    if (!["csv", "xlsx", "xls"].includes(ext?.toLowerCase() || "")) {
      toast.error("Only CSV and Excel files are supported");
      return;
    }

    setUploading(true);
    try {
      const path = `${user.id}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage
        .from("rate-files")
        .upload(path, file);
      if (error) throw error;
      setFilePath(path);
      setFileName(file.name);
      toast.success(`Uploaded ${file.name}`);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
        {fileName ? (
          <div className="flex items-center justify-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-accent" />
            <span className="text-sm font-medium text-foreground">{fileName}</span>
            <Check className="w-4 h-4 text-green-500" />
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground mb-2">
              Upload a CSV or Excel rate file
            </p>
          </>
        )}
        <label className="cursor-pointer">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleUpload}
            className="hidden"
          />
          <Button variant="outline" size="sm" asChild disabled={uploading}>
            <span>
              {uploading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Uploading...</>
              ) : fileName ? (
                "Replace File"
              ) : (
                "Choose File"
              )}
            </span>
          </Button>
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={() => onSave(filePath, fileName)} disabled={!filePath}>
          Save Rate File
        </Button>
      </div>
    </div>
  );
}

// ─── Lookup Table ──────────────────────────────────────────────

function LookupTableTab({
  field,
  currentTableId,
  currentKeyCol,
  currentValueCol,
  onSave,
  onClose,
}: {
  field: CalculationField;
  currentTableId: string | null;
  currentKeyCol: string | null;
  currentValueCol: string | null;
  onSave: (tableId: string, keyCol: string, valueCol: string) => void;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { data: tables } = useLookupTables();
  const [selectedTable, setSelectedTable] = useState(currentTableId || "");
  const [keyCol, setKeyCol] = useState(currentKeyCol || "");
  const [valueCol, setValueCol] = useState(currentValueCol || "");
  const [showCreate, setShowCreate] = useState(false);

  const table = tables?.find((t) => t.id === selectedTable);
  const columns = (table?.columns as Array<{ name: string; type: string }>) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs text-muted-foreground">Select Lookup Table</Label>
          <Select value={selectedTable} onValueChange={setSelectedTable}>
            <SelectTrigger><SelectValue placeholder="Choose a table..." /></SelectTrigger>
            <SelectContent>
              {tables?.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="pt-5">
          <Button variant="outline" size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1" /> New Table
          </Button>
        </div>
      </div>

      {showCreate && user && (
        <CreateLookupTableInline
          userId={user.id}
          onCreated={(id) => { setSelectedTable(id); setShowCreate(false); }}
          onClose={() => setShowCreate(false)}
        />
      )}

      {table && columns.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Key Column (input)</Label>
            <Select value={keyCol} onValueChange={setKeyCol}>
              <SelectTrigger><SelectValue placeholder="Select column..." /></SelectTrigger>
              <SelectContent>
                {columns.map((c) => (
                  <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Value Column (output)</Label>
            <Select value={valueCol} onValueChange={setValueCol}>
              <SelectTrigger><SelectValue placeholder="Select column..." /></SelectTrigger>
              <SelectContent>
                {columns.map((c) => (
                  <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {selectedTable && (
        <LookupTablePreview tableId={selectedTable} />
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button
          size="sm"
          onClick={() => onSave(selectedTable, keyCol, valueCol)}
          disabled={!selectedTable || !keyCol || !valueCol}
        >
          Save Lookup
        </Button>
      </div>
    </div>
  );
}

// ─── Create Lookup Table Inline ────────────────────────────────

function CreateLookupTableInline({
  userId,
  onCreated,
  onClose,
}: {
  userId: string;
  onCreated: (id: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [colDefs, setColDefs] = useState([
    { name: "key", type: "text" },
    { name: "value", type: "number" },
  ]);
  const [csvData, setCsvData] = useState("");
  const createTable = useCreateLookupTable();
  const bulkInsert = useBulkInsertRows();

  const addColumn = () => setColDefs([...colDefs, { name: "", type: "text" }]);
  const removeColumn = (i: number) => setColDefs(colDefs.filter((_, idx) => idx !== i));
  const updateColumn = (i: number, key: string, val: string) => {
    const updated = [...colDefs];
    (updated[i] as any)[key] = val;
    setColDefs(updated);
  };

  const handleCreate = async () => {
    if (!name) return toast.error("Name is required");
    if (colDefs.some((c) => !c.name)) return toast.error("All columns need names");

    try {
      const table = await createTable.mutateAsync({
        name,
        columns: colDefs as unknown as Json,
        created_by: userId,
      });

      // Parse CSV if provided
      if (csvData.trim()) {
        const lines = csvData.trim().split("\n");
        const headers = lines[0].split(",").map((h) => h.trim());
        const rows = lines.slice(1).map((line, i) => {
          const values = line.split(",").map((v) => v.trim());
          const rowData: Record<string, string> = {};
          headers.forEach((h, j) => {
            rowData[h] = values[j] || "";
          });
          return {
            lookup_table_id: table.id,
            row_data: rowData as unknown as Json,
            row_order: i,
          };
        });
        if (rows.length > 0) {
          await bulkInsert.mutateAsync({ tableId: table.id, rows });
        }
      }

      toast.success(`Lookup table "${name}" created`);
      onCreated(table.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to create table");
    }
  };

  return (
    <div className="rounded-md border border-accent/30 bg-accent/5 p-4 space-y-3">
      <h4 className="text-sm font-semibold text-foreground">Create Lookup Table</h4>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Table Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. City Tier Rates" className="h-8 text-xs" />
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Columns</Label>
        {colDefs.map((col, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={col.name}
              onChange={(e) => updateColumn(i, "name", e.target.value)}
              placeholder="Column name"
              className="h-8 text-xs flex-1"
            />
            <Select value={col.type} onValueChange={(v) => updateColumn(i, "type", v)}>
              <SelectTrigger className="h-8 w-[100px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="number">Number</SelectItem>
              </SelectContent>
            </Select>
            {colDefs.length > 1 && (
              <button onClick={() => removeColumn(i)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={addColumn} className="text-xs">
          <Plus className="w-3 h-3 mr-1" /> Add Column
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Import CSV (optional)</Label>
        <textarea
          value={csvData}
          onChange={(e) => setCsvData(e.target.value)}
          placeholder={"key,value\nTier 1,5000\nTier 2,3500\nTier 3,2000"}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px]"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={handleCreate} disabled={createTable.isPending}>
          {createTable.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
          Create Table
        </Button>
      </div>
    </div>
  );
}

// ─── Lookup Table Preview ──────────────────────────────────────

function LookupTablePreview({ tableId }: { tableId: string }) {
  const { data: rows, isLoading } = useLookupTableRows(tableId);

  if (isLoading) return <div className="py-4 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-accent" /></div>;
  if (!rows || rows.length === 0) return <p className="text-xs text-muted-foreground py-2">No data in this table yet.</p>;

  const firstRow = rows[0].row_data as Record<string, string>;
  const columns = Object.keys(firstRow);

  return (
    <div className="border border-border rounded-md overflow-hidden max-h-40 overflow-y-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/30 border-b border-border">
            {columns.map((col) => (
              <th key={col} className="text-left px-3 py-1.5 font-medium text-muted-foreground">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 10).map((row) => {
            const data = row.row_data as Record<string, string>;
            return (
              <tr key={row.id} className="border-b border-border/50">
                {columns.map((col) => (
                  <td key={col} className="px-3 py-1.5 text-foreground">{data[col]}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length > 10 && (
        <p className="text-xs text-muted-foreground text-center py-1">
          Showing 10 of {rows.length} rows
        </p>
      )}
    </div>
  );
}
