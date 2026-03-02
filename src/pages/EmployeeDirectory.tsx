import { useState, useMemo } from "react";
import CostEstimateDetailViewer from "@/components/CostEstimateDetailViewer";
import { useEmployees, Employee } from "@/hooks/useEmployees";
import { useEmployeeDependents, Dependent } from "@/hooks/useEmployeeDependents";
import { useEmployeeCostEstimates } from "@/hooks/useCostEstimates";
import PageTransition from "@/components/PageTransition";
import EmployeeImportDialog from "@/components/EmployeeImportDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Users,
  X,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  DollarSign,
  UserCircle,
  Heart,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Upload } from "lucide-react";
import { format } from "date-fns";

function formatCurrency(v: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);
}

function formatDate(d: string | null) {
  if (!d) return "—";
  try { return format(new Date(d), "MMM d, yyyy"); } catch { return d; }
}

export default function EmployeeDirectory() {
  const { data: employees = [], isLoading } = useEmployees();

  const [search, setSearch] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("__all__");
  const [gradeFilter, setGradeFilter] = useState("__all__");
  const [locationFilter, setLocationFilter] = useState("__all__");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  // Derive unique filter options
  const divisions = useMemo(() => [...new Set(employees.map((e) => e.division).filter(Boolean))].sort() as string[], [employees]);
  const grades = useMemo(() => [...new Set(employees.map((e) => e.job_grade).filter(Boolean))].sort() as string[], [employees]);
  const locations = useMemo(() => {
    const locs = employees.map((e) => [e.city, e.country].filter(Boolean).join(", ")).filter(Boolean);
    return [...new Set(locs)].sort();
  }, [employees]);

  const filtered = useMemo(() => {
    let result = employees;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
          e.employee_code.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          (e.job_title ?? "").toLowerCase().includes(q)
      );
    }
    if (divisionFilter !== "__all__") result = result.filter((e) => e.division === divisionFilter);
    if (gradeFilter !== "__all__") result = result.filter((e) => e.job_grade === gradeFilter);
    if (locationFilter !== "__all__") result = result.filter((e) => [e.city, e.country].filter(Boolean).join(", ") === locationFilter);
    return result;
  }, [employees, search, divisionFilter, gradeFilter, locationFilter]);

  const hasFilters = divisionFilter !== "__all__" || gradeFilter !== "__all__" || locationFilter !== "__all__" || search.trim();

  // Reset page when filters change
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  if (safePage !== page) setPage(safePage);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Employee Directory</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {employees.length} active employees
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> Import
            </Button>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                {filtered.length} shown
              </span>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[240px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, ID, email, or title…"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="w-44">
                <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Division" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Divisions</SelectItem>
                    {divisions.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-32">
                <Select value={gradeFilter} onValueChange={setGradeFilter}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Grades</SelectItem>
                    {grades.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Locations</SelectItem>
                    {locations.map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setSearch(""); setDivisionFilter("__all__"); setGradeFilter("__all__"); setLocationFilter("__all__"); setPage(1); }}
                  className="gap-1 text-xs"
                >
                  <X className="h-3 w-3" /> Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">Loading employees…</div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-sm text-muted-foreground">
                <Users className="h-10 w-10 mb-3 opacity-30" />
                <p>No employees found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Employee</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Division</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Base Salary</TableHead>
                      <TableHead className="text-right">Bonus %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((emp) => (
                      <TableRow
                        key={emp.id}
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => setSelectedEmployee(emp)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{emp.first_name} {emp.last_name}</p>
                            <p className="text-xs text-muted-foreground">{emp.employee_code}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{emp.job_title ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{emp.job_grade ?? "—"}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{emp.division ?? "—"}</TableCell>
                        <TableCell className="text-sm">
                          {[emp.city, emp.country].filter(Boolean).join(", ") || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-right font-medium">
                          {formatCurrency(emp.base_salary, emp.currency)}
                        </TableCell>
                        <TableCell className="text-sm text-right">
                          {emp.bonus_percent != null ? `${emp.bonus_percent}%` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination Footer */}
            {!isLoading && filtered.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between border-t px-4 py-3 gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Rows per page</span>
                  <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                    <SelectTrigger className="h-8 w-[70px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 25, 50, 100].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <span>
                    {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
                  </span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={safePage <= 1} onClick={() => setPage(1)}>
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={safePage >= totalPages} onClick={() => setPage(totalPages)}>
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      {selectedEmployee && (
        <EmployeeDetailDialog
          employee={selectedEmployee}
          open={!!selectedEmployee}
          onOpenChange={(open) => !open && setSelectedEmployee(null)}
        />
      )}
      <EmployeeImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </PageTransition>
  );
}

/* ---------- Detail Dialog ---------- */

function EmployeeDetailDialog({
  employee,
  open,
  onOpenChange,
}: {
  employee: Employee;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: dependents = [], isLoading } = useEmployeeDependents(employee.id);
  const { data: costEstimates = [], isLoading: estimatesLoading } = useEmployeeCostEstimates(employee.id);
  const [selectedEstimate, setSelectedEstimate] = useState<any>(null);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-primary" />
            {employee.first_name} {employee.last_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Core info */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <InfoRow icon={Briefcase} label="Title" value={employee.job_title} />
            <InfoRow icon={Briefcase} label="Grade" value={employee.job_grade} />
            <InfoRow icon={Briefcase} label="Division" value={employee.division} />
            <InfoRow icon={Calendar} label="Date of Birth" value={formatDate(employee.date_of_birth)} />
            <InfoRow icon={Mail} label="Email" value={employee.email} />
            <InfoRow icon={Phone} label="Phone" value={employee.phone} />
            <InfoRow icon={MapPin} label="Location" value={[employee.city, employee.country].filter(Boolean).join(", ")} />
            <InfoRow icon={Briefcase} label="Employee Code" value={employee.employee_code} />
          </div>

          <Separator />

          {/* Compensation */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-primary" /> Compensation
            </h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <InfoRow label="Base Salary" value={formatCurrency(employee.base_salary, employee.currency)} />
              <InfoRow label="Currency" value={employee.currency} />
              <InfoRow label="Bonus %" value={employee.bonus_percent != null ? `${employee.bonus_percent}%` : null} />
              <InfoRow label="Bonus Amount" value={employee.bonus_amount != null ? formatCurrency(employee.bonus_amount, employee.currency) : null} />
            </div>
          </div>

          <Separator />

          {/* Dependents */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Heart className="h-4 w-4 text-primary" /> Dependents
              <Badge variant="secondary" className="ml-1 text-[10px]">{dependents.length}</Badge>
            </h4>
            {isLoading ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : dependents.length === 0 ? (
              <p className="text-xs text-muted-foreground">No dependents on file</p>
            ) : (
              <div className="space-y-2">
                {dependents.map((dep) => (
                  <div key={dep.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{dep.first_name} {dep.last_name}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(dep.date_of_birth)}</p>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">{dep.relationship}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Cost Estimates */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <FileSpreadsheet className="h-4 w-4 text-primary" /> Cost Estimates
              <Badge variant="secondary" className="ml-1 text-[10px]">{costEstimates.length}</Badge>
            </h4>
            {estimatesLoading ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : costEstimates.length === 0 ? (
              <p className="text-xs text-muted-foreground">No cost estimates generated</p>
            ) : (
              <div className="space-y-2">
                {costEstimates.map((est: any) => (
                  <div key={est.id} className="flex items-center justify-between rounded-md border px-3 py-2 cursor-pointer hover:bg-accent/30 transition-colors" onClick={() => setSelectedEstimate(est)}>
                    <div>
                      <p className="text-sm font-medium">
                        {est.employee_name || "Unnamed"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(est.created_at)} · {est.display_currency} {est.total_cost?.toLocaleString() ?? "—"}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">{est.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <CostEstimateDetailViewer
          estimate={selectedEstimate}
          open={!!selectedEstimate}
          onOpenChange={(open) => { if (!open) setSelectedEstimate(null); }}
        />
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon?: any; label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />}
      <div>
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="font-medium">{value || "—"}</p>
      </div>
    </div>
  );
}
