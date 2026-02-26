import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTripDetail, useTrips, Trip, TripSegment, TripAssessment, AssessmentOutcome } from "@/hooks/useTrips";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Plane,
  MapPin,
  Calendar,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  FileText,
  History,
  Settings2,
  Pencil,
  X,
  Save,
  Loader2,
  Plus,
  Trash2,
  GripVertical,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const outcomeColors: Record<AssessmentOutcome, string> = {
  green: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  amber: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  red: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
  pending: "bg-muted text-muted-foreground border-border",
};

const outcomeIcons: Record<AssessmentOutcome, React.ElementType> = {
  green: CheckCircle2,
  amber: AlertTriangle,
  red: XCircle,
  pending: Clock,
};

const MODULE_LABELS: Record<string, string> = {
  immigration: "Immigration",
  schengen: "Schengen (90/180)",
  pwd: "Posted Workers Directive",
  social_security: "Social Security",
  withholding: "Tax Withholding",
  pe: "Permanent Establishment",
};

export default function PreTravelDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const tripQuery = useQuery({
    queryKey: ["trip", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("trips").select("*").eq("id", id!).single() as any;
      if (error) throw error;
      return data as Trip;
    },
    enabled: !!id,
  });

  const { segments, assessments, addSegment, updateSegment, deleteSegment, reorderSegments } = useTripDetail(id);
  const trip = tripQuery.data;

  const runAssessment = useMutation({
    mutationFn: async () => {
      const res = await supabase.functions.invoke("run-assessment", {
        body: { trip_id: id },
      });
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip_assessments", id] });
      queryClient.invalidateQueries({ queryKey: ["trip", id] });
      toast.success("Assessment completed");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (tripQuery.isLoading) {
    return <div className="p-6 text-muted-foreground">Loading trip...</div>;
  }
  if (!trip) {
    return <div className="p-6 text-muted-foreground">Trip not found</div>;
  }

  const overallOutcome = getOverallOutcome(assessments.data ?? []);

  return (
    <PageTransition>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/pre-travel")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-muted-foreground">{trip.trip_code}</span>
              <Badge variant="secondary" className="text-xs capitalize">{trip.status.replace("_", " ")}</Badge>
            </div>
            <h1 className="text-2xl font-bold text-foreground mt-1">{trip.traveler_name}</h1>
            {trip.purpose && <p className="text-sm text-muted-foreground mt-1">{trip.purpose}</p>}
          </div>

          <div className="flex items-center gap-2">
            {overallOutcome !== "pending" && (
              <OutcomeBadge outcome={overallOutcome} size="lg" />
            )}
            <Button
              onClick={() => runAssessment.mutate()}
              disabled={runAssessment.isPending || (segments.data ?? []).length === 0}
              className="gap-2"
            >
              <Play className="w-4 h-4" />
              {runAssessment.isPending ? "Assessing..." : "Run Assessment"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="trip-dna" className="space-y-4">
          <TabsList>
            <TabsTrigger value="trip-dna" className="gap-1.5">
              <Plane className="w-3.5 h-3.5" /> Trip DNA
            </TabsTrigger>
            <TabsTrigger value="results" className="gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Results
            </TabsTrigger>
            <TabsTrigger value="diagnostics" className="gap-1.5">
              <Settings2 className="w-3.5 h-3.5" /> Diagnostics
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <History className="w-3.5 h-3.5" /> History
            </TabsTrigger>
          </TabsList>

          {/* Trip DNA Tab */}
          <TabsContent value="trip-dna" className="space-y-4">
            {/* Traveler Info Card */}
            <TravelerDetailsCard trip={trip} />

            <SegmentsSection
              segments={segments.data ?? []}
              tripId={id!}
              addSegment={addSegment}
              updateSegment={updateSegment}
              deleteSegment={deleteSegment}
              reorderSegments={reorderSegments}
            />
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-4">
            {(assessments.data ?? []).length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center py-12 text-center">
                  <Shield className="w-10 h-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No assessments yet. Click "Run Assessment" to evaluate compliance.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(assessments.data ?? []).map((a) => (
                  <AssessmentCard key={a.id} assessment={a} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Diagnostics Tab */}
          <TabsContent value="diagnostics" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Diagnostic View
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2">INPUT PROVENANCE</h4>
                    <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                      {JSON.stringify(trip.provenance, null, 2)}
                    </pre>
                  </div>
                  {(assessments.data ?? []).map((a) => (
                    <div key={a.id}>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                        {MODULE_LABELS[a.module] ?? a.module} — Rule Trace
                      </h4>
                      <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                        {JSON.stringify({ rule_references: a.rule_references, raw_api_response: a.raw_api_response, override: a.override_outcome ? { outcome: a.override_outcome, reason: a.override_reason } : null }, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardContent className="flex flex-col items-center py-12 text-center">
                <History className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Version history will be recorded when Trip DNA changes.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Current version: v{trip.version}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
}

function TravelerDetailsCard({ trip }: { trip: Trip }) {
  const [editing, setEditing] = useState(false);
  const { updateTrip } = useTrips();

  const [form, setForm] = useState({
    traveler_name: trip.traveler_name,
    traveler_email: trip.traveler_email ?? "",
    employee_id: trip.employee_id ?? "",
    passport_country: trip.passport_country ?? "",
    citizenship: trip.citizenship ?? "",
    residency_country: trip.residency_country ?? "",
  });

  const handleEdit = () => {
    setForm({
      traveler_name: trip.traveler_name,
      traveler_email: trip.traveler_email ?? "",
      employee_id: trip.employee_id ?? "",
      passport_country: trip.passport_country ?? "",
      citizenship: trip.citizenship ?? "",
      residency_country: trip.residency_country ?? "",
    });
    setEditing(true);
  };

  const handleSave = () => {
    if (!form.traveler_name.trim()) {
      toast.error("Traveler name is required");
      return;
    }
    updateTrip.mutate(
      {
        tripId: trip.id,
        updates: {
          traveler_name: form.traveler_name.trim(),
          traveler_email: form.traveler_email.trim() || null,
          employee_id: form.employee_id.trim() || null,
          passport_country: form.passport_country.trim() || null,
          citizenship: form.citizenship.trim() || null,
          residency_country: form.residency_country.trim() || null,
        },
      },
      { onSuccess: () => setEditing(false) }
    );
  };

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const fields = [
    { key: "traveler_name", label: "Full Name", required: true },
    { key: "traveler_email", label: "Email" },
    { key: "employee_id", label: "Employee ID" },
    { key: "passport_country", label: "Passport Country" },
    { key: "citizenship", label: "Citizenship" },
    { key: "residency_country", label: "Residency" },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Traveler Details</CardTitle>
          {!editing ? (
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-7" onClick={handleEdit}>
              <Pencil className="h-3 w-3" /> Edit
            </Button>
          ) : (
            <div className="flex gap-1.5">
              <Button variant="ghost" size="sm" className="gap-1 text-xs h-7" onClick={() => setEditing(false)} disabled={updateTrip.isPending}>
                <X className="h-3 w-3" /> Cancel
              </Button>
              <Button size="sm" className="gap-1 text-xs h-7" onClick={handleSave} disabled={updateTrip.isPending}>
                {updateTrip.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                Save
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {fields.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {f.label} {f.required && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  value={(form as any)[f.key]}
                  onChange={(e) => update(f.key, e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <InfoField label="Full Name" value={trip.traveler_name} />
            <InfoField label="Email" value={trip.traveler_email} />
            <InfoField label="Employee ID" value={trip.employee_id} />
            <InfoField label="Passport Country" value={trip.passport_country} />
            <InfoField label="Citizenship" value={trip.citizenship} />
            <InfoField label="Residency" value={trip.residency_country} />
            <InfoField label="Version" value={`v${trip.version}`} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm text-foreground font-medium">{value || "—"}</p>
    </div>
  );
}

const ACTIVITY_TYPES = [
  "business_meeting",
  "client_visit",
  "conference",
  "training",
  "project_work",
  "relocation",
  "other",
];

const emptySegmentForm = {
  origin_country: "",
  origin_city: "",
  destination_country: "",
  destination_city: "",
  start_date: "",
  end_date: "",
  activity_type: "business_meeting",
  activity_description: "",
};

function SegmentsSection({
  segments,
  tripId,
  addSegment,
  updateSegment,
  deleteSegment,
  reorderSegments,
}: {
  segments: TripSegment[];
  tripId: string;
  addSegment: any;
  updateSegment: any;
  deleteSegment: any;
  reorderSegments: any;
}) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ ...emptySegmentForm });
  const [orderedSegments, setOrderedSegments] = useState<TripSegment[]>(segments);

  // Keep local state in sync with server data
  useState(() => { setOrderedSegments(segments); });
  if (segments !== orderedSegments && !reorderSegments.isPending) {
    // Only sync when segments ref changes (new data from server)
    if (JSON.stringify(segments.map(s => s.id)) !== JSON.stringify(orderedSegments.map(s => s.id)) || segments.length !== orderedSegments.length) {
      setOrderedSegments(segments);
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedSegments.findIndex((s) => s.id === active.id);
    const newIndex = orderedSegments.findIndex((s) => s.id === over.id);
    const newOrder = arrayMove(orderedSegments, oldIndex, newIndex);
    setOrderedSegments(newOrder);
    reorderSegments.mutate(newOrder.map((s) => s.id));
  };

  const handleAdd = () => {
    if (!form.origin_country.trim() || !form.destination_country.trim() || !form.start_date || !form.end_date) {
      toast.error("Origin, destination, and dates are required");
      return;
    }
    addSegment.mutate(
      {
        origin_country: form.origin_country.trim(),
        origin_city: form.origin_city.trim() || undefined,
        destination_country: form.destination_country.trim(),
        destination_city: form.destination_city.trim() || undefined,
        start_date: form.start_date,
        end_date: form.end_date,
        activity_type: form.activity_type,
        activity_description: form.activity_description.trim() || undefined,
      },
      {
        onSuccess: () => {
          setForm({ ...emptySegmentForm });
          setAdding(false);
        },
      }
    );
  };

  // Use orderedSegments for display
  const displaySegments = orderedSegments.length === segments.length ? orderedSegments : segments;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Trip Segments ({segments.length})</CardTitle>
          {!adding && (
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-7" onClick={() => setAdding(true)}>
              <Plus className="h-3 w-3" /> Add Segment
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {segments.length === 0 && !adding && (
          <p className="text-sm text-muted-foreground">No segments defined.</p>
        )}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={displaySegments.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {displaySegments.map((seg, i) => (
              <SortableSegmentCard
                key={seg.id}
                segment={seg}
                index={i}
                updateSegment={updateSegment}
                deleteSegment={deleteSegment}
              />
            ))}
          </SortableContext>
        </DndContext>
        {adding && (
          <div className="border rounded-lg p-4 bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">New Segment</span>
              <div className="flex gap-1.5">
                <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => setAdding(false)} disabled={addSegment.isPending}>
                  <X className="h-3 w-3" /> Cancel
                </Button>
                <Button size="sm" className="text-xs h-7 gap-1" onClick={handleAdd} disabled={addSegment.isPending}>
                  {addSegment.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Save
                </Button>
              </div>
            </div>
            <SegmentFormFields form={form} setForm={setForm} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SegmentFormFields({
  form,
  setForm,
}: {
  form: typeof emptySegmentForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptySegmentForm>>;
}) {
  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Origin Country <span className="text-destructive">*</span></Label>
        <Input value={form.origin_country} onChange={(e) => update("origin_country", e.target.value)} className="h-8 text-sm" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Origin City</Label>
        <Input value={form.origin_city} onChange={(e) => update("origin_city", e.target.value)} className="h-8 text-sm" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Destination Country <span className="text-destructive">*</span></Label>
        <Input value={form.destination_country} onChange={(e) => update("destination_country", e.target.value)} className="h-8 text-sm" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Destination City</Label>
        <Input value={form.destination_city} onChange={(e) => update("destination_city", e.target.value)} className="h-8 text-sm" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Start Date <span className="text-destructive">*</span></Label>
        <Input type="date" value={form.start_date} onChange={(e) => update("start_date", e.target.value)} className="h-8 text-sm" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">End Date <span className="text-destructive">*</span></Label>
        <Input type="date" value={form.end_date} onChange={(e) => update("end_date", e.target.value)} className="h-8 text-sm" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Activity Type</Label>
        <select
          value={form.activity_type}
          onChange={(e) => update("activity_type", e.target.value)}
          className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {ACTIVITY_TYPES.map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Description</Label>
        <Input value={form.activity_description} onChange={(e) => update("activity_description", e.target.value)} className="h-8 text-sm" />
      </div>
    </div>
  );
}

function SortableSegmentCard({
  segment,
  index,
  updateSegment,
  deleteSegment,
}: {
  segment: TripSegment;
  index: number;
  updateSegment: any;
  deleteSegment: any;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: segment.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...emptySegmentForm });

  const handleEdit = () => {
    setForm({
      origin_country: segment.origin_country,
      origin_city: segment.origin_city ?? "",
      destination_country: segment.destination_country,
      destination_city: segment.destination_city ?? "",
      start_date: segment.start_date,
      end_date: segment.end_date,
      activity_type: segment.activity_type,
      activity_description: segment.activity_description ?? "",
    });
    setEditing(true);
  };

  const handleSave = () => {
    if (!form.origin_country.trim() || !form.destination_country.trim() || !form.start_date || !form.end_date) {
      toast.error("Origin, destination, and dates are required");
      return;
    }
    updateSegment.mutate(
      {
        segmentId: segment.id,
        updates: {
          origin_country: form.origin_country.trim(),
          origin_city: form.origin_city.trim() || null,
          destination_country: form.destination_country.trim(),
          destination_city: form.destination_city.trim() || null,
          start_date: form.start_date,
          end_date: form.end_date,
          activity_type: form.activity_type,
          activity_description: form.activity_description.trim() || null,
        },
      },
      { onSuccess: () => setEditing(false) }
    );
  };

  if (editing) {
    return (
      <div ref={setNodeRef} style={style} className="border rounded-lg p-4 bg-muted/20 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">Editing Segment {index + 1}</span>
          <div className="flex gap-1.5">
            <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => setEditing(false)} disabled={updateSegment.isPending}>
              <X className="h-3 w-3" /> Cancel
            </Button>
            <Button size="sm" className="text-xs h-7 gap-1" onClick={handleSave} disabled={updateSegment.isPending}>
              {updateSegment.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Save
            </Button>
          </div>
        </div>
        <SegmentFormFields form={form} setForm={setForm} />
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="border rounded-lg p-4 bg-muted/20">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="text-xs font-semibold text-muted-foreground">Segment {index + 1}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-xs capitalize">
            {segment.activity_type.replace(/_/g, " ")}
          </Badge>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleEdit}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={() => deleteSegment.mutate(segment.id)}
            disabled={deleteSegment.isPending}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
        <span>{segment.origin_city || segment.origin_country}</span>
        <span className="text-muted-foreground">→</span>
        <span className="font-medium">{segment.destination_city || segment.destination_country}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
        <Calendar className="w-3 h-3" />
        <span>
          {format(new Date(segment.start_date), "MMM d")} — {format(new Date(segment.end_date), "MMM d, yyyy")}
        </span>
        {segment.duration_days && <span className="text-muted-foreground">({segment.duration_days} days)</span>}
      </div>
      {segment.activity_description && (
        <p className="text-xs text-muted-foreground mt-1">{segment.activity_description}</p>
      )}
      <Badge variant="secondary" className="mt-2 text-[10px]">
        {segment.provenance.replace(/_/g, " ")}
      </Badge>
    </div>
  );
}

function AssessmentCard({ assessment }: { assessment: TripAssessment }) {
  const effectiveOutcome = assessment.override_outcome ?? assessment.outcome;
  const Icon = outcomeIcons[effectiveOutcome];

  return (
    <Card className={`border ${outcomeColors[effectiveOutcome]}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm">
            {MODULE_LABELS[assessment.module] ?? assessment.module}
          </h4>
          <div className="flex items-center gap-1.5">
            <Icon className="w-4 h-4" />
            <span className="text-sm font-medium capitalize">{effectiveOutcome}</span>
          </div>
        </div>

        {assessment.statutory_outcome && (
          <div>
            <span className="text-xs text-muted-foreground">Statutory Outcome</span>
            <p className="text-sm font-medium capitalize">
              {assessment.statutory_outcome.replace(/_/g, " ")}
            </p>
          </div>
        )}

        {assessment.reasoning && (
          <p className="text-xs text-muted-foreground">{assessment.reasoning}</p>
        )}

        {assessment.next_steps && (
          <div className="border-t pt-2 mt-2">
            <span className="text-xs font-semibold">Next Steps</span>
            <p className="text-xs text-muted-foreground mt-0.5">{assessment.next_steps}</p>
          </div>
        )}

        {assessment.override_outcome && (
          <Badge variant="outline" className="text-[10px]">
            Override: {assessment.override_reason}
          </Badge>
        )}

        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span>v{assessment.version}</span>
          {assessment.assessed_at && (
            <span>Assessed {format(new Date(assessment.assessed_at), "MMM d, HH:mm")}</span>
          )}
          {assessment.assessed_by && <span>by {assessment.assessed_by}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function OutcomeBadge({ outcome, size = "sm" }: { outcome: AssessmentOutcome; size?: "sm" | "lg" }) {
  const Icon = outcomeIcons[outcome];
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${outcomeColors[outcome]} ${size === "lg" ? "text-sm font-semibold" : "text-xs"}`}>
      <Icon className={size === "lg" ? "w-4 h-4" : "w-3 h-3"} />
      <span className="capitalize">{outcome}</span>
    </div>
  );
}

function getOverallOutcome(assessments: TripAssessment[]): AssessmentOutcome {
  if (assessments.length === 0) return "pending";
  const outcomes = assessments.map((a) => a.override_outcome ?? a.outcome);
  if (outcomes.includes("red")) return "red";
  if (outcomes.includes("amber")) return "amber";
  if (outcomes.includes("pending")) return "pending";
  return "green";
}
