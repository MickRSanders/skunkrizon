import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileText,
  X,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Calculator,
  PlusCircle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useCalculations, type Calculation } from "@/hooks/useCalculations";

interface ParsedPolicy {
  policyName: string | null;
  tier: string | null;
  description: string | null;
  taxApproach: string | null;
  benefitComponents: {
    name: string;
    type: string;
    taxable: string;
    calcMethod: string;
    amount: string;
    calculationId?: string | null;
  }[] | null;
  eligibility: string | null;
  duration: string | null;
  notes: string | null;
  parseError?: boolean;
  raw?: string;
}

interface PolicyUploadDialogProps {
  onClose: () => void;
  onSave: (data: ParsedPolicy, fileName: string) => void;
}

export default function PolicyUploadDialog({ onClose, onSave }: PolicyUploadDialogProps) {
  const { user } = useAuth();
  const { data: calculations } = useCalculations();
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedPolicy | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [componentCalcs, setComponentCalcs] = useState<Record<number, string>>({});

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const acceptFile = (f: File) => {
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "text/csv",
    ];
    if (!validTypes.includes(f.type) && !f.name.endsWith(".txt") && !f.name.endsWith(".docx") && !f.name.endsWith(".pdf")) {
      toast.error("Unsupported file type. Use PDF, DOCX, or TXT.");
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      toast.error("File too large. Max 20MB.");
      return;
    }
    setFile(f);
    setParsed(null);
    setParseError(null);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) acceptFile(e.dataTransfer.files[0]);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) acceptFile(e.target.files[0]);
  };

  const handleUploadAndParse = async () => {
    if (!file || !user) return;
    setUploading(true);
    setParseError(null);

    try {
      // 1. Upload to storage
      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("policy-documents")
        .upload(filePath, file);
      if (uploadErr) throw uploadErr;

      setUploading(false);

      // 2. Send file path to AI for parsing (edge function downloads from storage)
      setParsing(true);
      const { data, error } = await supabase.functions.invoke("parse-policy", {
        body: { filePath, fileName: file.name },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.parsed?.parseError) {
        setParseError("AI couldn't fully parse this document. You can still save with partial data.");
        setParsed(data.parsed);
      } else {
        setParsed(data.parsed);
        toast.success("Document parsed successfully!");
      }
    } catch (err: any) {
      setParseError(err.message || "Failed to parse document");
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      setParsing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-card rounded-xl border border-border shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            <div>
              <h2 className="text-lg font-bold text-foreground">Upload Policy Document</h2>
              <p className="text-xs text-muted-foreground">AI-powered parsing extracts benefit components automatically</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Drop Zone */}
          {!parsed && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? "border-accent bg-accent/5"
                  : file
                  ? "border-accent/40 bg-accent/5"
                  : "border-border hover:border-muted-foreground/40"
              }`}
            >
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="w-8 h-8 text-accent" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button
                    onClick={() => { setFile(null); setParsed(null); setParseError(null); }}
                    className="ml-4 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-foreground font-medium">Drop your policy document here</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, or TXT — up to 20MB</p>
                  <label className="mt-4 inline-block">
                    <Input
                      type="file"
                      accept=".pdf,.docx,.txt,.csv"
                      className="hidden"
                      onChange={handleFileInput}
                    />
                    <span className="text-xs text-accent hover:underline cursor-pointer font-medium">
                      Or click to browse files
                    </span>
                  </label>
                </>
              )}
            </div>
          )}

          {/* Parse Button */}
          {file && !parsed && !parsing && (
            <Button onClick={handleUploadAndParse} disabled={uploading} className="w-full">
              {uploading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Uploading...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Upload & Parse with AI</>
              )}
            </Button>
          )}

          {/* Parsing State */}
          {parsing && (
            <div className="flex items-center justify-center gap-3 py-8">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
              <div>
                <p className="text-sm font-medium text-foreground">AI is analyzing your document...</p>
                <p className="text-xs text-muted-foreground">Extracting policy name, benefits, tax approach, and more</p>
              </div>
            </div>
          )}

          {/* Parse Error */}
          {parseError && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-3">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">{parseError}</p>
            </div>
          )}

          {/* Parsed Results Preview */}
          {parsed && !parsed.parseError && (
            <>
              <div className="flex items-center gap-2 text-accent">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="text-sm font-semibold">Parsed Results Preview</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Policy Name" value={parsed.policyName} />
                <Field label="Tier" value={parsed.tier} />
                <Field label="Tax Approach" value={parsed.taxApproach} />
                <Field label="Duration" value={parsed.duration} />
                <div className="col-span-2">
                  <Field label="Description" value={parsed.description} />
                </div>
                <div className="col-span-2">
                  <Field label="Eligibility" value={parsed.eligibility} />
                </div>
              </div>

              {parsed.benefitComponents && parsed.benefitComponents.length > 0 && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-foreground">Extracted Benefit Components ({parsed.benefitComponents.length})</h4>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calculator className="w-3.5 h-3.5" />
                      <span>Link calculations to components below</span>
                    </div>
                  </div>
                  <div className="bg-muted/30 rounded-lg border border-border overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Component</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Type</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Taxable</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Amount</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Calculation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.benefitComponents.map((c, i) => (
                          <tr key={i} className="border-b border-border/50 last:border-0">
                            <td className="px-4 py-2 font-medium text-foreground">{c.name}</td>
                            <td className="px-4 py-2 text-muted-foreground">{c.type}</td>
                            <td className="px-4 py-2 text-muted-foreground">{c.taxable}</td>
                            <td className="px-4 py-2 font-medium text-foreground">{c.amount}</td>
                            <td className="px-4 py-2">
                              <Select
                                value={componentCalcs[i] || "none"}
                                onValueChange={(v) =>
                                  setComponentCalcs((prev) => ({ ...prev, [i]: v === "none" ? "" : v }))
                                }
                              >
                                <SelectTrigger className="h-8 text-xs bg-background w-[180px]">
                                  <SelectValue placeholder="No calculation" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No calculation</SelectItem>
                                  {(calculations ?? []).map((calc) => (
                                    <SelectItem key={calc.id} value={calc.id}>
                                      {calc.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {parsed.notes && (
                <>
                  <Separator />
                  <Field label="Additional Notes" value={parsed.notes} />
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          {parsed && !parsed.parseError && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setParsed(null); setFile(null); setComponentCalcs({}); }}>
                Upload Another
              </Button>
              <Button size="sm" onClick={() => {
                const enriched = {
                  ...parsed,
                  benefitComponents: parsed.benefitComponents?.map((c, i) => ({
                    ...c,
                    calculationId: componentCalcs[i] || null,
                  })) ?? null,
                };
                onSave(enriched, file?.name || "document");
              }}>
                <CheckCircle2 className="w-4 h-4 mr-1" /> Save as Policy
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className="text-sm text-foreground bg-muted/30 rounded-md px-3 py-2 border border-border">
        {value || <span className="text-muted-foreground italic">Not detected</span>}
      </p>
    </div>
  );
}
