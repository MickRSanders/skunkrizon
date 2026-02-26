import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Plus,
  Search,
  Settings,
  Shield,
  Users,
  Network,
  Loader2,
  Trash2,
  ChevronRight,
  Globe,
  Key,
  CheckCircle2,
  XCircle,
  Copy,
  Link,
} from "lucide-react";
import { toast } from "sonner";
import {
  useTenants,
  useSubTenants,
  useTenantUsers,
  useCreateTenant,
  useUpdateTenant,
  useCreateSubTenant,
  useDeleteSubTenant,
  useSearchProfiles,
  useAssignTenantUser,
  useRemoveTenantUser,
  useUpdateTenantUserRole,
  type Tenant,
} from "@/hooks/useTenants";
import type { Json } from "@/integrations/supabase/types";

export default function TenantManagement() {
  const { data: tenants, isLoading } = useTenants();
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showSubTenantForm, setShowSubTenantForm] = useState(false);

  const selectedTenant = tenants?.find((t) => t.id === selectedTenantId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Organization Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure client organizations, sub-organizations, and SSO settings</p>
        </div>
        <Button size="sm" onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-1" /> New Organization
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Tenant List Sidebar */}
        <div className="col-span-4 bg-card rounded-lg border border-border">
          <div className="p-3 border-b border-border">
            <div className="flex items-center gap-2 bg-background border border-border rounded-md px-3 py-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="Search organizations..." className="bg-transparent text-sm outline-none w-full text-foreground placeholder:text-muted-foreground" />
            </div>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {isLoading ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-accent" />
              </div>
            ) : tenants && tenants.length > 0 ? (
              tenants.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTenantId(t.id)}
                  className={`w-full text-left px-4 py-3 border-b border-border/50 transition-colors hover:bg-muted/40 ${
                    selectedTenantId === t.id ? "bg-accent/10 border-l-2 border-l-accent" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-accent shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {t.sso_enabled ? (
                        <Shield className="w-3.5 h-3.5 text-accent" />
                      ) : null}
                      <span className={`w-2 h-2 rounded-full ${t.is_active ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No organizations configured yet.
              </div>
            )}
          </div>
        </div>

        {/* Tenant Detail */}
        <div className="col-span-8">
          {selectedTenant ? (
            <TenantDetail
              tenant={selectedTenant}
              onShowSubTenantForm={() => setShowSubTenantForm(true)}
              showSubTenantForm={showSubTenantForm}
              onCloseSubTenantForm={() => setShowSubTenantForm(false)}
            />
          ) : (
            <div className="bg-card rounded-lg border border-border p-12 text-center">
              <Building2 className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Select an organization or create a new one</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Tenant Dialog */}
      {showCreateForm && (
        <CreateTenantDialog onClose={() => setShowCreateForm(false)} />
      )}
    </div>
  );
}

// ─── Tenant URL ─────────────────────────────────────────────────

