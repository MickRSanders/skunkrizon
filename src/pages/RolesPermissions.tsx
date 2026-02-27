import { useState } from "react";
import { Shield, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  useRolePermissions,
  useUpdatePermission,
  ALL_MODULES,
  MODULE_LABELS,
  type AppRole,
  type AppModule,
} from "@/hooks/usePermissions";

const ROLES: { value: AppRole; label: string; description: string }[] = [
  { value: "superadmin", label: "Superadmin", description: "Platform-level administrator with unrestricted access" },
  { value: "admin", label: "Admin", description: "Organization admin with full access within their scope" },
  { value: "analyst", label: "Analyst", description: "Can view, create, and update most data but cannot delete" },
  { value: "viewer", label: "Viewer", description: "Read-only access to permitted modules" },
  { value: "employee", label: "Employee", description: "Limited access to Pre-Travel, Remote Work, and assigned Documents" },
];

const ACTIONS = [
  { key: "can_view" as const, label: "View" },
  { key: "can_create" as const, label: "Create" },
  { key: "can_update" as const, label: "Update" },
  { key: "can_delete" as const, label: "Delete" },
];

export default function RolesPermissions() {
  const { data: permissions, isLoading } = useRolePermissions();
  const updatePerm = useUpdatePermission();
  const [activeRole, setActiveRole] = useState<AppRole>("admin");

  const handleToggle = (
    id: string,
    field: "can_view" | "can_create" | "can_update" | "can_delete",
    currentValue: boolean
  ) => {
    updatePerm.mutate(
      { id, field, value: !currentValue },
      {
        onError: (err: any) => toast.error(err.message || "Failed to update permission"),
      }
    );
  };

  const rolePerms = (permissions || []).filter((p) => p.role === activeRole);
  const activeRoleMeta = ROLES.find((r) => r.value === activeRole);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Roles & Permissions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure what each role can access and do across all modules
        </p>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : (
        <Tabs value={activeRole} onValueChange={(v) => setActiveRole(v as AppRole)}>
          <TabsList className="mb-4">
            {ROLES.map((r) => (
              <TabsTrigger key={r.value} value={r.value} className="gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                {r.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {ROLES.map((role) => (
            <TabsContent key={role.value} value={role.value}>
              {activeRoleMeta && (
                <p className="text-xs text-muted-foreground mb-4">
                  {activeRoleMeta.description}
                </p>
              )}

              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                        Module
                      </th>
                      {ACTIONS.map((a) => (
                        <th
                          key={a.key}
                          className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider w-24"
                        >
                          {a.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ALL_MODULES.map((mod) => {
                      const perm = rolePerms.find((p) => p.module === mod);
                      if (!perm) return null;
                      return (
                        <tr
                          key={mod}
                          className="border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-foreground">
                            {MODULE_LABELS[mod as AppModule]}
                          </td>
                          {ACTIONS.map((a) => (
                            <td key={a.key} className="text-center px-4 py-3">
                              <Switch
                                checked={perm[a.key]}
                                onCheckedChange={() =>
                                  handleToggle(perm.id, a.key, perm[a.key])
                                }
                                disabled={
                                  role.value === "superadmin" ||
                                  updatePerm.isPending
                                }
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {role.value === "superadmin" && (
                <p className="text-xs text-muted-foreground mt-3 italic">
                  Superadmin permissions cannot be modified — this role always has full access.
                </p>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
