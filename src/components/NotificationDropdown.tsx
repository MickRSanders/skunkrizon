import { useState, useRef, useEffect } from "react";
import { Bell, Check, Clock, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning";
  time: string;
  read: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    title: "Simulation Completed",
    message: "Cost simulation SIM-2024-042 has finished processing.",
    type: "success",
    time: "5 min ago",
    read: false,
  },
  {
    id: "2",
    title: "Policy Update",
    message: "Global Mobility Policy v3.2 was published by Admin.",
    type: "info",
    time: "1 hour ago",
    read: false,
  },
  {
    id: "3",
    title: "Exchange Rate Alert",
    message: "GBP/USD rate changed by more than 2% since last sync.",
    type: "warning",
    time: "3 hours ago",
    read: false,
  },
  {
    id: "4",
    title: "New User Joined",
    message: "sarah.chen@cartus.com was added to the workspace.",
    type: "info",
    time: "Yesterday",
    read: true,
  },
];

const typeIcon = {
  info: Info,
  success: Check,
  warning: AlertTriangle,
};

const typeColor = {
  info: "text-info bg-info/10",
  success: "text-success bg-success/10",
  warning: "text-warning bg-warning/10",
};

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const dismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-md hover:bg-muted transition-colors"
      >
        <Bell className="w-4 h-4 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-accent border-2 border-card" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-accent/10 text-accent">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] text-muted-foreground hover:text-accent transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Bell className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No notifications</p>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = typeIcon[n.type];
                return (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={cn(
                      "flex gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-border/50 last:border-0 group",
                      n.read ? "bg-popover hover:bg-muted/30" : "bg-accent/5 hover:bg-accent/10"
                    )}
                  >
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5", typeColor[n.type])}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-[13px] leading-tight", n.read ? "text-foreground/70" : "text-foreground font-medium")}>
                          {n.title}
                        </p>
                        <button
                          onClick={(e) => dismiss(n.id, e)}
                          className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-muted text-muted-foreground hover:text-foreground transition-all shrink-0"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{n.message}</p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <Clock className="w-2.5 h-2.5 text-muted-foreground/50" />
                        <span className="text-[10px] text-muted-foreground/50">{n.time}</span>
                        {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-accent ml-1" />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
