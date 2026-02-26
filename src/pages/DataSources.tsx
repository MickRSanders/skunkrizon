import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Plus,
  Search,
  Cable,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Trash2,
  ExternalLink,
  Clock,
  Wifi,
  WifiOff,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";

// Types for data source connections
interface DataSourceConnection {
  id: string;
  name: string;
  type: string;
  status: "connected" | "disconnected" | "error";
  lastSync: string | null;
  endpoint: string;
  description: string;
}

const CONNECTOR_TYPES = [
  { value: "rest_api", label: "REST API", description: "Connect to any REST API endpoint" },
  { value: "hris", label: "HRIS", description: "Human Resource Information System (e.g. Workday, SAP SuccessFactors)" },
  { value: "payroll", label: "Payroll Provider", description: "Payroll data feeds (e.g. ADP, Ceridian)" },
  { value: "tax_data", label: "Tax Data Provider", description: "Tax rate and compliance data APIs" },
  { value: "cost_of_living", label: "Cost of Living Index", description: "COLA / cost-of-living data feeds" },
  { value: "immigration", label: "Immigration / Visa", description: "Immigration status and visa tracking" },
];

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  connected: { label: "Connected", icon: CheckCircle2, className: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800" },
  disconnected: { label: "Disconnected", icon: WifiOff, className: "text-muted-foreground bg-muted border-border" },
  error: { label: "Error", icon: XCircle, className: "text-destructive bg-destructive/10 border-destructive/30" },
};

// Mock data — will be replaced with real DB-backed connections
const MOCK_CONNECTIONS: DataSourceConnection[] = [
  {
    id: "1",
    name: "Workday HCM",
    type: "hris",
    status: "connected",
    lastSync: "2026-02-26T10:30:00Z",
    endpoint: "https://api.workday.com/v1",
    description: "Employee master data and org hierarchy",
  },
  {
    id: "2",
    name: "ADP Payroll Feed",
    type: "payroll",
    status: "disconnected",
    lastSync: null,
    endpoint: "https://api.adp.com/payroll/v2",
    description: "Payroll and compensation data",
  },
  {
    id: "3",
    name: "ECA International COLA",
    type: "cost_of_living",
    status: "error",
    lastSync: "2026-02-20T08:15:00Z",
    endpoint: "https://api.eca-international.com/cola",
    description: "Cost-of-living allowance indices",
  },
];

export default function DataSources() {
  const [connections, setConnections] = useState<DataSourceConnection[]>(MOCK_CONNECTIONS);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  // New connection form state
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("");
  const [newEndpoint, setNewEndpoint] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const filteredConnections = connections.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === "all" || c.type === filterType;
    return matchSearch && matchType;
  });

  const handleAdd = () => {
    if (!newName || !newType || !newEndpoint) {
      toast.error("Please fill in all required fields");
      return;
    }
    const conn: DataSourceConnection = {
      id: crypto.randomUUID(),
      name: newName,
      type: newType,
      status: "disconnected",
      lastSync: null,
      endpoint: newEndpoint,
      description: newDescription,
    };
    setConnections((prev) => [...prev, conn]);
    toast.success(`"${newName}" added — configure credentials to connect`);
    resetForm();
    setShowAddDialog(false);
  };

  const handleTestConnection = (id: string) => {
    toast.info("Testing connection...");
    setTimeout(() => {
      setConnections((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "connected" as const, lastSync: new Date().toISOString() } : c))
      );
      toast.success("Connection successful");
    }, 1500);
  };

  const handleDelete = (id: string) => {
    const conn = connections.find((c) => c.id === id);
    setConnections((prev) => prev.filter((c) => c.id !== id));
    toast.success(`"${conn?.name}" removed`);
  };

  const resetForm = () => {
    setNewName("");
    setNewType("");
    setNewEndpoint("");
    setNewDescription("");
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "Never";
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const connectedCount = connections.filter((c) => c.status === "connected").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Data Sources</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage API connections that pull data into the system
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add Connection
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Cable className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{connections.length}</p>
            <p className="text-xs text-muted-foreground">Total Sources</p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
            <Wifi className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{connectedCount}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
            <XCircle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {connections.filter((c) => c.status === "error").length}
            </p>
            <p className="text-xs text-muted-foreground">Errors</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search connections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {CONNECTOR_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Connection list */}
      <div className="space-y-3">
        {filteredConnections.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <Cable className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No data sources found</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add your first connection
            </Button>
          </div>
        ) : (
          filteredConnections.map((conn) => {
            const statusCfg = STATUS_CONFIG[conn.status];
            const StatusIcon = statusCfg.icon;
            const typeLabel = CONNECTOR_TYPES.find((t) => t.value === conn.type)?.label ?? conn.type;

            return (
              <div
                key={conn.id}
                className="rounded-lg border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-foreground truncate">{conn.name}</h3>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusCfg.className}`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusCfg.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{conn.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Settings2 className="w-3 h-3" /> {typeLabel}
                    </span>
                    <span className="flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      <span className="font-mono truncate max-w-[200px]">{conn.endpoint}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Last sync: {formatDate(conn.lastSync)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTestConnection(conn.id)}
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Test
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(conn.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Connection Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Data Source Connection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Connection Name *</Label>
              <Input
                placeholder="e.g. Workday HCM Production"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Connector Type *</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {CONNECTOR_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex flex-col">
                        <span>{t.label}</span>
                        <span className="text-[10px] text-muted-foreground">{t.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>API Endpoint *</Label>
              <Input
                placeholder="https://api.example.com/v1"
                value={newEndpoint}
                onChange={(e) => setNewEndpoint(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                placeholder="What data does this connection provide?"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setShowAddDialog(false); }}>
              Cancel
            </Button>
            <Button onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-1" /> Add Connection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
