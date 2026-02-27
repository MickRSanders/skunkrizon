import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantContext } from "@/contexts/TenantContext";
import { toast } from "sonner";

export type RemoteWorkStatus = "draft" | "submitted" | "under_review" | "approved" | "declined" | "active" | "completed" | "cancelled";
export type RiskLevel = "pending" | "low" | "medium" | "high" | "blocker";
export type RequestType = "employee_remote" | "virtual_assignment";
export type DurationType = "short_term" | "extended" | "indefinite";

export interface RemoteWorkRequest {
  id: string;
  tenant_id: string;
  sub_tenant_id: string | null;
  created_by: string;
  employee_id: string | null;
  request_type: RequestType;
  request_code: string;
  employee_name: string;
  employee_email: string | null;
  job_title: string | null;
  department: string | null;
  home_country: string;
  home_city: string | null;
  host_country: string;
  host_city: string | null;
  start_date: string;
  end_date: string | null;
  duration_type: DurationType;
  work_pattern: string | null;
  purpose: string | null;
  business_justification: string | null;
  deliverables: string | null;
  business_sponsor: string | null;
  is_precursor_to_relocation: boolean;
  overall_risk_level: RiskLevel;
  status: RemoteWorkStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RiskAssessment {
  id: string;
  request_id: string;
  category: string;
  risk_level: string;
  summary: string | null;
  recommendations: string | null;
  rule_references: unknown[];
  assessed_by: string | null;
  assessed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Approval {
  id: string;
  request_id: string;
  step_order: number;
  approval_type: string;
  approver_id: string | null;
  approver_name: string | null;
  status: string;
  decision_reason: string | null;
  decided_at: string | null;
  created_at: string;
}

export function useRemoteWorkRequests() {
  const { user } = useAuth();
  const { activeTenant, activeSubTenant } = useTenantContext();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant_id;

  const query = useQuery({
    queryKey: ["remote_work_requests", tenantId, activeSubTenant?.id],
    queryFn: async () => {
      if (!tenantId) return [];
      let q = supabase
        .from("remote_work_requests" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (activeSubTenant?.id) {
        q = q.eq("sub_tenant_id", activeSubTenant.id);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as RemoteWorkRequest[];
    },
    enabled: !!tenantId,
  });

  const createRequest = useMutation({
    mutationFn: async (input: {
      request_type: RequestType;
      employee_name: string;
      employee_email?: string;
      employee_id?: string;
      job_title?: string;
      department?: string;
      home_country: string;
      home_city?: string;
      host_country: string;
      host_city?: string;
      start_date: string;
      end_date?: string;
      duration_type: DurationType;
      work_pattern?: string;
      purpose?: string;
      business_justification?: string;
      deliverables?: string;
      business_sponsor?: string;
      is_precursor_to_relocation?: boolean;
      notes?: string;
    }) => {
      if (!user || !tenantId) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("remote_work_requests" as any)
        .insert({
          tenant_id: tenantId,
          sub_tenant_id: activeSubTenant?.id ?? null,
          created_by: user.id,
          ...input,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as RemoteWorkRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["remote_work_requests"] });
      toast.success("Remote work request created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateRequest = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { data, error } = await supabase
        .from("remote_work_requests" as any)
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as RemoteWorkRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["remote_work_requests"] });
      toast.success("Request updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteRequest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("remote_work_requests" as any).delete().eq("id", id) as any;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["remote_work_requests"] });
      toast.success("Request deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return { ...query, createRequest, updateRequest, deleteRequest };
}

export function useRemoteWorkDetail(requestId: string | undefined) {
  const queryClient = useQueryClient();

  const riskQuery = useQuery({
    queryKey: ["rw_risk_assessments", requestId],
    queryFn: async () => {
      if (!requestId) return [];
      const { data, error } = await supabase
        .from("remote_work_risk_assessments" as any)
        .select("*")
        .eq("request_id", requestId)
        .order("category");
      if (error) throw error;
      return (data ?? []) as unknown as RiskAssessment[];
    },
    enabled: !!requestId,
  });

  const approvalsQuery = useQuery({
    queryKey: ["rw_approvals", requestId],
    queryFn: async () => {
      if (!requestId) return [];
      const { data, error } = await supabase
        .from("remote_work_approvals" as any)
        .select("*")
        .eq("request_id", requestId)
        .order("step_order");
      if (error) throw error;
      return (data ?? []) as unknown as Approval[];
    },
    enabled: !!requestId,
  });

  const upsertRisk = useMutation({
    mutationFn: async (input: { request_id: string; category: string; risk_level: string; summary?: string; recommendations?: string }) => {
      const { data, error } = await supabase
        .from("remote_work_risk_assessments" as any)
        .upsert(input as any, { onConflict: "id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rw_risk_assessments", requestId] });
    },
  });

  const updateApproval = useMutation({
    mutationFn: async ({ id, status, decision_reason, approver_id, approver_name }: { id: string; status: string; decision_reason?: string; approver_id?: string; approver_name?: string }) => {
      const { data, error } = await supabase
        .from("remote_work_approvals" as any)
        .update({ status, decision_reason: decision_reason ?? null, approver_id: approver_id ?? null, approver_name: approver_name ?? null, decided_at: new Date().toISOString() } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rw_approvals", requestId] });
      toast.success("Approval updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addApprovalStep = useMutation({
    mutationFn: async (input: { request_id: string; step_order: number; approval_type: string }) => {
      const { data, error } = await supabase
        .from("remote_work_approvals" as any)
        .insert(input as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rw_approvals", requestId] });
    },
  });

  return { risks: riskQuery, approvals: approvalsQuery, upsertRisk, updateApproval, addApprovalStep };
}
