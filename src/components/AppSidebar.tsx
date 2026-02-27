import { NavLink, useLocation } from "react-router-dom";
import topiaIcon from "@/assets/topia-icon.jpg";
import {
  LayoutDashboard,
  Calculator,
  FileText,
  Settings,
  Users,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Globe,
  Shield,
  FunctionSquare,
  LogOut,
  Building2,
  Table2,
  BookOpen,
  ChevronsUpDown,
  Check,
  Database,
  Cable,
  ClipboardList,
  Plane,
  Contact,
  Link2,
  BookOpenCheck,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantContext } from "@/contexts/TenantContext";
import { useTenantModulesForTenant, isModuleEnabled, type ModuleKey } from "@/hooks/useTenantModules";
import { useCurrentUserRole } from "@/hooks/usePermissions";
import { toast } from "sonner";

// Modules accessible to the employee role
const EMPLOYEE_ALLOWED_ROUTES = new Set(["/", "/pre-travel", "/remote-work", "/documents"]);

const navItems: { to: string; icon: any; label: string; moduleKey?: ModuleKey }[] = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/simulations", icon: Calculator, label: "Cost Simulations", moduleKey: "simulations" },
  { to: "/pre-travel", icon: Plane, label: "Pre-Travel", moduleKey: "pre_travel" },
  { to: "/remote-work", icon: Globe, label: "Remote Work", moduleKey: "remote_work" },
  { to: "/employees", icon: Contact, label: "Employees", moduleKey: "employees" },
  { to: "/documents", icon: ClipboardList, label: "Documents", moduleKey: "documents" },
  { to: "/policies", icon: FileText, label: "Policy Agent", moduleKey: "policies" },
  { to: "/analytics", icon: BarChart3, label: "Analytics", moduleKey: "analytics" },
];

const dataMenuItems: { to: string; icon: any; label: string; moduleKey: ModuleKey }[] = [
  { to: "/calculations", icon: FunctionSquare, label: "Calculations", moduleKey: "calculations" },
  { to: "/lookup-tables", icon: Table2, label: "Lookup Tables", moduleKey: "lookup_tables" },
  { to: "/field-library", icon: BookOpen, label: "Field Library", moduleKey: "field_library" },
  { to: "/field-mappings", icon: Link2, label: "Field Mappings", moduleKey: "field_mappings" },
  { to: "/data-sources", icon: Cable, label: "Data Sources", moduleKey: "data_sources" },
];

const settingsMenuItems: { to: string; icon: any; label: string; moduleKey: ModuleKey }[] = [
  { to: "/settings", icon: Settings, label: "General", moduleKey: "settings" },
  { to: "/cost-estimate-templates", icon: FileText, label: "Cost Estimate Templates", moduleKey: "cost_estimate_templates" },
  { to: "/settings/roles", icon: Shield, label: "Roles & Permissions", moduleKey: "roles_permissions" },
  { to: "/tax-engine", icon: Globe, label: "Tax Engine", moduleKey: "tax_engine" },
  { to: "/users", icon: Users, label: "User Management", moduleKey: "user_management" },
  { to: "/tenants", icon: Building2, label: "Organizations", moduleKey: "tenant_management" },
  { to: "/audit-log", icon: ClipboardList, label: "Audit Log", moduleKey: "audit_log" },
];