function TenantUrl({ slug }: { slug: string }) {
  const baseUrl = window.location.origin;
  const tenantUrl = `${baseUrl}/t/${slug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(tenantUrl);
    toast.success("Organization URL copied to clipboard");
  };

  return (
    <div className="flex items-center gap-2 bg-muted/30 border border-border rounded-md px-3 py-2">
      <Link className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <code className="text-xs font-mono text-foreground truncate flex-1">{tenantUrl}</code>
      <button
        onClick={handleCopy}
        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
        title="Copy URL"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Tenant Detail ──────────────────────────────────────────────

function TenantDetail({
  tenant,
  onShowSubTenantForm,
  showSubTenantForm,
  onCloseSubTenantForm,
}: {
  tenant: Tenant;
  onShowSubTenantForm: () => void;
  showSubTenantForm: boolean;
  onCloseSubTenantForm: () => void;
}) {
  const { data: subTenants, isLoading: loadingSubs } = useSubTenants(tenant.id);
  const { data: tenantUsers, isLoading: loadingUsers } = useTenantUsers(tenant.id);
  const updateTenant = useUpdateTenant();
  const deleteSubTenant = useDeleteSubTenant();
  const removeTenantUser = useRemoveTenantUser();
  const updateUserRole = useUpdateTenantUserRole();
  const [showAssignUser, setShowAssignUser] = useState(false);

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="p-5 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">{tenant.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {tenant.domain && <span className="mr-3"><Globe className="w-3 h-3 inline mr-1" />{tenant.domain}</span>}
              Slug: <span className="font-mono">{tenant.slug}</span>
            </p>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${tenant.is_active ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
            {tenant.is_active ? "Active" : "Inactive"}
          </span>
        </div>
        <TenantUrl slug={tenant.slug} />
      </div>

      <Tabs defaultValue="sub-tenants" className="p-0">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-5 h-auto">
          <TabsTrigger value="sub-tenants" className="data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none py-3 text-xs">
            <Network className="w-3.5 h-3.5 mr-1" /> Sub-Organizations
          </TabsTrigger>
          <TabsTrigger value="sso" className="data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none py-3 text-xs">
            <Shield className="w-3.5 h-3.5 mr-1" /> SSO Configuration
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none py-3 text-xs">
            <Users className="w-3.5 h-3.5 mr-1" /> Users
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none py-3 text-xs">
            <Settings className="w-3.5 h-3.5 mr-1" /> Settings
          </TabsTrigger>
        </TabsList>

        {/* Sub-Tenants Tab */}
        <TabsContent value="sub-tenants" className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Reseller clients under {tenant.name}</p>
            <Button size="sm" variant="outline" onClick={onShowSubTenantForm}>
              <Plus className="w-4 h-4 mr-1" /> Add Sub-Organization
            </Button>
          </div>
          {loadingSubs ? (
            <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-accent" /></div>
          ) : subTenants && subTenants.length > 0 ? (
            <div className="space-y-2">
              {subTenants.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-md border border-border bg-muted/20">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.slug} {s.domain && `· ${s.domain}`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.sso_enabled && <Shield className="w-3.5 h-3.5 text-accent" />}
                    <span className={`w-2 h-2 rounded-full ${s.is_active ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                    <button
                      onClick={() => {
                        deleteSubTenant.mutate({ id: s.id, tenantId: tenant.id });
                        toast.success("Sub-organization removed");
                      }}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">No sub-organizations yet.</div>
          )}
          {showSubTenantForm && (
            <CreateSubTenantForm tenantId={tenant.id} onClose={onCloseSubTenantForm} />
          )}
        </TabsContent>

        {/* SSO Tab */}
        <TabsContent value="sso" className="p-5">
          <SSOConfigPanel tenant={tenant} onUpdate={updateTenant} />
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Users assigned to {tenant.name}</p>
            <Button size="sm" variant="outline" onClick={() => setShowAssignUser(true)}>
              <Plus className="w-4 h-4 mr-1" /> Assign User
            </Button>
          </div>
          {showAssignUser && (
            <AssignUserForm tenantId={tenant.id} existingUserIds={(tenantUsers || []).map((tu: any) => tu.user_id)} onClose={() => setShowAssignUser(false)} />
          )}
          {loadingUsers ? (
            <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-accent" /></div>
          ) : tenantUsers && tenantUsers.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">User</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Department</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Role</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Joined</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenantUsers.map((tu: any) => (
                  <tr key={tu.id} className="border-b border-border/50">
                    <td className="px-4 py-2 font-medium text-foreground">{tu.profiles?.display_name || tu.user_id}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{tu.profiles?.department || "—"}</td>
                    <td className="px-4 py-2">
                      <Select
                        value={tu.role}
                        onValueChange={(val) => {
                          updateUserRole.mutate({ id: tu.id, role: val as "tenant_admin" | "tenant_user", tenantId: tenant.id });
                          toast.success("Role updated");
                        }}
                      >
                        <SelectTrigger className="h-7 w-[130px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tenant_admin">Admin</SelectItem>
                          <SelectItem value="tenant_user">User</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(tu.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => {
                          removeTenantUser.mutate({ id: tu.id, tenantId: tenant.id });
                          toast.success("User removed from organization");
                        }}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">No users assigned yet. Click "Assign User" to add one.</div>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FieldDisplay label="Contact Name" value={tenant.contact_name} />
            <FieldDisplay label="Contact Email" value={tenant.contact_email} />
            <FieldDisplay label="Domain" value={tenant.domain} />
            <FieldDisplay label="Created" value={new Date(tenant.created_at).toLocaleDateString()} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── SSO Config Panel ──────────────────────────────────────────

function SSOConfigPanel({ tenant, onUpdate }: { tenant: Tenant; onUpdate: ReturnType<typeof useUpdateTenant> }) {
  const ssoConfig = (tenant.sso_config as Record<string, string>) || {};
  const [enabled, setEnabled] = useState(tenant.sso_enabled ?? false);
  const [provider, setProvider] = useState(tenant.sso_provider || "");
  const [config, setConfig] = useState({
    entityId: ssoConfig.entityId || "",
    ssoUrl: ssoConfig.ssoUrl || "",
    certificate: ssoConfig.certificate || "",
    issuer: ssoConfig.issuer || "",
    clientId: ssoConfig.clientId || "",
    clientSecret: ssoConfig.clientSecret || "",
    discoveryUrl: ssoConfig.discoveryUrl || "",
    redirectUri: ssoConfig.redirectUri || "",
  });

  const updateConfig = (field: string, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      const ssoConfigData: Record<string, string> = {};
      if (provider === "saml") {
        ssoConfigData.entityId = config.entityId;
        ssoConfigData.ssoUrl = config.ssoUrl;
        ssoConfigData.certificate = config.certificate;
      } else if (provider === "oidc") {
        ssoConfigData.issuer = config.issuer;
        ssoConfigData.clientId = config.clientId;
        ssoConfigData.clientSecret = config.clientSecret;
        ssoConfigData.discoveryUrl = config.discoveryUrl;
        ssoConfigData.redirectUri = config.redirectUri;
      }
      await onUpdate.mutateAsync({
        id: tenant.id,
        sso_enabled: enabled,
        sso_provider: provider || null,
        sso_config: ssoConfigData as unknown as Json,
      });
      toast.success("SSO configuration saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save SSO config");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">Enable SSO</p>
          <p className="text-xs text-muted-foreground">Allow users to sign in via the organization's identity provider</p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      {enabled && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">SSO Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger><SelectValue placeholder="Select provider type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="saml">SAML 2.0</SelectItem>
                <SelectItem value="oidc">OIDC / OAuth 2.0</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {provider === "saml" && (
            <>
              <Separator />
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Key className="w-4 h-4 text-accent" /> SAML 2.0 Configuration
              </h4>
              <div className="grid grid-cols-1 gap-4">
                <ConfigField label="Entity ID (IdP Issuer)" value={config.entityId} onChange={(v) => updateConfig("entityId", v)} placeholder="https://idp.example.com/saml/metadata" />
                <ConfigField label="SSO URL (Single Sign-On Service)" value={config.ssoUrl} onChange={(v) => updateConfig("ssoUrl", v)} placeholder="https://idp.example.com/saml/sso" />
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">X.509 Certificate</Label>
                  <textarea
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px]"
                    value={config.certificate}
                    onChange={(e) => updateConfig("certificate", e.target.value)}
                    placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                  />
                </div>
              </div>
            </>
          )}

          {provider === "oidc" && (
            <>
              <Separator />
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Key className="w-4 h-4 text-accent" /> OIDC / OAuth 2.0 Configuration
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <ConfigField label="Issuer URL" value={config.issuer} onChange={(v) => updateConfig("issuer", v)} placeholder="https://accounts.google.com" />
                <ConfigField label="Discovery URL" value={config.discoveryUrl} onChange={(v) => updateConfig("discoveryUrl", v)} placeholder="https://.../.well-known/openid-configuration" />
                <ConfigField label="Client ID" value={config.clientId} onChange={(v) => updateConfig("clientId", v)} placeholder="your-client-id" />
                <ConfigField label="Client Secret" value={config.clientSecret} onChange={(v) => updateConfig("clientSecret", v)} placeholder="your-client-secret" type="password" />
                <div className="col-span-2">
                  <ConfigField label="Redirect URI" value={config.redirectUri} onChange={(v) => updateConfig("redirectUri", v)} placeholder="https://your-app.com/auth/callback" />
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" onClick={handleSave} disabled={onUpdate.isPending}>
              {onUpdate.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Save SSO Config
            </Button>
          </div>
        </>
      )}

      {!enabled && (
        <div className="rounded-md bg-muted/30 border border-border p-4 text-center">
          <Shield className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">SSO is disabled for this organization. Enable it to configure SAML or OIDC.</p>
        </div>
      )}
    </div>
  );
}

// ─── Create Tenant Dialog ──────────────────────────────────────

function CreateTenantDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [domain, setDomain] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const createTenant = useCreateTenant();

  const handleCreate = async () => {
    if (!name || !slug) return toast.error("Name and slug are required");
    try {
      await createTenant.mutateAsync({
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        domain: domain || null,
        contact_name: contactName || null,
        contact_email: contactEmail || null,
      });
      toast.success(`Organization "${name}" created`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to create organization");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card rounded-xl border border-border shadow-xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-foreground">New Organization</h2>
        <div className="space-y-3">
          <ConfigField label="Company Name *" value={name} onChange={(v) => { setName(v); if (!slug) setSlug(v.toLowerCase().replace(/[^a-z0-9]+/g, "-")); }} placeholder="Acme Corporation" />
          <ConfigField label="Slug *" value={slug} onChange={setSlug} placeholder="acme-corp" />
          <ConfigField label="Domain" value={domain} onChange={setDomain} placeholder="acme.com" />
          <ConfigField label="Contact Name" value={contactName} onChange={setContactName} placeholder="Jane Smith" />
          <ConfigField label="Contact Email" value={contactEmail} onChange={setContactEmail} placeholder="jane@acme.com" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleCreate} disabled={createTenant.isPending}>
            {createTenant.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            Create Organization
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Sub-Tenant Form ────────────────────────────────────

function CreateSubTenantForm({ tenantId, onClose }: { tenantId: string; onClose: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [domain, setDomain] = useState("");
  const createSub = useCreateSubTenant();

  const handleCreate = async () => {
    if (!name || !slug) return toast.error("Name and slug are required");
    try {
      await createSub.mutateAsync({
        tenant_id: tenantId,
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        domain: domain || null,
      });
      toast.success(`Sub-organization "${name}" created`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to create sub-organization");
    }
  };

  return (
    <div className="rounded-md border border-accent/30 bg-accent/5 p-4 space-y-3">
      <h4 className="text-sm font-semibold text-foreground">Add Sub-Organization</h4>
      <div className="grid grid-cols-3 gap-3">
        <ConfigField label="Name *" value={name} onChange={(v) => { setName(v); if (!slug) setSlug(v.toLowerCase().replace(/[^a-z0-9]+/g, "-")); }} placeholder="Client name" />
        <ConfigField label="Slug *" value={slug} onChange={setSlug} placeholder="client-slug" />
        <ConfigField label="Domain" value={domain} onChange={setDomain} placeholder="client.com" />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={handleCreate} disabled={createSub.isPending}>
          {createSub.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />} Add
        </Button>
      </div>
    </div>
  );
}

// ─── Assign User Form ─────────────────────────────────────────

function AssignUserForm({ tenantId, existingUserIds, onClose }: { tenantId: string; existingUserIds: string[]; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState("");
  const [role, setRole] = useState<"tenant_admin" | "tenant_user">("tenant_user");
  const { data: results, isLoading } = useSearchProfiles(search);
  const assignUser = useAssignTenantUser();

  const filtered = results?.filter((p) => !existingUserIds.includes(p.id)) || [];

  const handleAssign = async () => {
    if (!selectedUserId) return toast.error("Select a user first");
    try {
      await assignUser.mutateAsync({ tenant_id: tenantId, user_id: selectedUserId, role });
      toast.success(`User assigned as ${role === "tenant_admin" ? "Admin" : "User"}`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to assign user");
    }
  };

  return (
    <div className="rounded-md border border-accent/30 bg-accent/5 p-4 space-y-3">
      <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
        <Users className="w-4 h-4 text-accent" /> Assign User to Organization
      </h4>
      <div className="grid grid-cols-3 gap-3 items-end">
        <div className="space-y-1.5 relative">
          <Label className="text-xs text-muted-foreground">Search User</Label>
          <Input
            value={selectedUserId ? selectedName : search}
            onChange={(e) => { setSearch(e.target.value); setSelectedUserId(null); setSelectedName(""); }}
            placeholder="Type name to search..."
          />
          {!selectedUserId && search.length >= 2 && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
              {isLoading ? (
                <div className="p-3 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto text-accent" /></div>
              ) : filtered.length > 0 ? (
                filtered.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedUserId(p.id); setSelectedName(p.display_name || p.id); setSearch(""); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors flex items-center justify-between"
                  >
                    <span className="font-medium text-foreground">{p.display_name || p.id}</span>
                    {p.department && <span className="text-xs text-muted-foreground">{p.department}</span>}
                  </button>
                ))
              ) : (
                <div className="p-3 text-center text-xs text-muted-foreground">No matching users found</div>
              )}
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v as "tenant_admin" | "tenant_user")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tenant_admin">Admin</SelectItem>
              <SelectItem value="tenant_user">User</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleAssign} disabled={!selectedUserId || assignUser.isPending}>
            {assignUser.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />} Assign
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Shared Components ────────────────────────────────────────

function ConfigField({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function FieldDisplay({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className="text-sm text-foreground">{value || <span className="text-muted-foreground italic">—</span>}</p>
    </div>
  );
}
