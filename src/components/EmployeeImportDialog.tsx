import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { read, utils } from "@e965/xlsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

// Mapping from expected headers to DB column names
const COLUMN_MAP: Record<string, string> = {
  first_name: "first_name",
  "first name": "first_name",
  last_name: "last_name",
  "last name": "last_name",
  email: "email",
  phone: "phone",
  date_of_birth: "date_of_birth",
  "date of birth": "date_of_birth",
  dob: "date_of_birth",
  job_title: "job_title",
  "job title": "job_title",
  title: "job_title",
  job_grade: "job_grade",
  "job grade": "job_grade",
  grade: "job_grade",
  division: "division",
  department: "division",
  base_salary: "base_salary",
  "base salary": "base_salary",
  salary: "base_salary",
  currency: "currency",
  bonus_percent: "bonus_percent",
  "bonus percent": "bonus_percent",
  "bonus %": "bonus_percent",
  bonus_amount: "bonus_amount",
  "bonus amount": "bonus_amount",
  city: "city",
  country: "country",
  status: "status",
  employee_code: "employee_code",
  "employee code": "employee_code",
  "emp code": "employee_code",
  hire_date: "hire_date",
  "hire date": "hire_date",
};

const REQUIRED_FIELDS = ["first_name", "last_name", "email"];

interface ParsedRow {
  first_name: string;
  last_name: string;
  email: string;
  [key: string]: any;
}

interface RowWithStatus extends ParsedRow {
  _row: number;
  _errors: string[];
}

function normalizeHeader(h: string): string | null {
  const key = h.trim().toLowerCase();
  return COLUMN_MAP[key] ?? null;
}

function validateRow(row: Record<string, any>, rowNum: number): RowWithStatus {
  const errors: string[] = [];
  if (!row.first_name?.toString().trim()) errors.push("Missing first_name");
  if (!row.last_name?.toString().trim()) errors.push("Missing last_name");
  if (!row.email?.toString().trim()) errors.push("Missing email");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.toString().trim())) errors.push("Invalid email");

  if (row.base_salary !== undefined && row.base_salary !== "") {
    const n = Number(row.base_salary);
    if (isNaN(n) || n < 0) errors.push("Invalid base_salary");
  }

  return { ...row, _row: rowNum, _errors: errors } as RowWithStatus;
}

