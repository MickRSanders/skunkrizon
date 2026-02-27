import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRemoteWorkRequests, type RequestType, type DurationType } from "@/hooks/useRemoteWork";
import { Switch } from "@/components/ui/switch";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateRemoteWorkDialog({ open, onOpenChange }: Props) {
  const { createRequest } = useRemoteWorkRequests();
  const [requestType, setRequestType] = useState<RequestType>("employee_remote");
  const [employeeName, setEmployeeName] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [homeCountry, setHomeCountry] = useState("");
  const [homeCity, setHomeCity] = useState("");
  const [hostCountry, setHostCountry] = useState("");
  const [hostCity, setHostCity] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [durationType, setDurationType] = useState<DurationType>("short_term");
  const [workPattern, setWorkPattern] = useState("");
  const [purpose, setPurpose] = useState("");
  const [businessJustification, setBusinessJustification] = useState("");
  const [businessSponsor, setBusinessSponsor] = useState("");
  const [isPrecursor, setIsPrecursor] = useState(false);
  const [notes, setNotes] = useState("");

  const reset = () => {
    setRequestType("employee_remote");
    setEmployeeName("");
    setEmployeeEmail("");
    setJobTitle("");
    setDepartment("");
    setHomeCountry("");
    setHomeCity("");
    setHostCountry("");
    setHostCity("");
    setStartDate("");
    setEndDate("");
    setDurationType("short_term");
    setWorkPattern("");
    setPurpose("");
    setBusinessJustification("");
    setBusinessSponsor("");
    setIsPrecursor(false);
    setNotes("");
  };

  const handleSubmit = () => {
    if (!employeeName.trim() || !homeCountry.trim() || !hostCountry.trim() || !startDate) return;
    createRequest.mutate(
      {
        request_type: requestType,
        employee_name: employeeName.trim(),
        employee_email: employeeEmail || undefined,
        job_title: jobTitle || undefined,
        department: department || undefined,
        home_country: homeCountry.trim(),
        home_city: homeCity || undefined,
        host_country: hostCountry.trim(),
        host_city: hostCity || undefined,
        start_date: startDate,
        end_date: endDate || undefined,
        duration_type: durationType,
        work_pattern: workPattern || undefined,
        purpose: purpose || undefined,
        business_justification: businessJustification || undefined,
        business_sponsor: businessSponsor || undefined,
        is_precursor_to_relocation: isPrecursor,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Remote Work Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Request Type */}
          <div className="space-y-1.5">
            <Label>Request Type</Label>
            <Select value={requestType} onValueChange={(v) => setRequestType(v as RequestType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="employee_remote">Employee Remote Working</SelectItem>
                <SelectItem value="virtual_assignment">Virtual Assignment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Employee Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Employee Name *</Label>
              <Input value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={employeeEmail} onChange={(e) => setEmployeeEmail(e.target.value)} placeholder="Email" type="email" />
            </div>
            <div className="space-y-1.5">
              <Label>Job Title</Label>
              <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Input value={department} onChange={(e) => setDepartment(e.target.value)} />
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Home Country *</Label>
              <Input value={homeCountry} onChange={(e) => setHomeCountry(e.target.value)} placeholder="e.g. United States" />
            </div>
            <div className="space-y-1.5">
              <Label>Home City</Label>
              <Input value={homeCity} onChange={(e) => setHomeCity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Host Country *</Label>
              <Input value={hostCountry} onChange={(e) => setHostCountry(e.target.value)} placeholder="e.g. Germany" />
            </div>
            <div className="space-y-1.5">
              <Label>Host City</Label>
              <Input value={hostCity} onChange={(e) => setHostCity(e.target.value)} />
            </div>
          </div>

          {/* Dates & Duration */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Start Date *</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Duration Type</Label>
              <Select value={durationType} onValueChange={(v) => setDurationType(v as DurationType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="short_term">Short-term</SelectItem>
                  <SelectItem value="extended">Extended</SelectItem>
                  <SelectItem value="indefinite">Indefinite</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Work Pattern */}
          <div className="space-y-1.5">
            <Label>Work Pattern</Label>
            <Select value={workPattern} onValueChange={setWorkPattern}>
              <SelectTrigger><SelectValue placeholder="Select pattern" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full_time_remote">Full-time Remote</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
                <SelectItem value="periodic">Periodic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Purpose */}
          <div className="space-y-1.5">
            <Label>Purpose</Label>
            <Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Reason for the request..." rows={2} />
          </div>

          {/* Virtual assignment extras */}
          {requestType === "virtual_assignment" && (
            <div className="space-y-4 border-t pt-4">
              <h4 className="text-sm font-semibold text-foreground">Virtual Assignment Details</h4>
              <div className="space-y-1.5">
                <Label>Business Justification</Label>
                <Textarea value={businessJustification} onChange={(e) => setBusinessJustification(e.target.value)} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label>Business Sponsor</Label>
                <Input value={businessSponsor} onChange={(e) => setBusinessSponsor(e.target.value)} />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={isPrecursor} onCheckedChange={setIsPrecursor} />
                <Label className="cursor-pointer">Precursor to physical relocation</Label>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createRequest.isPending || !employeeName.trim() || !homeCountry.trim() || !hostCountry.trim() || !startDate}>
              {createRequest.isPending ? "Creating..." : "Create Request"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
