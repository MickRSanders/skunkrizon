import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantContext } from "@/contexts/TenantContext";
import { toast } from "sonner";

export type TripStatus = "draft" | "confirmed" | "assessed" | "monitoring" | "needs_info" | "attention" | "escalate" | "closed";
export type AssessmentOutcome = "green" | "amber" | "red" | "pending";

export interface Trip {
  id: string;
  tenant_id: string;
  sub_tenant_id: string | null;
  created_by: string;
  traveler_name: string;
  traveler_email: string | null;
  employee_id: string | null;
  passport_country: string | null;
  citizenship: string | null;
  residency_country: string | null;
  trip_code: string;
  status: TripStatus;
  purpose: string | null;
  notes: string | null;
  provenance: Record<string, unknown>;
  version: number;
  is_shadow: boolean;
  created_at: string;
  updated_at: string;
}

export interface TripSegment {
  id: string;
  trip_id: string;
  segment_order: number;
  origin_country: string;
  origin_city: string | null;
  destination_country: string;
  destination_city: string | null;
  start_date: string;
  end_date: string;
  duration_days: number;
  activity_type: string;
  activity_description: string | null;
  immigration_documents: unknown[];
  provenance: string;
  created_at: string;
  updated_at: string;
}

export interface TripAssessment {
  id: string;
  trip_id: string;
  segment_id: string | null;
  module: string;
  outcome: AssessmentOutcome;
  statutory_outcome: string | null;
  reasoning: string | null;
  rule_references: unknown[];
  raw_api_response: Record<string, unknown>;
  override_outcome: AssessmentOutcome | null;
  override_reason: string | null;
  override_wording: string | null;
  next_steps: string | null;
  risk_level: string;
  risk_flags: unknown[];
  version: number;
  assessed_at: string | null;
  assessed_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useTrips() {
  const { user } = useAuth();
  const { activeTenant, activeSubTenant } = useTenantContext();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant_id;

  const tripsQuery = useQuery({
    queryKey: ["trips", tenantId, activeSubTenant?.id],
    queryFn: async () => {
      if (!tenantId) return [];
      let q = supabase
        .from("trips")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (activeSubTenant?.id) {
        q = q.eq("sub_tenant_id", activeSubTenant.id);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Trip[];
    },
    enabled: !!tenantId,
  });

  const createTrip = useMutation({
    mutationFn: async (input: {
      traveler_name: string;
      traveler_email?: string;
      employee_id?: string;
      passport_country?: string;
      citizenship?: string;
      residency_country?: string;
      purpose?: string;
      notes?: string;
      segments: {
        origin_country: string;
        origin_city?: string;
        destination_country: string;
        destination_city?: string;
        start_date: string;
        end_date: string;
        activity_type: string;
        activity_description?: string;
      }[];
    }) => {
      if (!user || !tenantId) throw new Error("Not authenticated");

      const { data: trip, error: tripError } = await supabase
        .from("trips")
        .insert({
          tenant_id: tenantId,
          sub_tenant_id: activeSubTenant?.id ?? null,
          created_by: user.id,
          traveler_name: input.traveler_name,
          traveler_email: input.traveler_email ?? null,
          employee_id: input.employee_id ?? null,
          passport_country: input.passport_country ?? null,
          citizenship: input.citizenship ?? null,
          residency_country: input.residency_country ?? null,
          purpose: input.purpose ?? null,
          notes: input.notes ?? null,
        } as any)
        .select()
        .single();

      if (tripError) throw tripError;

      if (input.segments.length > 0) {
        const { error: segError } = await supabase
          .from("trip_segments")
          .insert(
            input.segments.map((s, i) => ({
              trip_id: (trip as any).id,
              segment_order: i,
              origin_country: s.origin_country,
              origin_city: s.origin_city ?? null,
              destination_country: s.destination_country,
              destination_city: s.destination_city ?? null,
              start_date: s.start_date,
              end_date: s.end_date,
              activity_type: s.activity_type,
              activity_description: s.activity_description ?? null,
            })) as any
          );
        if (segError) throw segError;
      }

      return trip as unknown as Trip;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Trip created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateTrip = useMutation({
    mutationFn: async ({ tripId, updates }: {
      tripId: string;
      updates: Partial<Pick<Trip, "traveler_name" | "traveler_email" | "employee_id" | "passport_country" | "citizenship" | "residency_country" | "purpose" | "notes">>;
    }) => {
      const { data, error } = await supabase
        .from("trips")
        .update(updates as any)
        .eq("id", tripId)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Trip;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["trip", data.id] });
      toast.success("Traveler details updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteTrip = useMutation({
    mutationFn: async (tripId: string) => {
      const { error } = await supabase.from("trips").delete().eq("id", tripId) as any;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Trip deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return { ...tripsQuery, createTrip, updateTrip, deleteTrip };
}

export function useTripDetail(tripId: string | undefined) {
  const queryClient = useQueryClient();
  const segmentsQuery = useQuery({
    queryKey: ["trip_segments", tripId],
    queryFn: async () => {
      if (!tripId) return [];
      const { data, error } = await supabase
        .from("trip_segments")
        .select("*")
        .eq("trip_id", tripId)
        .order("segment_order") as any;
      if (error) throw error;
      return (data ?? []) as TripSegment[];
    },
    enabled: !!tripId,
  });

  const assessmentsQuery = useQuery({
    queryKey: ["trip_assessments", tripId],
    queryFn: async () => {
      if (!tripId) return [];
      const { data, error } = await supabase
        .from("trip_assessments")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at") as any;
      if (error) throw error;
      return (data ?? []) as TripAssessment[];
    },
    enabled: !!tripId,
  });

  const addSegment = useMutation({
    mutationFn: async (input: {
      origin_country: string;
      origin_city?: string;
      destination_country: string;
      destination_city?: string;
      start_date: string;
      end_date: string;
      activity_type: string;
      activity_description?: string;
    }) => {
      if (!tripId) throw new Error("No trip");
      const currentSegments = segmentsQuery.data ?? [];
      const { data, error } = await supabase
        .from("trip_segments")
        .insert({
          trip_id: tripId,
          segment_order: currentSegments.length,
          origin_country: input.origin_country,
          origin_city: input.origin_city ?? null,
          destination_country: input.destination_country,
          destination_city: input.destination_city ?? null,
          start_date: input.start_date,
          end_date: input.end_date,
          activity_type: input.activity_type,
          activity_description: input.activity_description ?? null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as TripSegment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip_segments", tripId] });
      toast.success("Segment added");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateSegment = useMutation({
    mutationFn: async ({ segmentId, updates }: {
      segmentId: string;
      updates: Partial<Pick<TripSegment, "origin_country" | "origin_city" | "destination_country" | "destination_city" | "start_date" | "end_date" | "activity_type" | "activity_description">>;
    }) => {
      const { data, error } = await supabase
        .from("trip_segments")
        .update(updates as any)
        .eq("id", segmentId)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as TripSegment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip_segments", tripId] });
      toast.success("Segment updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteSegment = useMutation({
    mutationFn: async (segmentId: string) => {
      const { error } = await supabase.from("trip_segments").delete().eq("id", segmentId) as any;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip_segments", tripId] });
      toast.success("Segment deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reorderSegments = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      // Update each segment's segment_order in parallel
      const updates = orderedIds.map((id, index) =>
        supabase.from("trip_segments").update({ segment_order: index } as any).eq("id", id)
      );
      const results = await Promise.all(updates);
      const firstError = results.find((r) => r.error);
      if (firstError?.error) throw firstError.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip_segments", tripId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return { segments: segmentsQuery, assessments: assessmentsQuery, addSegment, updateSegment, deleteSegment, reorderSegments };
}