export default function EmployeeImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { activeTenant } = useTenantContext();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<RowWithStatus[]>([]);
  const [mappedCols, setMappedCols] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; failed: number } | null>(null);

  const reset = useCallback(() => {
    setRows([]);
    setMappedCols([]);
    setFileName("");
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);

    try {
      const data = await file.arrayBuffer();
      const wb = read(data, { type: "array", cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const jsonRows = utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

      if (jsonRows.length === 0) {
        toast.error("File is empty or has no data rows.");
        return;
      }

      // Map headers
      const rawHeaders = Object.keys(jsonRows[0]);
      const colMapping: { raw: string; mapped: string | null }[] = rawHeaders.map((h) => ({
        raw: h,
        mapped: normalizeHeader(h),
      }));

      const mapped = colMapping.filter((c) => c.mapped).map((c) => c.mapped!);
      const unmapped = colMapping.filter((c) => !c.mapped).map((c) => c.raw);

      if (unmapped.length > 0) {
        toast.info(`Skipped unrecognized columns: ${unmapped.join(", ")}`);
      }

      const missing = REQUIRED_FIELDS.filter((f) => !mapped.includes(f));
      if (missing.length > 0) {
        toast.error(`Missing required columns: ${missing.join(", ")}`);
        return;
      }

      // Transform rows
      const parsed = jsonRows.map((raw, idx) => {
        const row: Record<string, any> = {};
        for (const cm of colMapping) {
          if (cm.mapped) {
            let val = raw[cm.raw];
            // Handle date objects from xlsx
            if (val instanceof Date) val = val.toISOString().split("T")[0];
            row[cm.mapped] = val?.toString().trim() ?? "";
          }
        }
        return validateRow(row, idx + 2); // +2 for header row + 1-indexed
      });

      setMappedCols(mapped);
      setRows(parsed);
    } catch (err: any) {
      toast.error("Failed to parse file: " + (err.message || "Unknown error"));
    }
  }, []);

  const validRows = rows.filter((r) => r._errors.length === 0);
  const errorRows = rows.filter((r) => r._errors.length > 0);

  const handleImport = useCallback(async () => {
    if (!activeTenant || !user) return;
    setImporting(true);

    const tenantId = activeTenant.tenant_id;
    const records = validRows.map((r) => {
      const rec: Record<string, any> = {
        tenant_id: tenantId,
        created_by: user.id,
        first_name: r.first_name,
        last_name: r.last_name,
        email: r.email,
      };
      // Optional fields
      if (r.phone) rec.phone = r.phone;
      if (r.date_of_birth) rec.date_of_birth = r.date_of_birth;
      if (r.job_title) rec.job_title = r.job_title;
      if (r.job_grade) rec.job_grade = r.job_grade;
      if (r.division) rec.division = r.division;
      if (r.base_salary !== undefined && r.base_salary !== "") rec.base_salary = Number(r.base_salary);
      if (r.currency) rec.currency = r.currency;
      if (r.bonus_percent !== undefined && r.bonus_percent !== "") rec.bonus_percent = Number(r.bonus_percent);
      if (r.bonus_amount !== undefined && r.bonus_amount !== "") rec.bonus_amount = Number(r.bonus_amount);
      if (r.city) rec.city = r.city;
      if (r.country) rec.country = r.country;
      if (r.status) rec.status = r.status;
      if (r.employee_code) rec.employee_code = r.employee_code;
      if (r.hire_date) rec.hire_date = r.hire_date;
      return rec;
    });

    // Insert in batches of 100
    let inserted = 0;
    let failed = 0;
    const BATCH = 100;
    for (let i = 0; i < records.length; i += BATCH) {
      const batch = records.slice(i, i + BATCH);
      const { error, data } = await supabase.from("employees").insert(batch as any).select("id");
      if (error) {
        failed += batch.length;
        console.error("Batch insert error:", error);
      } else {
        inserted += data?.length ?? 0;
      }
    }

    setImporting(false);
    setResult({ inserted, failed });

    if (inserted > 0) {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success(`${inserted} employee(s) imported successfully.`);
    }
    if (failed > 0) {
      toast.error(`${failed} record(s) failed to import.`);
    }
  }, [validRows, activeTenant, user, queryClient]);

  const PREVIEW_COLS = ["first_name", "last_name", "email", "job_title", "division", "base_salary"];
  const displayCols = PREVIEW_COLS.filter((c) => mappedCols.includes(c));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import Employees
          </DialogTitle>
        </DialogHeader>

        {/* File upload */}
        {rows.length === 0 && !result && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a CSV or Excel file with employee data. Required columns:{" "}
              <strong>first_name</strong>, <strong>last_name</strong>, <strong>email</strong>.
            </p>
            <div
              className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium text-foreground">Click to select a file</p>
              <p className="text-xs text-muted-foreground mt-1">CSV, XLS, or XLSX up to 20MB</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xls,.xlsx"
              className="hidden"
              onChange={handleFile}
            />
          </div>
        )}

        {/* Preview */}
        {rows.length > 0 && !result && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <strong>{fileName}</strong> — {rows.length} rows parsed
              </p>
              <div className="flex gap-2">
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> {validRows.length} valid
                </Badge>
                {errorRows.length > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" /> {errorRows.length} errors
                  </Badge>
                )}
              </div>
            </div>

            <div className="overflow-x-auto border rounded-md max-h-[320px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    {displayCols.map((c) => (
                      <TableHead key={c} className="text-xs capitalize">{c.replace(/_/g, " ")}</TableHead>
                    ))}
                    <TableHead className="w-32">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 100).map((r, i) => (
                    <TableRow key={i} className={r._errors.length ? "bg-destructive/5" : ""}>
                      <TableCell className="text-xs text-muted-foreground">{r._row}</TableCell>
                      {displayCols.map((c) => (
                        <TableCell key={c} className="text-xs max-w-[160px] truncate">
                          {r[c] ?? "—"}
                        </TableCell>
                      ))}
                      <TableCell>
                        {r._errors.length > 0 ? (
                          <span className="text-xs text-destructive">{r._errors.join("; ")}</span>
                        ) : (
                          <span className="text-xs text-primary">OK</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {rows.length > 100 && (
              <p className="text-xs text-muted-foreground text-center">
                Showing first 100 of {rows.length} rows
              </p>
            )}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="py-6 text-center space-y-2">
            <CheckCircle2 className="h-10 w-10 mx-auto text-primary" />
            <p className="text-lg font-semibold">{result.inserted} employees imported</p>
            {result.failed > 0 && (
              <p className="text-sm text-destructive">{result.failed} rows failed</p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {rows.length > 0 && !result && (
            <>
              <Button variant="outline" onClick={reset}>
                Start Over
              </Button>
              <Button
                onClick={handleImport}
                disabled={validRows.length === 0 || importing}
              >
                {importing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing…</>
                ) : (
                  <>Import {validRows.length} Employee{validRows.length !== 1 ? "s" : ""}</>
                )}
              </Button>
            </>
          )}
          {result && (
            <Button onClick={() => { reset(); onOpenChange(false); }}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
