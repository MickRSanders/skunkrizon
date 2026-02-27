import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: ReactNode;
  subtitle?: string;
  link?: string;
}

export default function KPICard({ title, value, change, changeType = "neutral", icon, subtitle, link }: KPICardProps) {
  const navigate = useNavigate();

  return (
    <div
      className={cn("kpi-card animate-fade-in", link && "cursor-pointer hover:shadow-md hover:border-accent/30 transition-all")}
      onClick={link ? () => navigate(link) : undefined}
      role={link ? "link" : undefined}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
          {icon}
        </div>
      </div>
      {change && (
        <p
          className={cn(
            "text-xs font-medium mt-3",
            changeType === "positive" && "text-success",
            changeType === "negative" && "text-destructive",
            changeType === "neutral" && "text-muted-foreground"
          )}
        >
          {change}
        </p>
      )}
    </div>
  );
}
