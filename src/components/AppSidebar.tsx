import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Calculator,
  FileText,
  Settings,
  Users,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Globe,
  Shield,
  FunctionSquare,
  LogOut,
  Building2,
  Table2,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantContext } from "@/contexts/TenantContext";
import { toast } from "sonner";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/simulations", icon: Calculator, label: "Cost Simulations" },
  { to: "/policies", icon: FileText, label: "Policy Agent" },
  { to: "/calculations", icon: FunctionSquare, label: "Calculations Engine" },
  { to: "/lookup-tables", icon: Table2, label: "Lookup Tables" },
  { to: "/tax-engine", icon: Globe, label: "Tax Engine" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/users", icon: Users, label: "User Management" },
  { to: "/tenants", icon: Building2, label: "Tenants" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { signOut, profile } = useAuth();
  const { tenants, activeTenant, switchTenant } = useTenantContext();
  const tenantName = activeTenant?.tenant_name;
  const [tenantMenuOpen, setTenantMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
  };

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 h-screen sticky top-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold text-sidebar-accent-foreground tracking-tight">
                HORIZON
              </h1>
              <p className="text-[10px] text-sidebar-foreground/60 tracking-widest uppercase">
                by Topia
              </p>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md text-sidebar-foreground/60 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Tenant Switcher */}
      {activeTenant && !collapsed && (
        <div className="px-3 py-2 border-b border-sidebar-border">
          <div className="relative">
            <button
              onClick={() => setTenantMenuOpen(!tenantMenuOpen)}
              className="flex items-center justify-between w-full gap-2 px-2 py-1.5 rounded-md text-left hover:bg-sidebar-accent/50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="w-3.5 h-3.5 text-sidebar-foreground/50 shrink-0" />
                <span className="text-[11px] font-medium text-sidebar-foreground/70 truncate">
                  {tenantName}
                </span>
              </div>
              {tenants.length > 1 && (
                <ChevronsUpDown className="w-3 h-3 text-sidebar-foreground/40 shrink-0" />
              )}
            </button>
            {tenantMenuOpen && tenants.length > 1 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover border border-border rounded-md shadow-lg py-1">
                {tenants.map((t) => (
                  <button
                    key={t.tenant_id}
                    onClick={() => {
                      switchTenant(t.tenant_id);
                      setTenantMenuOpen(false);
                      toast.success(`Switched to ${t.tenant_name}`);
                    }}
                    className={cn(
                      "flex items-center gap-2 w-full px-3 py-1.5 text-[11px] text-left transition-colors",
                      t.tenant_id === activeTenant.tenant_id
                        ? "text-primary font-semibold bg-accent/50"
                        : "text-popover-foreground hover:bg-accent"
                    )}
                  >
                    <Check
                      className={cn(
                        "w-3 h-3 shrink-0",
                        t.tenant_id === activeTenant.tenant_id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{t.tenant_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {activeTenant && collapsed && (
        <div className="flex justify-center py-2 border-b border-sidebar-border" title={tenantName ?? ""}>
          <Building2 className="w-3.5 h-3.5 text-sidebar-foreground/50" />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.to ||
            (item.to !== "/" && location.pathname.startsWith(item.to));
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User & Sign Out */}
      <div className="p-2 border-t border-sidebar-border space-y-1">
        {!collapsed && profile && (
          <div className="px-3 py-2 text-xs text-sidebar-foreground/60 truncate">
            {profile.display_name}
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-sidebar-foreground/60 hover:text-destructive hover:bg-sidebar-accent/50 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
