import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Auth() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
        toast.success("Signed in successfully");
      } else {
        await signUp(email, password, displayName);
        toast.success("Account created! You're signed in.");
      }
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Horizon by Topia</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "login" ? "Sign in to your account" : "Create a new account"}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Display Name</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Password</Label>
            <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {mode === "login" ? "Sign In" : "Create Account"}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button type="button" className="text-accent hover:underline font-medium" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
