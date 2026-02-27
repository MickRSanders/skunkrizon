import { useState } from "react";
import { useRemoteWorkRequests, RemoteWorkRequest, RemoteWorkStatus, RiskLevel } from "@/hooks/useRemoteWork";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Globe,
  Calendar,
  MapPin,
  Trash2,
  LayoutGrid,
  List,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Laptop,
  Briefcase,
  Shield,
} from "lucide-react";
import { format } from "date-fns";
import PageTransition from "@/components/PageTransition";
import CreateRemoteWorkDialog from "@/components/remotework/CreateRemoteWorkDialog";
import LocationMap, { type LocationPoint } from "@/components/remotework/LocationMap";

const statusConfig: Record<RemoteWorkStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  draft: { label: "Draft", variant: "secondary", icon: Clock },
  submitted: { label: "Submitted", variant: "default", icon: CheckCircle2 },
  under_review: { label: "Under Review", variant: "outline", icon: Eye },
  approved: { label: "Approved", variant: "default", icon: CheckCircle2 },
  declined: { label: "Declined", variant: "destructive", icon: XCircle },
  active: { label: "Active", variant: "default", icon: Globe },
  completed: { label: "Completed", variant: "outline", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", variant: "secondary", icon: XCircle },
};

const riskConfig: Record<RiskLevel, { label: string; color: string }> = {
  pending: { label: "Pending", color: "text-muted-foreground" },
  low: { label: "Low", color: "text-green-600 dark:text-green-400" },
  medium: { label: "Medium", color: "text-yellow-600 dark:text-yellow-400" },
  high: { label: "High", color: "text-orange-600 dark:text-orange-400" },
  blocker: { label: "Blocker", color: "text-destructive" },
};

export default function RemoteWork() {
  const { data: requests, isLoading, deleteRequest } = useRemoteWorkRequests();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "employee_remote" | "virtual_assignment">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [prefillLocation, setPrefillLocation] = useState<{ country: string; city: string } | null>(null);

  const handleRequestFromMap = (location: LocationPoint) => {
    setPrefillLocation({ country: location.country, city: location.city });
    setDialogOpen(true);
  };

  const filtered = (requests ?? []).filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch =
      r.employee_name.toLowerCase().includes(q) ||
      r.request_code.toLowerCase().includes(q) ||
      r.host_country.toLowerCase().includes(q) ||
      (r.purpose ?? "").toLowerCase().includes(q);
    const matchesType = typeFilter === "all" || r.request_type === typeFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && (r.status === "active" || r.status === "approved")) ||
      (statusFilter === "pending" && (r.status === "submitted" || r.status === "under_review")) ||
      (statusFilter === "high_risk" && (r.overall_risk_level === "high" || r.overall_risk_level === "blocker"));
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Delete this request?")) deleteRequest.mutate(id);
  };

  // Stats
  const total = requests?.length ?? 0;
  const activeCount = requests?.filter((r) => r.status === "active" || r.status === "approved").length ?? 0;
  const pendingCount = requests?.filter((r) => r.status === "submitted" || r.status === "under_review").length ?? 0;
  const highRiskCount = requests?.filter((r) => r.overall_risk_level === "high" || r.overall_risk_level === "blocker").length ?? 0;

  return (
    <PageTransition>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Remote Work</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage cross-border remote work requests and virtual assignments.
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> New Request
          </Button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "all" ? "ring-2 ring-primary" : ""}`}
            onClick={() => setStatusFilter(statusFilter === "all" ? "all" : "all")}
          ><CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Requests</p>
            <p className="text-2xl font-bold text-foreground mt-1">{total}</p>
          </CardContent></Card>
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "active" ? "ring-2 ring-primary" : ""}`}
            onClick={() => setStatusFilter(statusFilter === "active" ? "all" : "active")}
          ><CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Active</p>
            <p className="text-2xl font-bold text-accent mt-1">{activeCount}</p>
          </CardContent></Card>
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "pending" ? "ring-2 ring-primary" : ""}`}
            onClick={() => setStatusFilter(statusFilter === "pending" ? "all" : "pending")}
          ><CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending Review</p>
            <p className="text-2xl font-bold text-warning mt-1">{pendingCount}</p>
          </CardContent></Card>
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "high_risk" ? "ring-2 ring-primary" : ""}`}
            onClick={() => setStatusFilter(statusFilter === "high_risk" ? "all" : "high_risk")}
          ><CardContent className="p-4 flex items-start gap-2">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">High Risk</p>
              <p className="text-2xl font-bold text-destructive mt-1">{highRiskCount}</p>
            </div>
            {highRiskCount > 0 && <Shield className="w-5 h-5 text-destructive mt-1" />}
          </CardContent></Card>
        </div>

        {/* Location Map */}
        <LocationMap onRequestFromLocation={handleRequestFromMap} />

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, code, or country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)} className="shrink-0">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="employee_remote" className="gap-1.5"><Laptop className="w-3.5 h-3.5" />Remote</TabsTrigger>
              <TabsTrigger value="virtual_assignment" className="gap-1.5"><Briefcase className="w-3.5 h-3.5" />Virtual</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex border rounded-md">
            <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" onClick={() => setViewMode("grid")}>
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="icon" onClick={() => setViewMode("list")}>
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading requests...</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Globe className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-1">No remote work requests yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create a request to evaluate cross-border remote working risks.
              </p>
              <Button onClick={() => setDialogOpen(true)} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" /> Create First Request
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((req) => (
              <RequestCard
                key={req.id}
                request={req}
                onClick={() => navigate(`/remote-work/${req.id}`)}
                onDelete={(e) => handleDelete(e, req.id)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((req) => (
              <RequestRow
                key={req.id}
                request={req}
                onClick={() => navigate(`/remote-work/${req.id}`)}
                onDelete={(e) => handleDelete(e, req.id)}
              />
            ))}
          </div>
        )}

        <CreateRemoteWorkDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setPrefillLocation(null);
          }}
          prefillHostCountry={prefillLocation?.country}
          prefillHostCity={prefillLocation?.city}
        />
      </div>
    </PageTransition>
  );
}

