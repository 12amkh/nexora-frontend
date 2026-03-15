"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getUser, logout } from "@/lib/api";

const PLAN_COLORS: Record<string, string> = {
  free: "#8888a0",
  starter: "#34d399",
  pro: "#6c63ff",
  business: "#f59e0b",
  enterprise: "#ec4899",
};

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/agents/new", label: "New Agent" },
  { href: "/schedules", label: "Schedules" },
  { href: "/settings", label: "Settings" },
  { href: "/admin", label: "Admin" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = getUser();
  const plan = user?.plan ?? "free";

  return (
    <aside className="fixed left-0 top-0 z-10 flex min-h-screen w-[220px] flex-col border-r border-border bg-bg-2 px-4 py-5">
      <Link
        href="/dashboard"
        className="mb-5 block px-3 py-2 text-xl font-extrabold tracking-tight text-text"
      >
        Nexora
      </Link>

      <nav className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm transition ${
                isActive
                  ? "bg-accent/15 text-accent"
                  : "text-text-2 hover:bg-bg-3 hover:text-text"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-border pt-4">
        <div className="px-3 pb-3">
          <p className="truncate text-sm font-semibold text-text">
            {user?.name || user?.email || "Nexora User"}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: PLAN_COLORS[plan] || PLAN_COLORS.free }}
            />
            <span className="text-xs capitalize text-text-2">{plan} plan</span>
          </div>
        </div>

        <button
          onClick={() => {
            logout();
            router.push("/login");
          }}
          className="w-full rounded-lg px-3 py-2 text-left text-sm text-text-3 transition hover:bg-bg-3 hover:text-text"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
