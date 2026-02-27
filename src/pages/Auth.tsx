import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";

type TenantInfo = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};

const PENDING_TENANT_KEY = "horizon_pending_tenant_id";

export default function Auth() {
  const { slug } = useParams<{ slug?: string }>();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [tenantLoading, setTenantLoading] = useState(!!slug);
  const [tenantError, setTenantError] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  // Look up tenant by slug
  useEffect(() => {
    if (!slug) {
      setTenantLoading(false);
      return;
    }
    (async () => {
      setTenantLoading(true);
      setTenantError(false);
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, slug, logo_url")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (error || !data) {
        setTenantError(true);
      } else {
        setTenantInfo(data);
      }
      setTenantLoading(false);
    })();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset email sent. Check your inbox.");
        setMode("login");
      } else if (mode === "login") {
        // Store pending tenant so TenantContext auto-selects it after login
        if (tenantInfo) {
          localStorage.setItem(PENDING_TENANT_KEY, tenantInfo.id);
        }
        await signIn(email, password);
        toast.success("Signed in successfully");
        navigate("/");
      } else {
        if (tenantInfo) {
          localStorage.setItem(PENDING_TENANT_KEY, tenantInfo.id);
        }
        await signUp(email, password, displayName);
        toast.success("Account created! You're signed in.");
        navigate("/");
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  if (tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (slug && tenantError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4">
          <h1 className="text-xl font-semibold text-foreground">Organization not found</h1>
          <p className="text-sm text-muted-foreground">
            No active organization matches <span className="font-mono text-foreground">/{slug}</span>.
          </p>
          <Button variant="outline" onClick={() => navigate("/auth")}>
            Go to default login
          </Button>
        </div>
      </div>
    );
  }

  const brandName = tenantInfo?.name ?? "Horizon by Topia";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          {tenantInfo?.logo_url ? (
            <img
              src={tenantInfo.logo_url}
              alt={tenantInfo.name}
              className="h-10 mx-auto mb-3 object-contain"
            />
          ) : null}
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{brandName}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "login"
              ? "Sign in to your account"
              : mode === "signup"
              ? "Create a new account"
              : "Reset your password"}
          </p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm"
        >
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Display Name</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>
          {mode !== "forgot" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Password</Label>
              <Input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Link"}
          </Button>
          {mode === "login" && (
            <p className="text-xs text-center">
              <button
                type="button"
                className="text-accent hover:underline font-medium"
                onClick={() => setMode("forgot")}
              >
                Forgot your password?
              </button>
            </p>
          )}
          {mode === "forgot" && (
            <p className="text-xs text-center">
              <button
                type="button"
                className="text-accent hover:underline font-medium inline-flex items-center gap-1"
                onClick={() => setMode("login")}
              >
                <ArrowLeft className="w-3 h-3" /> Back to sign in
              </button>
            </p>
          )}
          <p className="text-xs text-center text-muted-foreground">
            {mode === "login"
              ? "Don't have an account?"
              : mode === "signup"
              ? "Already have an account?"
              : ""}{" "}
            {mode !== "forgot" && (
              <button
                type="button"
                className="text-accent hover:underline font-medium"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
              >
                {mode === "login" ? "Sign up" : "Sign in"}
              </button>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
