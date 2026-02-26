import { Settings as SettingsIcon, Shield, Database, Globe, Bell } from "lucide-react";

const settingSections = [
  { icon: Shield, title: "Security & SSO", desc: "Configure SSO providers, MFA, and session policies", items: ["SAML/OAuth2 SSO", "Multi-Factor Authentication", "Session Timeout", "IP Allowlisting"] },
  { icon: Database, title: "Data & Storage", desc: "Database, encryption, and backup settings", items: ["Encryption at Rest", "Backup Schedule", "Data Retention", "Export Settings"] },
  { icon: Globe, title: "Multi-Organization Configuration", desc: "Organization onboarding, isolation, and resource allocation", items: ["Organization Provisioning", "Data Isolation", "Resource Limits", "Feature Flags"] },
  { icon: Bell, title: "Notifications", desc: "Email and in-app notification preferences", items: ["Simulation Completed", "Policy Changes", "User Activity Alerts", "System Maintenance"] },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform configuration, security, and governance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {settingSections.map((section) => (
          <div key={section.title} className="bg-card rounded-lg border border-border p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <section.icon className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
                <p className="text-xs text-muted-foreground">{section.desc}</p>
              </div>
            </div>
            <div className="space-y-2">
              {section.items.map((item) => (
                <div key={item} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <span className="text-sm text-foreground">{item}</span>
                  <span className="text-xs text-accent font-medium cursor-pointer hover:underline">Configure</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
