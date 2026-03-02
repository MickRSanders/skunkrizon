import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, Clock, Info, AlertTriangle, X, Loader2, Settings, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDismissNotification,
} from "@/hooks/useNotifications";
import {
  useNotificationPreferences,
  useToggleNotificationPreference,
  NOTIFICATION_TYPES,
} from "@/hooks/useNotificationPreferences";
import { Switch } from "@/components/ui/switch";
import { formatDistanceToNow } from "date-fns";

const typeIcon: Record<string, typeof Info> = {
  info: Info,
  success: Check,
  warning: AlertTriangle,
};

const typeColor: Record<string, string> = {
  info: "text-info bg-info/10",
  success: "text-success bg-success/10",
  warning: "text-warning bg-warning/10",
};

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data: notifications = [], isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const dismiss = useDismissNotification();

  const { data: prefs = [], isLoading: prefsLoading } = useNotificationPreferences();
  const togglePref = useToggleNotificationPreference();

  // Build disabled set
  const disabledTypes = new Set<string>();
  prefs.forEach((p) => { if (!p.enabled) disabledTypes.add(p.entity_type); });

  // Filter notifications by preferences
  const filteredNotifications = notifications.filter(
    (n) => !n.entity_type || !disabledTypes.has(n.entity_type)
  );

  const unreadCount = filteredNotifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowSettings(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleClick = (n: typeof notifications[0]) => {
    if (!n.read) markRead.mutate(n.id);
    if (n.entity_type === "simulation" && n.entity_id) navigate("/simulations");
    else if (n.entity_type === "policy" && n.entity_id) navigate("/policies");
    setOpen(false);
    setShowSettings(false);
  };

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dismiss.mutate(id);
  };

  const isEnabled = (entityType: string) => {
    const pref = prefs.find((p) => p.entity_type === entityType);
    return pref ? pref.enabled : true; // default enabled
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); setShowSettings(false); }}
        className="relative p-2 rounded-md hover:bg-muted transition-colors"
      >
        <Bell className="w-4 h-4 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-accent border-2 border-card" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-sm bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              {showSettings && (
                <button onClick={() => setShowSettings(false)} className="p-0.5 rounded hover:bg-muted transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
              <h3 className="text-sm font-semibold text-foreground">
                {showSettings ? "Notification Settings" : "Notifications"}
              </h3>
              {!showSettings && unreadCount > 0 && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-accent/10 text-accent">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!showSettings && unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="text-[11px] text-muted-foreground hover:text-accent transition-colors"
                >
                  Mark all read
                </button>
              )}
              {!showSettings && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-1 rounded hover:bg-muted transition-colors"
                  title="Notification settings"
                >
                  <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {showSettings ? (
            /* ─── Settings panel ─── */
            <div className="p-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                Choose which updates appear in your activity feed and notifications.
              </p>
              {NOTIFICATION_TYPES.map((nt) => (
                <div key={nt.key} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{nt.label}</p>
                    <p className="text-[11px] text-muted-foreground">{nt.description}</p>
                  </div>
                  <Switch
                    checked={isEnabled(nt.key)}
                    disabled={prefsLoading || togglePref.isPending}
                    onCheckedChange={(checked) =>
                      togglePref.mutate({ entityType: nt.key, enabled: checked })
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            /* ─── Notification list ─── */
            <div className="max-h-80 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Bell className="w-8 h-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No notifications</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    You'll be notified when simulations complete or policies change.
                  </p>
                </div>
              ) : (
                filteredNotifications.map((n) => {
                  const Icon = typeIcon[n.type] || Info;
                  const color = typeColor[n.type] || typeColor.info;
                  const timeAgo = formatDistanceToNow(new Date(n.created_at), { addSuffix: true });

                  return (
                    <div
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={cn(
                        "flex gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-border/50 last:border-0 group",
                        n.read ? "bg-popover hover:bg-muted/30" : "bg-accent/5 hover:bg-accent/10"
                      )}
                    >
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5", color)}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn("text-[13px] leading-tight", n.read ? "text-foreground/70" : "text-foreground font-medium")}>
                            {n.title}
                          </p>
                          <button
                            onClick={(e) => handleDismiss(n.id, e)}
                            className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-muted text-muted-foreground hover:text-foreground transition-all shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{n.message}</p>
                        <div className="flex items-center gap-1 mt-1.5">
                          <Clock className="w-2.5 h-2.5 text-muted-foreground/50" />
                          <span className="text-[10px] text-muted-foreground/50">{timeAgo}</span>
                          {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-accent ml-1" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
