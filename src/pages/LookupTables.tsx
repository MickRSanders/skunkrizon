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
import {
  Table2,
  Plus,
  Search,
  Loader2,
  ArrowLeft,
  Trash2,
  Save,
  Upload,
  FileSpreadsheet,
  Pencil,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  useLookupTables,
  useCreateLookupTable,
  useDeleteLookupTable,
  useLookupTableRows,
  useBulkInsertRows,
  useUpdateLookupTableRows,
  useDeleteLookupTableRow,
  type LookupTable,
} from "@/hooks/useCalculations";
import type { Json } from "@/integrations/supabase/types";

export default function LookupTablesPage() {
  const { data: tables, isLoading } = useLookupTables();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingTable, setEditingTable] = useState<LookupTable | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const { user } = useAuth();
  const deleteLookup = useDeleteLookupTable();

  const filtered = tables?.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete lookup table "${name}"? This will remove all its data.`)) return;
    try {
      await deleteLookup.mutateAsync(id);
      toast.success(`Deleted "${name}"`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  if (editingTable) {
    return <LookupTableEditor table={editingTable} onBack={() => setEditingTable(null)} />;
  }

  if (showCreate && user) {
    return (
      <CreateLookupTable
        userId={user.id}
        onBack={() => setShowCreate(false)}
        onCreated={(table) => {
          setShowCreate(false);
          setEditingTable(table);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lookup Tables</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Reference data tables used by calculations and field data sources
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1" /> New Table
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-sm bg-card border border-border rounded-md px-3 py-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search tables..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent text-sm outline-none w-full text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((t) => {
            const cols = (t.columns as Array<{ name: string; type: string }>) || [];
            return (
              <div
                key={t.id}
                className="bg-card rounded-lg border border-border p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Table2 className="w-4 h-4 text-accent" />
                    <span className="text-xs text-muted-foreground">
                      {cols.length} column{cols.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(t.id, t.name)}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-1">{t.name}</h3>
                {t.description && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{t.description}</p>
                )}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {cols.map((c) => (
                    <span
                      key={c.name}
                      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-muted/50 text-muted-foreground border border-border"
                    >
                      {c.name}
                      <span className="ml-1 text-accent">{c.type}</span>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1 pt-2 border-t border-border">
                  <Button variant="ghost" size="sm" onClick={() => setEditingTable(t)} className="text-xs gap-1">
                    <Pencil className="w-3.5 h-3.5" /> Edit Data
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-12 text-center">
          <Table2 className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            {searchTerm ? "No tables match your search" : "No lookup tables yet. Create your first one!"}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Create Lookup Table ───────────────────────────────────────

function CreateLookupTable({
  userId,
  onBack,
  onCreated,
}: {
  userId: string;
  onBack: () => void;
  onCreated: (table: LookupTable) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
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
        description: description || null,
        columns: colDefs as unknown as Json,
        created_by: userId,
      });

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
      onCreated(table);
    } catch (err: any) {
      toast.error(err.message || "Failed to create table");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">New Lookup Table</h1>
      </div>

      <div className="max-w-2xl bg-card border border-border rounded-lg p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Table Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. City Tier Rates" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this table for?" />
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground">Column Definitions</Label>
          {colDefs.map((col, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={col.name}
                onChange={(e) => updateColumn(i, "name", e.target.value)}
                placeholder="Column name"
                className="flex-1 font-mono text-sm"
              />
              <Select value={col.type} onValueChange={(v) => updateColumn(i, "type", v)}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="currency">Currency</SelectItem>
                </SelectContent>
              </Select>
              {colDefs.length > 1 && (
                <button onClick={() => removeColumn(i)} className="p-1 text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={addColumn} className="text-xs">
            <Plus className="w-3 h-3 mr-1" /> Add Column
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Import CSV Data (optional)</Label>
          <p className="text-[10px] text-muted-foreground">
            First row = headers. Must match column names above.
          </p>
          <textarea
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            placeholder={"key,value\nTier 1,5000\nTier 2,3500\nTier 3,2000"}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[100px]"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onBack}>Cancel</Button>
          <Button size="sm" onClick={handleCreate} disabled={createTable.isPending}>
            {createTable.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            Create Table
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Lookup Table Editor ───────────────────────────────────────

function LookupTableEditor({
  table,
  onBack,
}: {
  table: LookupTable;
  onBack: () => void;
}) {
  const cols = (table.columns as Array<{ name: string; type: string }>) || [];
  const { data: rows, isLoading } = useLookupTableRows(table.id);
  const bulkInsert = useBulkInsertRows();
  const updateRow = useUpdateLookupTableRows();
  const deleteRow = useDeleteLookupTableRow();

  const [newRow, setNewRow] = useState<Record<string, string>>(() => {
    const r: Record<string, string> = {};
    cols.forEach((c) => (r[c.name] = ""));
    return r;
  });
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingRowData, setEditingRowData] = useState<Record<string, string>>({});
  const [csvImport, setCsvImport] = useState("");
  const [showImport, setShowImport] = useState(false);

  const handleAddRow = async () => {
    if (Object.values(newRow).every((v) => !v)) return toast.error("Enter at least one value");
    try {
      await bulkInsert.mutateAsync({
        tableId: table.id,
        rows: [{
          lookup_table_id: table.id,
          row_data: newRow as unknown as Json,
          row_order: (rows?.length || 0),
        }],
      });
      const reset: Record<string, string> = {};
      cols.forEach((c) => (reset[c.name] = ""));
      setNewRow(reset);
      toast.success("Row added");
    } catch (err: any) {
      toast.error(err.message || "Failed to add row");
    }
  };

  const handleUpdateRow = async (rowId: string) => {
    try {
      await updateRow.mutateAsync({ tableId: table.id, rowId, rowData: editingRowData });
      setEditingRowId(null);
      toast.success("Row updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    }
  };

  const handleDeleteRow = async (rowId: string) => {
    try {
      await deleteRow.mutateAsync({ rowId, tableId: table.id });
      toast.success("Row deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  const handleCsvImport = async () => {
    if (!csvImport.trim()) return;
    const lines = csvImport.trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.trim());
    const importRows = lines.slice(1).map((line, i) => {
      const values = line.split(",").map((v) => v.trim());
      const rowData: Record<string, string> = {};
      headers.forEach((h, j) => (rowData[h] = values[j] || ""));
      return {
        lookup_table_id: table.id,
        row_data: rowData as unknown as Json,
        row_order: (rows?.length || 0) + i,
      };
    });
    try {
      await bulkInsert.mutateAsync({ tableId: table.id, rows: importRows });
      setCsvImport("");
      setShowImport(false);
      toast.success(`Imported ${importRows.length} rows`);
    } catch (err: any) {
      toast.error(err.message || "Import failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{table.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {cols.length} columns · {rows?.length || 0} rows
              {table.description && ` · ${table.description}`}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowImport(!showImport)}>
          <Upload className="w-4 h-4 mr-1" /> Import CSV
        </Button>
      </div>

      {showImport && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-3 max-w-2xl">
          <h3 className="text-sm font-semibold text-foreground">Import CSV Data</h3>
          <textarea
            value={csvImport}
            onChange={(e) => setCsvImport(e.target.value)}
            placeholder={cols.map((c) => c.name).join(",") + "\nvalue1,value2,..."}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[100px]"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowImport(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCsvImport} disabled={bulkInsert.isPending}>
              {bulkInsert.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Import
            </Button>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-accent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {cols.map((c) => (
                    <th key={c.name} className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {c.name}
                      <span className="ml-1 text-accent normal-case">{c.type}</span>
                    </th>
                  ))}
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Add new row */}
                <tr className="border-b border-border bg-accent/5">
                  {cols.map((c) => (
                    <td key={c.name} className="px-4 py-2">
                      <Input
                        value={newRow[c.name] || ""}
                        onChange={(e) => setNewRow({ ...newRow, [c.name]: e.target.value })}
                        placeholder={`New ${c.name}...`}
                        className="h-7 text-xs"
                      />
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right">
                    <Button size="sm" variant="outline" onClick={handleAddRow} className="h-7 text-xs">
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </Button>
                  </td>
                </tr>
                {/* Existing rows */}
                {rows?.map((row) => {
                  const data = row.row_data as Record<string, string>;
                  const isEditing = editingRowId === row.id;
                  return (
                    <tr key={row.id} className="border-b border-border/50 hover:bg-muted/10">
                      {cols.map((c) => (
                        <td key={c.name} className="px-4 py-2">
                          {isEditing ? (
                            <Input
                              value={editingRowData[c.name] || ""}
                              onChange={(e) => setEditingRowData({ ...editingRowData, [c.name]: e.target.value })}
                              className="h-7 text-xs"
                            />
                          ) : (
                            <span className="text-sm text-foreground">{data[c.name] ?? "—"}</span>
                          )}
                        </td>
                      ))}
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleUpdateRow(row.id)}
                                className="p-1 rounded hover:bg-accent/10 text-accent"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingRowId(null)}
                                className="p-1 rounded hover:bg-muted text-muted-foreground"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setEditingRowId(row.id);
                                  setEditingRowData({ ...data });
                                }}
                                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteRow(row.id)}
                                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {(!rows || rows.length === 0) && (
                  <tr>
                    <td colSpan={cols.length + 1} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No data yet. Add rows above or import CSV.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
