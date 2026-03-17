"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getUser, logout } from "@/lib/api";
import Sidebar from "@/components/Sidebar";

interface PlatformStats {
  total_users: number;
  active_users: number;
  users_by_plan: {
    free: number;
    starter: number;
    pro: number;
    business: number;
    enterprise: number;
  };
  total_agents: number;
  total_schedules: number;
  messages_this_month: number;
  new_users_this_week: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const user = await getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Try to fetch admin stats
      try {
        const res = await api.get("/admin/stats");
        setStats(res.data.data);
      } catch (error: unknown) {
        if (
          typeof error === "object" &&
          error !== null &&
          "response" in error &&
          typeof (error as { response?: { status?: number } }).response?.status === "number" &&
          (error as { response?: { status?: number } }).response?.status === 403
        ) {
          // Not an admin
          router.push("/dashboard");
        }
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (loading || !stats) {
    return (
      <div className="flex min-h-screen bg-bg">
        <Sidebar />
        <div className="flex-1 pl-[220px]">
          <div className="p-8 text-text">Loading...</div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Users",
      value: stats.total_users,
      color: "#6c63ff",
    },
    {
      label: "Active Users",
      value: stats.active_users,
      color: "#34d399",
    },
    {
      label: "Total Agents",
      value: stats.total_agents,
      color: "#f59e0b",
    },
    {
      label: "Total Schedules",
      value: stats.total_schedules,
      color: "#ec4899",
    },
    {
      label: "Messages This Month",
      value: stats.messages_this_month.toLocaleString(),
      color: "#8b5cf6",
    },
    {
      label: "New Users This Week",
      value: stats.new_users_this_week,
      color: "#14b8a6",
    },
  ];

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <div className="flex-1 pl-[220px]">
        <div className="p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-text mb-2">Admin Dashboard</h1>
              <p className="text-text-2">Platform overview & management</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-text-2 hover:text-text transition"
            >
              Sign Out
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="bg-bg-2 border border-border rounded-lg p-6"
              >
                <p className="text-text-2 text-sm mb-2">{card.label}</p>
                <div className="flex items-end justify-between">
                  <p className="text-4xl font-bold text-text">{card.value}</p>
                  <div
                    className="w-12 h-12 rounded-lg opacity-20"
                    style={{ backgroundColor: card.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Users by Plan */}
          <div className="bg-bg-2 border border-border rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-text mb-6">Users by Plan</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { plan: "Free", count: stats.users_by_plan.free, color: "#8888a0" },
                { plan: "Starter", count: stats.users_by_plan.starter, color: "#6c63ff" },
                { plan: "Pro", count: stats.users_by_plan.pro, color: "#34d399" },
                { plan: "Business", count: stats.users_by_plan.business, color: "#f59e0b" },
                { plan: "Enterprise", count: stats.users_by_plan.enterprise, color: "#ec4899" },
              ].map((planData) => (
                <div key={planData.plan} className="text-center">
                  <p
                    className="text-3xl font-bold mb-2"
                    style={{ color: planData.color }}
                  >
                    {planData.count}
                  </p>
                  <p className="text-text-2 text-sm">{planData.plan}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-bg-2 border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-text mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => router.push("/admin/users")}
                className="px-4 py-3 bg-accent text-bg rounded-lg font-medium hover:bg-accent/90 transition text-left"
              >
                👥 Manage Users
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="px-4 py-3 bg-accent/20 text-accent rounded-lg font-medium hover:bg-accent/30 transition text-left"
              >
                ↩ Back to App
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
