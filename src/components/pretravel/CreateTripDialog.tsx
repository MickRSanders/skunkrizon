import { useState } from "react";
import { useTrips } from "@/hooks/useTrips";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

const ACTIVITY_TYPES = [
  { value: "business_meeting", label: "Business Meeting" },
  { value: "client_visit", label: "Client Visit" },
  { value: "conference", label: "Conference / Event" },
  { value: "training", label: "Training" },
  { value: "project_work", label: "Project Work" },
  { value: "management", label: "Management Activity" },
  { value: "sales", label: "Sales / BD" },
  { value: "installation", label: "Installation / Commissioning" },
  { value: "other", label: "Other" },
];

interface SegmentInput {
  origin_country: string;
  origin_city: string;
  destination_country: string;
  destination_city: string;
  start_date: string;
  end_date: string;
  activity_type: string;
}

export default function CreateTripDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { createTrip } = useTrips();
  const navigate = useNavigate();

  const [travelerName, setTravelerName] = useState("");
  const [travelerEmail, setTravelerEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [passportCountry, setPassportCountry] = useState("");
  const [citizenship, setCitizenship] = useState("");
  const [residencyCountry, setResidencyCountry] = useState("");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [segments, setSegments] = useState<SegmentInput[]>([
    {
      origin_country: "",
      origin_city: "",
      destination_country: "",
      destination_city: "",
      start_date: "",
      end_date: "",
      activity_type: "business_meeting",
    },
  ]);

  const addSegment = () =>
    setSegments([
      ...segments,
      {
        origin_country: "",
        origin_city: "",
        destination_country: "",
        destination_city: "",
        start_date: "",
        end_date: "",
        activity_type: "business_meeting",
      },
    ]);

  const removeSegment = (i: number) =>
    setSegments(segments.filter((_, idx) => idx !== i));

  const updateSegment = (i: number, field: keyof SegmentInput, value: string) => {
    const updated = [...segments];
    updated[i] = { ...updated[i], [field]: value };
    setSegments(updated);
  };

  const handleSubmit = async () => {
    if (!travelerName.trim() || segments.some((s) => !s.destination_country || !s.start_date || !s.end_date)) return;

    const result = await createTrip.mutateAsync({
      traveler_name: travelerName,
      traveler_email: travelerEmail || undefined,
      employee_id: employeeId || undefined,
      passport_country: passportCountry || undefined,
      citizenship: citizenship || undefined,
      residency_country: residencyCountry || undefined,
      purpose: purpose || undefined,
      notes: notes || undefined,
      segments: segments.filter((s) => s.destination_country && s.start_date && s.end_date).map((s) => ({
        origin_country: s.origin_country || "Unknown",
        origin_city: s.origin_city || undefined,
        destination_country: s.destination_country,
        destination_city: s.destination_city || undefined,
        start_date: s.start_date,
        end_date: s.end_date,
        activity_type: s.activity_type,
      })),
    });

    onOpenChange(false);
    navigate(`/pre-travel/${result.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Pre-Travel Assessment</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Traveler Info */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Traveler Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Traveler Name *</Label>
                <Input value={travelerName} onChange={(e) => setTravelerName(e.target.value)} placeholder="Full name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input value={travelerEmail} onChange={(e) => setTravelerEmail(e.target.value)} placeholder="email@company.com" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Employee ID</Label>
                <Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="EMP-001" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Passport Country</Label>
                <Input value={passportCountry} onChange={(e) => setPassportCountry(e.target.value)} placeholder="e.g. United Kingdom" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Citizenship</Label>
                <Input value={citizenship} onChange={(e) => setCitizenship(e.target.value)} placeholder="e.g. British" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Residency Country</Label>
                <Input value={residencyCountry} onChange={(e) => setResidencyCountry(e.target.value)} placeholder="e.g. United Kingdom" />
              </div>
            </div>
          </div>

          {/* Purpose */}
          <div className="space-y-1.5">
            <Label className="text-xs">Trip Purpose</Label>
            <Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Brief description of the trip purpose" rows={2} />
          </div>

          {/* Segments */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Trip Segments</h3>
              <Button variant="outline" size="sm" onClick={addSegment} className="gap-1 text-xs">
                <Plus className="w-3 h-3" /> Add Segment
              </Button>
            </div>

            <div className="space-y-4">
              {segments.map((seg, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Segment {i + 1}</span>
                    {segments.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeSegment(i)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Origin Country</Label>
                      <Input value={seg.origin_country} onChange={(e) => updateSegment(i, "origin_country", e.target.value)} placeholder="e.g. United Kingdom" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Origin City</Label>
                      <Input value={seg.origin_city} onChange={(e) => updateSegment(i, "origin_city", e.target.value)} placeholder="e.g. London" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Destination Country *</Label>
                      <Input value={seg.destination_country} onChange={(e) => updateSegment(i, "destination_country", e.target.value)} placeholder="e.g. Germany" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Destination City</Label>
                      <Input value={seg.destination_city} onChange={(e) => updateSegment(i, "destination_city", e.target.value)} placeholder="e.g. Munich" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Start Date *</Label>
                      <Input type="date" value={seg.start_date} onChange={(e) => updateSegment(i, "start_date", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">End Date *</Label>
                      <Input type="date" value={seg.end_date} onChange={(e) => updateSegment(i, "end_date", e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Activity Type</Label>
                    <Select value={seg.activity_type} onValueChange={(v) => updateSegment(i, "activity_type", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTIVITY_TYPES.map((a) => (
                          <SelectItem key={a.value} value={a.value}>
                            {a.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes..." rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!travelerName.trim() || createTrip.isPending}
            >
              {createTrip.isPending ? "Creating..." : "Create Trip"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
