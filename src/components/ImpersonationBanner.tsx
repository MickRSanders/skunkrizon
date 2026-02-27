import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ImpersonationBanner() {
  const { impersonatedUser, isImpersonating, stopImpersonation } = useImpersonation();

  if (!isImpersonating || !impersonatedUser) return null;

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between gap-3 text-sm font-medium z-50 relative">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4" />
        <span>
          Viewing as <strong>{impersonatedUser.display_name || "Unknown User"}</strong>
          <span className="ml-1 opacity-75">({impersonatedUser.role})</span>
        </span>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-amber-950 hover:bg-amber-600 hover:text-amber-950"
        onClick={stopImpersonation}
      >
        <X className="w-3 h-3 mr-1" />
        Exit Impersonation
      </Button>
    </div>
  );
}
