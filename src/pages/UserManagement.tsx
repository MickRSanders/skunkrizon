import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
  Search,
  Shield,
  Loader2,
  X,
  Mail,
  UserPlus,
  Pencil,
  KeyRound,
  Eye,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useTenantContext } from "@/contexts/TenantContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useAuth } from "@/contexts/AuthContext";

// ─── Types & Hooks ──────────────────────────────────────────────

interface UserWithRole {
  id: string;
  display_name: string | null;
  company: string | null;
  department: string | null;
  job_title: string | null;
  created_at: string;
  role: string;
  user_id: string;
  email: string | null;
  last_sign_in_at: string | null;
}

function useAllUsers() {
  return useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      // Fetch profiles, roles, and auth metadata in parallel
      const [profilesRes, rolesRes, authRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("*"),
        supabase.functions.invoke("invite-user", { body: { action: "list-auth-users" } }),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const roleMap = new Map<string, string>();
      (rolesRes.data || []).forEach((r) => roleMap.set(r.user_id, r.role));

      const authMap = new Map<string, { email: string | null; last_sign_in_at: string | null }>();
      if (authRes.data?.users) {
        for (const u of authRes.data.users) {
          authMap.set(u.id, { email: u.email, last_sign_in_at: u.last_sign_in_at });
        }
      }

      return (profilesRes.data || []).map((p) => ({
        id: p.id,
        display_name: p.display_name,
        company: p.company,
        department: p.department,
        job_title: p.job_title,
        created_at: p.created_at,
        role: roleMap.get(p.id) || "viewer",
        user_id: p.id,
        email: authMap.get(p.id)?.email || null,
        last_sign_in_at: authMap.get(p.id)?.last_sign_in_at || null,
      })) as UserWithRole[];
    },
  });
}

function useInviteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, displayName, role, action, password }: { email: string; displayName: string; role: string; action?: string; password?: string }) => {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { email, displayName, role, action, password },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all-users"] }),
  });
}

function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      profile,
      role,
    }: {
      userId: string;
      profile: { display_name: string; company: string; department: string; job_title: string };
      role: string;
    }) => {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          display_name: profile.display_name || null,
          company: profile.company || null,
          department: profile.department || null,
          job_title: profile.job_title || null,
        })
        .eq("id", userId);
      if (profileError) throw profileError;

      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ role: role as any })
        .eq("user_id", userId);
      if (roleError) throw roleError;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all-users"] }),
  });
}

function useResetPassword() {
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { action: "reset-password", userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
  });
}

function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { action: "delete-user", userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all-users"] }),
  });
}

// ─── Role descriptions ─────────────────────────────────────────

const ROLE_DESCRIPTIONS: Record<string, string> = {
  superadmin: "Topia staff — full platform access across all organizations",
  admin: "Full access to all features, user and organization management",
  analyst: "Calculations, simulations, policy config, and reporting",
  viewer: "View assigned simulations and reports only",
  employee: "Pre-Travel, Remote Work, and assigned Documents only",
};

// ─── Page ───────────────────────────────────────────────────────

