import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTripDetail, Trip, TripSegment, TripAssessment, AssessmentOutcome } from "@/hooks/useTrips";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";

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

  const { segments, assessments } = useTripDetail(id);
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
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Traveler Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <InfoField label="Email" value={trip.traveler_email} />
                  <InfoField label="Employee ID" value={trip.employee_id} />
                  <InfoField label="Passport Country" value={trip.passport_country} />
                  <InfoField label="Citizenship" value={trip.citizenship} />
                  <InfoField label="Residency" value={trip.residency_country} />
                  <InfoField label="Version" value={`v${trip.version}`} />
                </div>
              </CardContent>
            </Card>

            {/* Segments */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Trip Segments ({(segments.data ?? []).length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(segments.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No segments defined.</p>
                ) : (
                  (segments.data ?? []).map((seg, i) => (
                    <SegmentCard key={seg.id} segment={seg} index={i} />
                  ))
                )}
              </CardContent>
            </Card>
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

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm text-foreground font-medium">{value || "—"}</p>
    </div>
  );
}

function SegmentCard({ segment, index }: { segment: TripSegment; index: number }) {
  return (
    <div className="border rounded-lg p-4 bg-muted/20">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted-foreground">Segment {index + 1}</span>
        <Badge variant="outline" className="text-xs capitalize">
          {segment.activity_type.replace(/_/g, " ")}
        </Badge>
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
        <span className="text-muted-foreground">({segment.duration_days} days)</span>
      </div>
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
