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
} from "lucide-react";
import { toast } from "sonner";

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
}

function useAllUsers() {
  return useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");
      if (rolesError) throw rolesError;

      const roleMap = new Map<string, string>();
      roles?.forEach((r) => roleMap.set(r.user_id, r.role));

      return (profiles || []).map((p) => ({
        id: p.id,
        display_name: p.display_name,
        company: p.company,
        department: p.department,
        job_title: p.job_title,
        created_at: p.created_at,
        role: roleMap.get(p.id) || "viewer",
        user_id: p.id,
      })) as UserWithRole[];
    },
  });
}

function useInviteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, displayName, role }: { email: string; displayName: string; role: string }) => {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { email, displayName, role },
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
      // Update profile
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

      // Update role
      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ role: role as any })
        .eq("user_id", userId);
      if (roleError) throw roleError;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all-users"] }),
  });
}

// ─── Role descriptions ─────────────────────────────────────────

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: "Full access to all features, user and tenant management",
  analyst: "Calculations, simulations, policy config, and reporting",
  viewer: "View assigned simulations and reports only",
};

// ─── Page ───────────────────────────────────────────────────────

export default function UserManagement() {
  const { data: users, isLoading } = useAllUsers();
  const [search, setSearch] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);

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
          <UserPlus className="w-4 h-4 mr-1" /> Invite User
        </Button>
      </div>

      {/* Roles Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Joined</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-sm text-muted-foreground">
                      {search ? "No users match your search." : "No users yet. Invite someone to get started."}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="data-table-row">
                      <td className="px-5 py-3">
                        <p className="font-medium text-foreground">{u.display_name || "Unnamed"}</p>
                        <p className="text-xs text-muted-foreground">{u.job_title || "—"}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent capitalize">
                          <Shield className="w-3 h-3" />
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{u.company || "—"}</td>
                      <td className="px-5 py-3 text-muted-foreground">{u.department || "—"}</td>
                      <td className="px-5 py-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => setEditingUser(u)}
                          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
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
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="analyst">Analyst</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
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

// ─── Invite Dialog ──────────────────────────────────────────────

function InviteUserDialog({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("viewer");
  const invite = useInviteUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await invite.mutateAsync({ email, displayName, role });
      toast.success(`Invitation sent to ${email}`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to invite user");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-bold text-foreground">Invite User</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Email Address *</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@company.com" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Display Name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Jane Smith" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="analyst">Analyst</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            An email invitation will be sent to this address with a link to set up their account.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={invite.isPending}>
              {invite.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Send Invitation
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
