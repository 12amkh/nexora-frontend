"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { formatPlanName, getUser, logout, normalizePlan, refreshCurrentUser, type CurrentUser } from "@/lib/api";

const PLAN_COLORS: Record<string, string> = {
  free: "#8888a0",
  starter: "#34d399",
  pro: "#6c63ff",
  business: "#f59e0b",
  enterprise: "#ec4899",
};

const NAV_ITEMS = [
  { href: "/dashboard", label: "🤖  Agents" },
  { href: "/schedules", label: "⏰  Schedules" },
  { href: "/admin", label: "🛠  Admin" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null>(() => getUser());
  const [canSeeAdmin, setCanSeeAdmin] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const plan = normalizePlan(user?.plan);
  const navItems = NAV_ITEMS.filter((item) => item.href !== "/admin" || canSeeAdmin);
  const settingsIsActive = pathname === "/settings";

  useEffect(() => {
    let active = true;

    refreshCurrentUser()
      .then((nextUser) => {
        if (active && nextUser) {
          setUser(nextUser);
          setCanSeeAdmin(nextUser.is_admin === true);
        }
      })
      .catch(() => {
        // Keep cached user data if the refresh fails.
        if (active) {
          setCanSeeAdmin(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

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
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

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
      <Link
        href="/dashboard"
        onClick={() => setIsOpen(false)}
        style={{
          fontWeight: 800,
          fontSize: "1.2rem",
          letterSpacing: "-0.03em",
          padding: "0.5rem 0.75rem",
          display: "block",
          marginBottom: "1.25rem",
          color: "var(--text)",
          textDecoration: "none",
        }}
      >
        Nexora
      </Link>

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
            {user?.name || user?.email || "Nexora User"}
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