export default function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { signOut, profile } = useAuth();
  const { tenants, activeTenant, activeSubTenant, subTenants, switchTenant, switchSubTenant, isSuperadmin } = useTenantContext();
  const { data: tenantModules } = useTenantModulesForTenant(activeTenant?.tenant_id);
  const { data: currentRole } = useCurrentUserRole();
  const tenantName = activeTenant?.tenant_name;
  const isEmployee = currentRole === "employee";

  const isModEnabled = (moduleKey?: ModuleKey) => {
    if (!moduleKey) return true; // Dashboard always visible
    return isModuleEnabled(tenantModules, moduleKey);
  };

  const isRoleAllowed = (to: string) => {
    if (!isEmployee) return true;
    return EMPLOYEE_ALLOWED_ROUTES.has(to);
  };

  const filteredNavItems = navItems.filter((item) => isModEnabled(item.moduleKey) && isRoleAllowed(item.to));
  const filteredDataItems = isEmployee ? [] : dataMenuItems.filter((item) => isModEnabled(item.moduleKey));
  const filteredSettingsItems = isEmployee ? [] : settingsMenuItems.filter((item) => isModEnabled(item.moduleKey));
  const [tenantMenuOpen, setTenantMenuOpen] = useState(false);
  const [dataMenuOpen, setDataMenuOpen] = useState(
    dataMenuItems.some((item) => location.pathname.startsWith(item.to))
  );
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(
    settingsMenuItems.some((item) => location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to)))
  );

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
          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
            <img src={topiaIcon} alt="Topia" className="w-full h-full object-cover scale-125" />
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

      {/* Organization Switcher */}
      {activeTenant && !collapsed && (
        <div className="px-3 py-2 border-b border-sidebar-border">
          <div className="relative">
            <button
              onClick={() => setTenantMenuOpen(!tenantMenuOpen)}
              className="flex items-center justify-between w-full gap-2 px-2 py-1.5 rounded-md text-left hover:bg-sidebar-accent/50 transition-colors"
            >
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="w-3.5 h-3.5 text-sidebar-foreground/50 shrink-0" />
                  <span className="text-[11px] font-medium text-sidebar-foreground/70 truncate">
                    {tenantName}
                  </span>
                  {isSuperadmin && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/20 text-accent font-semibold uppercase tracking-wider shrink-0">
                      Super
                    </span>
                  )}
                </div>
                {activeSubTenant && (
                  <span className="ml-5.5 text-[10px] text-sidebar-foreground/50 truncate">
                    ↳ {activeSubTenant.name}
                  </span>
                )}
              </div>
              {(tenants.length > 1 || subTenants.length > 0) && (
                <ChevronsUpDown className="w-3 h-3 text-sidebar-foreground/40 shrink-0" />
              )}
            </button>
            {tenantMenuOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover border border-border rounded-md shadow-lg py-1 max-h-64 overflow-y-auto">
                {/* Tenants */}
                {tenants.length > 1 && (
                  <>
                    <div className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Organizations
                    </div>
                    {tenants
                      .filter((t, i, arr) => arr.findIndex((a) => a.tenant_id === t.tenant_id) === i)
                      .map((t) => (
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
                              t.tenant_id === activeTenant.tenant_id && !activeSubTenant ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="truncate">{t.tenant_name}</span>
                        </button>
                      ))}
                  </>
                )}
                {/* Sub-tenants */}
                {subTenants.length > 0 && (
                  <>
                    <div className="px-3 py-1 mt-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-t border-border pt-2">
                      Sub-organizations
                    </div>
                    {/* "All / Parent" option */}
                    <button
                      onClick={() => {
                        switchSubTenant(null);
                        setTenantMenuOpen(false);
                        toast.success(`Viewing all of ${activeTenant.tenant_name}`);
                      }}
                      className={cn(
                        "flex items-center gap-2 w-full px-3 py-1.5 text-[11px] text-left transition-colors",
                        !activeSubTenant
                          ? "text-primary font-semibold bg-accent/50"
                          : "text-popover-foreground hover:bg-accent"
                      )}
                    >
                      <Check className={cn("w-3 h-3 shrink-0", !activeSubTenant ? "opacity-100" : "opacity-0")} />
                      <span className="truncate">All ({activeTenant.tenant_name})</span>
                    </button>
                    {subTenants.map((st) => (
                      <button
                        key={st.id}
                        onClick={() => {
                          switchSubTenant(st.id);
                          setTenantMenuOpen(false);
                          toast.success(`Switched to ${st.name}`);
                        }}
                        className={cn(
                          "flex items-center gap-2 w-full px-3 py-1.5 text-[11px] text-left transition-colors",
                          st.id === activeSubTenant?.id
                            ? "text-primary font-semibold bg-accent/50"
                            : "text-popover-foreground hover:bg-accent"
                        )}
                      >
                        <Check className={cn("w-3 h-3 shrink-0", st.id === activeSubTenant?.id ? "opacity-100" : "opacity-0")} />
                        <span className="truncate">{st.name}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {activeTenant && collapsed && (
        <div className="flex justify-center py-2 border-b border-sidebar-border" title={`${tenantName}${activeSubTenant ? ` → ${activeSubTenant.name}` : ""}`}>
          <Building2 className="w-3.5 h-3.5 text-sidebar-foreground/50" />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {filteredNavItems.map((item) => {
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

        {/* Data menu */}
        {filteredDataItems.length > 0 && (() => {
          const isDataActive = filteredDataItems.some((d) => location.pathname.startsWith(d.to));
          return (
            <div>
              <button
                onClick={() => setDataMenuOpen(!dataMenuOpen)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors w-full",
                  isDataActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <Database className="w-4 h-4 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">Data</span>
                    <ChevronDown
                      className={cn(
                        "w-3.5 h-3.5 transition-transform",
                        dataMenuOpen ? "rotate-0" : "-rotate-90"
                      )}
                    />
                  </>
                )}
              </button>
              {dataMenuOpen && !collapsed && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-2">
                  {filteredDataItems.map((sub) => {
                    const subActive = location.pathname.startsWith(sub.to);
                    return (
                      <NavLink
                        key={sub.to}
                        to={sub.to}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                          subActive
                            ? "bg-sidebar-accent text-sidebar-primary"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <sub.icon className="w-4 h-4 shrink-0" />
                        <span>{sub.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* Settings menu */}
        {filteredSettingsItems.length > 0 && (() => {
          const isSettingsActive = filteredSettingsItems.some((s) => location.pathname === s.to || (s.to !== "/" && location.pathname.startsWith(s.to)));
          return (
            <div>
              <button
                onClick={() => setSettingsMenuOpen(!settingsMenuOpen)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors w-full",
                  isSettingsActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <Settings className="w-4 h-4 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">Configuration</span>
                    <ChevronDown
                      className={cn(
                        "w-3.5 h-3.5 transition-transform",
                        settingsMenuOpen ? "rotate-0" : "-rotate-90"
                      )}
                    />
                  </>
                )}
              </button>
              {settingsMenuOpen && !collapsed && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-2">
                  {filteredSettingsItems.map((sub) => {
                    const subActive = location.pathname === sub.to || (sub.to !== "/" && location.pathname.startsWith(sub.to));
                    return (
                      <NavLink
                        key={sub.to}
                        to={sub.to}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                          subActive
                            ? "bg-sidebar-accent text-sidebar-primary"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <sub.icon className="w-4 h-4 shrink-0" />
                        <span>{sub.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </nav>

      {/* User & Sign Out */}
      <div className="p-2 border-t border-sidebar-border space-y-1">
        <NavLink
          to="/walkthrough"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            location.pathname === "/walkthrough"
              ? "bg-sidebar-accent text-sidebar-primary"
              : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
          )}
        >
          <BookOpenCheck className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Walkthrough</span>}
        </NavLink>
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
