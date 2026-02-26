import { useState } from "react";
import { useTrips, Trip, TripStatus } from "@/hooks/useTrips";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  Search,
  Plane,
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
} from "lucide-react";
import { format } from "date-fns";
import PageTransition from "@/components/PageTransition";
import CreateTripDialog from "@/components/pretravel/CreateTripDialog";

const statusConfig: Record<TripStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  draft: { label: "Draft", variant: "secondary", icon: Clock },
  confirmed: { label: "Confirmed", variant: "default", icon: CheckCircle2 },
  assessed: { label: "Assessed", variant: "default", icon: CheckCircle2 },
  monitoring: { label: "Monitoring", variant: "outline", icon: Eye },
  needs_info: { label: "Needs Info", variant: "secondary", icon: AlertTriangle },
  attention: { label: "Attention", variant: "destructive", icon: AlertTriangle },
  escalate: { label: "Escalate", variant: "destructive", icon: XCircle },
  closed: { label: "Closed", variant: "outline", icon: CheckCircle2 },
};

export default function PreTravel() {
  const { data: trips, isLoading, deleteTrip } = useTrips();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = (trips ?? []).filter((t) => {
    const q = search.toLowerCase();
    return (
      t.traveler_name.toLowerCase().includes(q) ||
      t.trip_code.toLowerCase().includes(q) ||
      (t.purpose ?? "").toLowerCase().includes(q)
    );
  });

  const handleDelete = (e: React.MouseEvent, tripId: string) => {
    e.stopPropagation();
    if (confirm("Delete this trip?")) deleteTrip.mutate(tripId);
  };

  return (
    <PageTransition>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pre-Travel Assessments</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Evaluate immigration, Schengen, and posted-worker compliance before travel.
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> New Trip
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by traveler, code, or purpose..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading trips...</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Plane className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-1">No trips yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create a pre-travel assessment to evaluate compliance risks.
              </p>
              <Button onClick={() => setDialogOpen(true)} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" /> Create First Trip
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onClick={() => navigate(`/pre-travel/${trip.id}`)}
                onDelete={(e) => handleDelete(e, trip.id)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((trip) => (
              <TripRow
                key={trip.id}
                trip={trip}
                onClick={() => navigate(`/pre-travel/${trip.id}`)}
                onDelete={(e) => handleDelete(e, trip.id)}
              />
            ))}
          </div>
        )}

        <CreateTripDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </div>
    </PageTransition>
  );
}

function TripCard({ trip, onClick, onDelete }: { trip: Trip; onClick: () => void; onDelete: (e: React.MouseEvent) => void }) {
  const sc = statusConfig[trip.status];
  const StatusIcon = sc.icon;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow group"
      onClick={onClick}
    >
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-mono text-muted-foreground">{trip.trip_code}</p>
            <h3 className="font-semibold text-foreground mt-1">{trip.traveler_name}</h3>
          </div>
          <Badge variant={sc.variant} className="gap-1 text-xs">
            <StatusIcon className="w-3 h-3" />
            {sc.label}
          </Badge>
        </div>

        {trip.purpose && (
          <p className="text-sm text-muted-foreground line-clamp-2">{trip.purpose}</p>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {trip.passport_country && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {trip.passport_country}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {format(new Date(trip.created_at), "MMM d, yyyy")}
          </span>
        </div>

        <div className="flex justify-end">
          {trip.status === "draft" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TripRow({ trip, onClick, onDelete }: { trip: Trip; onClick: () => void; onDelete: (e: React.MouseEvent) => void }) {
  const sc = statusConfig[trip.status];
  const StatusIcon = sc.icon;

  return (
    <div
      className="flex items-center gap-4 px-4 py-3 rounded-lg border bg-card hover:shadow-sm transition-shadow cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground">{trip.trip_code}</span>
          <span className="font-medium text-foreground truncate">{trip.traveler_name}</span>
        </div>
        {trip.purpose && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{trip.purpose}</p>
        )}
      </div>
      <span className="text-xs text-muted-foreground hidden sm:block">
        {format(new Date(trip.created_at), "MMM d, yyyy")}
      </span>
      <Badge variant={sc.variant} className="gap-1 text-xs shrink-0">
        <StatusIcon className="w-3 h-3" />
        {sc.label}
      </Badge>
      {trip.status === "draft" && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive shrink-0"
          onClick={onDelete}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}