function RequestCard({ request: r, onClick, onDelete }: { request: RemoteWorkRequest; onClick: () => void; onDelete: (e: React.MouseEvent) => void }) {
  const sc = statusConfig[r.status];
  const StatusIcon = sc.icon;
  const risk = riskConfig[r.overall_risk_level];

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow group" onClick={onClick}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-mono text-muted-foreground">{r.request_code}</p>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {r.request_type === "employee_remote" ? "Remote" : "Virtual"}
              </Badge>
            </div>
            <h3 className="font-semibold text-foreground mt-1">{r.employee_name}</h3>
            {r.job_title && <p className="text-xs text-muted-foreground">{r.job_title}</p>}
          </div>
          <Badge variant={sc.variant} className="gap-1 text-xs">
            <StatusIcon className="w-3 h-3" />
            {sc.label}
          </Badge>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span>{r.home_country}</span>
          <span className="text-muted-foreground/50">→</span>
          <span className="font-medium text-foreground">{r.host_country}</span>
        </div>

        {r.purpose && (
          <p className="text-sm text-muted-foreground line-clamp-2">{r.purpose}</p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {format(new Date(r.start_date), "MMM d, yyyy")}
            </span>
            <span className={`flex items-center gap-1 ${risk.color}`}>
              <AlertTriangle className="w-3 h-3" /> {risk.label}
            </span>
          </div>
          {r.status === "draft" && (
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive" onClick={onDelete}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RequestRow({ request: r, onClick, onDelete }: { request: RemoteWorkRequest; onClick: () => void; onDelete: (e: React.MouseEvent) => void }) {
  const sc = statusConfig[r.status];
  const StatusIcon = sc.icon;
  const risk = riskConfig[r.overall_risk_level];

  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-lg border bg-card hover:shadow-sm transition-shadow cursor-pointer group" onClick={onClick}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground">{r.request_code}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {r.request_type === "employee_remote" ? "Remote" : "Virtual"}
          </Badge>
          <span className="font-medium text-foreground truncate">{r.employee_name}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <span>{r.home_country} → {r.host_country}</span>
        </div>
      </div>
      <span className={`text-xs ${risk.color} hidden sm:flex items-center gap-1`}>
        <AlertTriangle className="w-3 h-3" /> {risk.label}
      </span>
      <span className="text-xs text-muted-foreground hidden sm:block">
        {format(new Date(r.start_date), "MMM d, yyyy")}
      </span>
      <Badge variant={sc.variant} className="gap-1 text-xs shrink-0">
        <StatusIcon className="w-3 h-3" />
        {sc.label}
      </Badge>
      {r.status === "draft" && (
        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive shrink-0" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}
