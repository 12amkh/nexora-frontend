"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { api, formatPlanName, getUser, logout, normalizePlan, refreshCurrentUser, type CurrentUser } from "@/lib/api";

const PLAN_COLORS: Record<string, string> = {
  free: "#8888a0",
  starter: "#34d399",
  pro: "#6c63ff",
  business: "#f59e0b",
  enterprise: "#ec4899",
};

const NAV_ITEMS = [
  { href: "/dashboard", label: "🤖  Agents" },
  { href: "/startup-ideas", label: "💡  Startup Ideas" },
  { href: "/workflows", label: "🔗  Workflows" },
  { href: "/marketplace", label: "🛍️  Marketplace" },
  { href: "/schedules", label: "⏰  Schedules" },
  { href: "/admin", label: "🛠  Admin" },
];

const subscribe = () => () => {};
const getServerHydratedSnapshot = () => false;
const getClientHydratedSnapshot = () => true;

type NotificationItem = {
  id: number;
  agent_id: number | null;
  report_id: number | null;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffMinutes < 1440) return `${Math.round(diffMinutes / 60)}h ago`;
  if (diffMinutes < 10080) return `${Math.round(diffMinutes / 1440)}d ago`;
  return date.toLocaleDateString();
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const notificationButtonRef = useRef<HTMLButtonElement | null>(null);
  const isHydrated = useSyncExternalStore(subscribe, getClientHydratedSnapshot, getServerHydratedSnapshot);
  const cachedUser = isHydrated ? getUser() : null;
  const resolvedUser = user ?? cachedUser;
  const canSeeAdmin = resolvedUser?.is_admin === true;
  const plan = normalizePlan(resolvedUser?.plan);
  const navItems = NAV_ITEMS.filter((item) => item.href !== "/admin" || canSeeAdmin);
  const settingsIsActive = pathname === "/settings";

  useEffect(() => {
    let active = true;

    refreshCurrentUser()
      .then((nextUser) => {
        if (active && nextUser) {
          setUser(nextUser);
        }
      })
      .catch(() => {
        // Keep cached user data if the refresh fails.
      });

    return () => {
      active = false;
    };
  }, []);

  const loadNotifications = async () => {
    setNotificationsLoading(true);
    try {
      const { data } = await api.get("/notifications/list?limit=8");
      setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
      setUnreadCount(typeof data?.unread_count === "number" ? data.unread_count : 0);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setNotificationsLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, [pathname]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = previousOverflow || "";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setNotificationsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!notificationsRef.current) return;
      if (!notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!notificationsOpen) return;

    const updatePosition = () => {
      if (!notificationButtonRef.current || !notificationsRef.current) return;

      const triggerRect = notificationButtonRef.current.getBoundingClientRect();
      const dropdown = notificationsRef.current.querySelector("[data-notifications-panel='true']") as HTMLDivElement | null;
      if (!dropdown) return;

      const panelWidth = Math.min(360, window.innerWidth - 32);
      const left = Math.min(
        Math.max(16, triggerRect.right - panelWidth),
        window.innerWidth - panelWidth - 16
      );

      dropdown.style.top = `${triggerRect.bottom + 10}px`;
      dropdown.style.left = `${left}px`;
      dropdown.style.width = `${panelWidth}px`;
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [notificationsOpen]);

  const unreadLabel = useMemo(() => {
    if (unreadCount <= 0) return null;
    return unreadCount > 9 ? "9+" : String(unreadCount);
  }, [unreadCount]);

  const handleOpenNotifications = async () => {
    setNotificationsOpen((current) => !current);
    if (!notificationsOpen) {
      await loadNotifications();
    }
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    try {
      if (!notification.is_read) {
        await api.post(`/notifications/${notification.id}/read`);
      }
    } catch {
      // Keep navigation working even if read tracking fails.
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, is_read: true } : item
      )
    );
    setUnreadCount((current) => Math.max(0, notification.is_read ? current : current - 1));
    setNotificationsOpen(false);
    setIsOpen(false);

    if (notification.agent_id) {
      const search = new URLSearchParams();
      if (notification.report_id) {
        search.set("tab", "reports");
        search.set("report", String(notification.report_id));
      }
      router.push(`/agents/${notification.agent_id}${search.toString() ? `?${search.toString()}` : ""}`);
    }
  };

  const handleMarkAllRead = async () => {
    if (!unreadCount || markingAllRead) return;

    setMarkingAllRead(true);
    try {
      await api.post("/notifications/read-all");
      setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
    } finally {
      setMarkingAllRead(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="sidebar-mobile-toggle"
        aria-label={isOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? "×" : "☰"}
      </button>
      <div className="sidebar-overlay" data-open={isOpen} onClick={() => setIsOpen(false)} />
      <aside className="sidebar-shell" data-open={isOpen}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: "1.25rem",
          padding: "0 0.25rem",
        }}
      >
        <Link
          href="/dashboard"
          onClick={() => setIsOpen(false)}
          style={{
            fontWeight: 800,
            fontSize: "1.2rem",
            letterSpacing: "-0.03em",
            padding: "0.5rem 0.5rem",
            display: "block",
            color: "var(--text)",
            textDecoration: "none",
          }}
        >
          Nexora
        </Link>
        <div ref={notificationsRef} style={{ position: "relative" }}>
          <button
            ref={notificationButtonRef}
            type="button"
            onClick={() => void handleOpenNotifications()}
            aria-label="Open notifications"
            style={{
              position: "relative",
              width: 40,
              height: 40,
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: notificationsOpen ? "var(--bg-3)" : "transparent",
              color: "var(--text)",
              cursor: "pointer",
              fontSize: 17,
            }}
          >
            🔔
            {unreadLabel && (
              <span
                style={{
                  position: "absolute",
                  top: -2,
                  right: -2,
                  minWidth: 18,
                  height: 18,
                  padding: "0 5px",
                  borderRadius: 999,
                  background: "var(--accent)",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 800,
                  display: "grid",
                  placeItems: "center",
                  lineHeight: 1,
                }}
              >
                {unreadLabel}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div
              data-notifications-panel="true"
              className="app-modal-card"
              style={{
                position: "fixed",
                top: 70,
                left: 16,
                width: 340,
                maxWidth: "calc(100vw - 32px)",
                padding: 16,
                zIndex: 1300,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <div>
                  <div style={{ color: "var(--text)", fontWeight: 700, fontSize: 15 }}>Notifications</div>
                  <div style={{ color: "var(--text-3)", fontSize: 12 }}>
                    {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount === 1 ? "" : "s"}` : "You're all caught up"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleMarkAllRead()}
                  disabled={!unreadCount || markingAllRead}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: unreadCount ? "var(--accent)" : "var(--text-3)",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: !unreadCount || markingAllRead ? "default" : "pointer",
                  }}
                >
                  {markingAllRead ? "Marking..." : "Mark all read"}
                </button>
              </div>

              <div style={{ display: "grid", gap: 10, maxHeight: 380, overflowY: "auto" }}>
                {notificationsLoading ? (
                  <div style={{ color: "var(--text-3)", fontSize: 13, padding: "8px 2px" }}>Loading notifications...</div>
                ) : notifications.length === 0 ? (
                  <div
                    style={{
                      padding: "14px 12px",
                      borderRadius: 14,
                      background: "var(--bg-3)",
                      border: "1px solid var(--border)",
                      color: "var(--text-2)",
                      fontSize: 13,
                      lineHeight: 1.6,
                    }}
                  >
                    New saved reports and important insights from your agents will show up here.
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => void handleNotificationClick(notification)}
                      style={{
                        textAlign: "left",
                        padding: "12px 12px 11px",
                        borderRadius: 14,
                        border: notification.is_read ? "1px solid var(--border)" : "1px solid rgba(217,121,85,0.28)",
                        background: notification.is_read ? "var(--bg-3)" : "rgba(217,121,85,0.08)",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 10,
                          marginBottom: 6,
                        }}
                      >
                        <div style={{ color: "var(--text)", fontWeight: 700, fontSize: 13, lineHeight: 1.4 }}>
                          {notification.title}
                        </div>
                        <div style={{ color: "var(--text-3)", fontSize: 11, whiteSpace: "nowrap" }}>
                          {formatNotificationTime(notification.created_at)}
                        </div>
                      </div>
                      <div style={{ color: "var(--text-2)", fontSize: 12, lineHeight: 1.6 }}>
                        {notification.message}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setIsOpen(false)}
            style={{
              display: "block",
              padding: "0.5rem 0.75rem",
              borderRadius: 7,
              fontSize: "0.875rem",
              fontWeight: isActive ? 600 : 400,
              background: isActive ? "var(--accent-g)" : "transparent",
              color: isActive ? "var(--text)" : "var(--text-2)",
              border: isActive
                ? "1px solid rgba(108,99,255,0.2)"
                : "1px solid transparent",
              marginBottom: "0.1rem",
              textDecoration: "none",
            }}
          >
            {item.label}
          </Link>
        );
      })}

      <div
        style={{
          marginTop: "auto",
          borderTop: "1px solid var(--border)",
          paddingTop: "1rem",
        }}
      >
        <div style={{ padding: "0.5rem 0.75rem" }}>
          <div
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--text)",
              marginBottom: "0.15rem",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {resolvedUser?.name || resolvedUser?.email || "Nexora User"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: PLAN_COLORS[plan] || PLAN_COLORS.free,
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--text-2)",
              }}
            >
              {formatPlanName(plan)} plan
            </span>
          </div>
        </div>

        <Link
          href="/settings"
          onClick={() => setIsOpen(false)}
          style={{
            display: "block",
            padding: "0.5rem 0.75rem",
            borderRadius: 7,
            fontSize: "0.875rem",
            fontWeight: settingsIsActive ? 600 : 400,
            background: settingsIsActive ? "var(--accent-g)" : "transparent",
            color: settingsIsActive ? "var(--text)" : "var(--text-2)",
            border: settingsIsActive
              ? "1px solid rgba(108,99,255,0.2)"
              : "1px solid transparent",
            marginBottom: 4,
            textDecoration: "none",
          }}
        >
          ⚙️  Settings
        </Link>

        <button
          onClick={() => {
            setIsOpen(false);
            logout();
          }}
          style={{
            width: "100%",
            textAlign: "left",
            padding: "0.5rem 0.75rem",
            background: "transparent",
            border: "none",
            color: "var(--text-3)",
            fontSize: "0.85rem",
            cursor: "pointer",
            borderRadius: 6,
          }}
        >
          Sign out
        </button>
      </div>
      </aside>
    </>
  );
}
