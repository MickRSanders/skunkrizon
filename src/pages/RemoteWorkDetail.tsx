import { useParams, useNavigate } from "react-router-dom";
import { useRemoteWorkRequests, useRemoteWorkDetail, type RemoteWorkRequest } from "@/hooks/useRemoteWork";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  User,
  Briefcase,
  Globe,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Laptop,
} from "lucide-react";
import { format } from "date-fns";
import PageTransition from "@/components/PageTransition";

const riskColors: Record<string, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  blocker: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  pending: "bg-muted text-muted-foreground",
};

const riskIcons: Record<string, React.ElementType> = {
  low: CheckCircle2,
  medium: AlertTriangle,
  high: AlertTriangle,
  blocker: XCircle,
  pending: Clock,
};

const categoryLabels: Record<string, string> = {
  immigration: "Immigration",
  tax: "Tax",
  social_security: "Social Security",
  employer_obligations: "Employer Obligations",
  health_safety: "Health & Safety",
  cultural: "Cultural",
};

const approvalTypeLabels: Record<string, string> = {
  manager: "Manager",
  hr: "HR",
  legal: "Legal",
  tax: "Tax",
  mobility: "Mobility",
};

export default function RemoteWorkDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: requests } = useRemoteWorkRequests();
  const { risks, approvals } = useRemoteWorkDetail(id);

  const request = requests?.find((r) => r.id === id);

  if (!request) {
    return (
      <PageTransition>
        <div className="p-6">
          <Button variant="ghost" onClick={() => navigate("/remote-work")} className="gap-2 mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Remote Work
          </Button>
          <div className="text-center py-12 text-muted-foreground">Request not found or loading...</div>
        </div>
      </PageTransition>
    );
  }

  const riskData = risks.data ?? [];
  const approvalData = approvals.data ?? [];

  return (
    <PageTransition>
      <div className="p-6 space-y-6 max-w-5xl">
        {/* Header */}
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/remote-work")} className="gap-2 mb-3 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back to Remote Work
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-sm font-mono text-muted-foreground">{request.request_code}</span>
                <Badge variant="outline" className="text-xs">
                  {request.request_type === "employee_remote" ? "Employee Remote" : "Virtual Assignment"}
                </Badge>
                <StatusBadge status={request.status} />
              </div>
              <h1 className="text-2xl font-bold text-foreground">{request.employee_name}</h1>
              {request.job_title && <p className="text-sm text-muted-foreground">{request.job_title}{request.department ? ` · ${request.department}` : ""}</p>}
            </div>
            <div className="flex items-center gap-2">
              <RiskBadge level={request.overall_risk_level} large />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Request Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <DetailRow icon={MapPin} label="Home" value={`${request.home_city ? request.home_city + ", " : ""}${request.home_country}`} />
                  <DetailRow icon={Globe} label="Host" value={`${request.host_city ? request.host_city + ", " : ""}${request.host_country}`} />
                  <DetailRow icon={Calendar} label="Start Date" value={format(new Date(request.start_date), "MMM d, yyyy")} />
                  <DetailRow icon={Calendar} label="End Date" value={request.end_date ? format(new Date(request.end_date), "MMM d, yyyy") : "Open-ended"} />
                  <DetailRow icon={Clock} label="Duration" value={request.duration_type === "short_term" ? "Short-term" : request.duration_type === "extended" ? "Extended" : "Indefinite"} />
                  <DetailRow icon={Laptop} label="Work Pattern" value={request.work_pattern?.replace(/_/g, " ") ?? "Not specified"} />
                </div>
                {request.purpose && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Purpose</p>
                      <p className="text-sm text-foreground">{request.purpose}</p>
                    </div>
                  </>
                )}
                {request.request_type === "virtual_assignment" && request.business_justification && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Business Justification</p>
                    <p className="text-sm text-foreground">{request.business_justification}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Risk Assessment */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                {riskData.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    No risk assessment completed yet. Submit the request to trigger assessment.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {riskData.map((risk) => {
                      const RiskIcon = riskIcons[risk.risk_level] ?? Clock;
                      return (
                        <div key={risk.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                          <div className={`p-1.5 rounded-md ${riskColors[risk.risk_level]}`}>
                            <RiskIcon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium text-foreground">
                                {categoryLabels[risk.category] ?? risk.category}
                              </h4>
                              <Badge variant="outline" className={`text-xs ${riskColors[risk.risk_level]}`}>
                                {risk.risk_level.charAt(0).toUpperCase() + risk.risk_level.slice(1)}
                              </Badge>
                            </div>
                            {risk.summary && <p className="text-xs text-muted-foreground mt-1">{risk.summary}</p>}
                            {risk.recommendations && (
                              <p className="text-xs text-foreground mt-1 font-medium">→ {risk.recommendations}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Approval Workflow */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Approval Workflow</CardTitle>
              </CardHeader>
              <CardContent>
                {approvalData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No approval steps configured yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {approvalData.map((step, i) => {
                      const isLast = i === approvalData.length - 1;
                      return (
                        <div key={step.id} className="relative">
                          {!isLast && (
                            <div className="absolute left-[11px] top-8 bottom-0 w-px bg-border" />
                          )}
                          <div className="flex items-start gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                              step.status === "approved" ? "bg-green-100 dark:bg-green-900/30" :
                              step.status === "declined" ? "bg-red-100 dark:bg-red-900/30" :
                              "bg-muted"
                            }`}>
                              {step.status === "approved" ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                              ) : step.status === "declined" ? (
                                <XCircle className="w-3.5 h-3.5 text-destructive" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 pb-4">
                              <p className="text-sm font-medium text-foreground">
                                {approvalTypeLabels[step.approval_type] ?? step.approval_type}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {step.status === "pending" ? "Awaiting decision" : 
                                 step.approver_name ? `${step.approver_name} — ${step.status}` : step.status}
                              </p>
                              {step.decided_at && (
                                <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                                  {format(new Date(step.decided_at), "MMM d, yyyy h:mm a")}
                                </p>
                              )}
                              {step.decision_reason && (
                                <p className="text-xs text-muted-foreground mt-1 italic">"{step.decision_reason}"</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Location Map Placeholder */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
                  <div className="text-center">
                    <Globe className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">
                      {request.home_country} → {request.host_country}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {request.notes && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{request.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground capitalize">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    draft: { label: "Draft", variant: "secondary" },
    submitted: { label: "Submitted", variant: "default" },
    under_review: { label: "Under Review", variant: "outline" },
    approved: { label: "Approved", variant: "default" },
    declined: { label: "Declined", variant: "destructive" },
    active: { label: "Active", variant: "default" },
    completed: { label: "Completed", variant: "outline" },
    cancelled: { label: "Cancelled", variant: "secondary" },
  };
  const c = config[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

function RiskBadge({ level, large }: { level: string; large?: boolean }) {
  const Icon = riskIcons[level] ?? Clock;
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${riskColors[level]} ${large ? "text-sm px-3 py-1.5" : ""}`}>
      <Icon className={large ? "w-4 h-4" : "w-3 h-3"} />
      {level === "pending" ? "Pending" : level.charAt(0).toUpperCase() + level.slice(1)} Risk
    </div>
  );
}
