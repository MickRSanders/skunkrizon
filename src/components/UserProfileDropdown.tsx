import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Settings, Shield, LogOut, ChevronRight, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantContext } from "@/contexts/TenantContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { toast } from "sonner";

export default function UserProfileDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const { activeTenant } = useTenantContext();
  const { impersonatedUser, isImpersonating, stopImpersonation } = useImpersonation();

  const displayName = isImpersonating
    ? impersonatedUser?.display_name || "Unknown User"
    : profile?.display_name || "Admin User";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const tenantName = activeTenant?.tenant_name || "Cartus Global";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleNavigate = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    toast.success("Signed out");
  };

  const menuItems = [
    { label: "My Profile", icon: User, onClick: () => handleNavigate("/profile") },
    { label: "General Settings", icon: Settings, onClick: () => handleNavigate("/settings") },
    { label: "Roles & Permissions", icon: Shield, onClick: () => handleNavigate("/settings/roles") },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 pl-3 border-l border-border hover:opacity-80 transition-opacity cursor-pointer"
      >
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center relative",
          isImpersonating ? "bg-amber-500" : "bg-primary"
        )}>
          {isImpersonating ? (
            <Eye className="w-4 h-4 text-amber-950" />
          ) : profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={displayName} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <span className="text-xs font-semibold text-primary-foreground">{initials}</span>
          )}
        </div>
        <div className="hidden sm:block text-left">
          <p className={cn("text-sm font-medium leading-tight", isImpersonating ? "text-amber-600 dark:text-amber-400" : "text-foreground")}>
            {displayName}
          </p>
          <p className="text-xs text-muted-foreground leading-tight">
            {isImpersonating ? `Viewing as · ${impersonatedUser?.role}` : tenantName}
          </p>
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
          {/* Menu items */}
          <div className="py-1">
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors group"
              >
                <item.icon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
              </button>
            ))}
          </div>

          {/* Stop impersonation */}
          {isImpersonating && (
            <div className="border-t border-border py-1">
              <button
                onClick={() => { setOpen(false); stopImpersonation(); toast.info("Impersonation ended"); }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors group"
              >
                <Eye className="w-4 h-4" />
                <span className="flex-1 text-left">Stop Impersonating</span>
              </button>
            </div>
          )}

          {/* Sign out */}
          <div className="border-t border-border py-1">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-destructive hover:bg-destructive/5 transition-colors group"
            >
              <LogOut className="w-4 h-4" />
              <span className="flex-1 text-left">Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
