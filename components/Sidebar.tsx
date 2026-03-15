"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getUser, logout } from "@/lib/api";

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
  { href: "/settings", label: "⚙️  Settings" },
  { href: "/admin", label: "🛠  Admin" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const user = getUser();
  const plan = user?.plan ?? "free";

  return (
    <aside
      style={{
        width: 220,
        minHeight: "100vh",
        background: "var(--bg-2)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        padding: "20px 16px",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 10,
      }}
    >
      <Link
        href="/dashboard"
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

      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
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
                textTransform: "capitalize",
              }}
            >
              {plan} plan
            </span>
          </div>
        </div>

        <button
          onClick={logout}
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
  );
}
