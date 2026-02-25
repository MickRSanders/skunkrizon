import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatusBadgeProps {
  status: "active" | "draft" | "archived" | "pending" | "completed" | "running";
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-success/10 text-success" },
  draft: { label: "Draft", className: "bg-warning/10 text-warning" },
  archived: { label: "Archived", className: "bg-muted text-muted-foreground" },
  pending: { label: "Pending", className: "bg-info/10 text-info" },
  completed: { label: "Completed", className: "bg-success/10 text-success" },
  running: { label: "Running", className: "bg-accent/10 text-accent" },
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", config.className, className)}>
      {config.label}
    </span>
  );
}
