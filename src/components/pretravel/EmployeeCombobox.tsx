import { useState, useMemo } from "react";
import { Employee } from "@/hooks/useEmployees";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronsUpDown, Search, User, X } from "lucide-react";

interface Props {
  employees: Employee[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (employee: Employee | null) => void;
}

export default function EmployeeCombobox({ employees, isLoading, selectedId, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = useMemo(
    () => employees.find((e) => e.id === selectedId) ?? null,
    [employees, selectedId]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return employees.slice(0, 50);
    const q = search.toLowerCase();
    return employees
      .filter(
        (e) =>
          `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
          e.employee_code.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          (e.job_title ?? "").toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [employees, search]);

  return (
    <div className="space-y-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal h-9 text-sm"
          >
            {selected ? (
              <span className="truncate">
                {selected.first_name} {selected.last_name} — {selected.employee_code}
              </span>
            ) : (
              <span className="text-muted-foreground">Select employee…</span>
            )}
            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, ID, or email…"
              className="h-7 border-0 p-0 text-sm focus-visible:ring-0 shadow-none"
            />
          </div>
          <ScrollArea className="max-h-60">
            {isLoading ? (
              <p className="text-xs text-muted-foreground p-3">Loading employees…</p>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground p-3">No employees found</p>
            ) : (
              <div className="p-1">
                {filtered.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => {
                      onSelect(emp);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`w-full flex items-start gap-2.5 rounded-md px-2.5 py-2 text-left hover:bg-accent transition-colors ${
                      emp.id === selectedId ? "bg-accent" : ""
                    }`}
                  >
                    <User className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {emp.first_name} {emp.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {emp.employee_code} · {emp.job_title ?? "—"} · {emp.city ?? ""}{emp.city && emp.country ? ", " : ""}{emp.country ?? ""}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {selected && (
        <button
          onClick={() => onSelect(null)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3 w-3" /> Clear selection
        </button>
      )}
    </div>
  );
}