export default function UserManagement() {
  const { data: users, isLoading } = useAllUsers();
  const [search, setSearch] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const { isSuperadmin } = useTenantContext();
  const { startImpersonation } = useImpersonation();
  const { user } = useAuth();
  const resetPassword = useResetPassword();
  const deleteUser = useDeleteUser();

  const handleImpersonate = (u: UserWithRole) => {
    if (u.id === user?.id) {
      toast.error("You can't impersonate yourself");
      return;
    }
    startImpersonation({
      id: u.id,
      display_name: u.display_name,
      role: u.role,
    });
    toast.success(`Now viewing as ${u.display_name || "user"}`);
  };

  const handleResetPassword = async (user: UserWithRole) => {
    try {
      await resetPassword.mutateAsync(user.id);
      toast.success(`Password reset email sent to ${user.display_name || "user"}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset email");
    }
  };

  const handleDeleteUser = async (u: UserWithRole) => {
    if (u.id === user?.id) {
      toast.error("You cannot delete your own account");
      return;
    }
    if (!confirm(`Are you sure you want to delete ${u.display_name || "this user"}? This action cannot be undone.`)) return;
    try {
      await deleteUser.mutateAsync(u.id);
      toast.success(`User ${u.display_name || ""} deleted`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user");
    }
  };

  const filteredUsers = (users || []).filter(
    (u) =>
      !search ||
      u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase()) ||
      u.company?.toLowerCase().includes(search.toLowerCase())
  );

  const roleCounts = (users || []).reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">RBAC, user invitations, and activity monitoring</p>
        </div>
        <Button size="sm" onClick={() => setShowInvite(true)}>
          <UserPlus className="w-4 h-4 mr-1" /> Add User
        </Button>
      </div>

      {/* Roles Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(ROLE_DESCRIPTIONS).map(([role, desc]) => (
          <div key={role} className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-accent" />
              <h4 className="text-sm font-semibold text-foreground capitalize">{role}</h4>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{desc}</p>
            <p className="text-xs font-medium text-foreground">
              {roleCounts[role] || 0} user{(roleCounts[role] || 0) !== 1 ? "s" : ""}
            </p>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="bg-card rounded-lg border border-border">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-sm bg-background border border-border rounded-md px-3 py-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm outline-none w-full text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-accent" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">User</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Company</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Department</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Login</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Joined</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-sm text-muted-foreground">
                      {search ? "No users match your search." : "No users yet. Invite someone to get started."}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="data-table-row">
                      <td className="px-5 py-3">
                        <p className="font-medium text-foreground">{u.display_name || "Unnamed"}</p>
                        <p className="text-xs text-muted-foreground">{u.email || u.job_title || "—"}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent capitalize">
                          <Shield className="w-3 h-3" />
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{u.company || "—"}</td>
                      <td className="px-5 py-3 text-muted-foreground">{u.department || "—"}</td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit", hour: "numeric", minute: "2-digit" }) : "Never"}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          {isSuperadmin && u.id !== user?.id && u.role !== "superadmin" && (
                            <button
                              onClick={() => handleImpersonate(u)}
                              className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-accent"
                              title="Impersonate user"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleResetPassword(u)}
                            className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            title="Send password reset email"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingUser(u)}
                            className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            title="Edit user"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {u.id !== user?.id && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-destructive"
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showInvite && <InviteUserDialog onClose={() => setShowInvite(false)} />}
      {editingUser && <EditUserDialog user={editingUser} onClose={() => setEditingUser(null)} />}
    </div>
  );
}

// ─── Edit User Dialog ───────────────────────────────────────────

function EditUserDialog({ user, onClose }: { user: UserWithRole; onClose: () => void }) {
  const [displayName, setDisplayName] = useState(user.display_name || "");
  const [company, setCompany] = useState(user.company || "");
  const [department, setDepartment] = useState(user.department || "");
  const [jobTitle, setJobTitle] = useState(user.job_title || "");
  const [role, setRole] = useState(user.role);
  const updateUser = useUpdateUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateUser.mutateAsync({
        userId: user.id,
        profile: { display_name: displayName, company, department, job_title: jobTitle },
        role,
      });
      toast.success("User updated");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to update user");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-bold text-foreground">Edit User</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Display Name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Jane Smith" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Company</Label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Corp" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Department</Label>
              <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="HR" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Job Title</Label>
            <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Senior Analyst" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="analyst">Analyst</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="superadmin">Superadmin (Topia)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={updateUser.isPending}>
              {updateUser.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Invite / Create User Dialog ────────────────────────────────

function InviteUserDialog({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<"invite" | "create">("create");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("viewer");
  const invite = useInviteUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === "create") {
        await invite.mutateAsync({ email, displayName, role, action: "create-user", password });
        toast.success(`User created — confirmation email sent to ${email}`);
      } else {
        await invite.mutateAsync({ email, displayName, role });
        toast.success(`Invitation sent to ${email}`);
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to add user");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-bold text-foreground">Add User</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <button
              type="button"
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${mode === "create" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setMode("create")}
            >
              Create with Password
            </button>
            <button
              type="button"
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${mode === "invite" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setMode("invite")}
            >
              Send Invite Link
            </button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Email Address *</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@company.com" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Display Name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Jane Smith" />
          </div>
          {mode === "create" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Password *</Label>
              <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="analyst">Analyst</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="superadmin">Superadmin (Topia)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            {mode === "create"
              ? "The user will receive a confirmation email to verify their address before they can sign in."
              : "An email invitation will be sent with a link to set up their account."}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={invite.isPending}>
              {invite.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {mode === "create" ? "Create User" : "Send Invitation"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
