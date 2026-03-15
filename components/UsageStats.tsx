"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface UsageStats {
  plan: string;
  messages_used: number;
  messages_limit: number;
  messages_percent: number;
  agents_used: number;
  agents_limit: number;
  agents_percent: number;
  schedules_used: number;
  schedules_limit: number;
  schedules_percent: number;
  billing_month_start: string;
  billing_month_end: string;
}

export default function UsageStats() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get("/usage/stats");
      setStats(res.data.data);
    } catch (error) {
      console.error("Failed to fetch usage stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-text-2">Loading usage...</div>;
  }

  if (!stats) {
    return null;
  }

  const getColor = (percent: number) => {
    if (percent >= 90) return "#f87171"; // red
    if (percent >= 70) return "#fbbf24"; // amber
    return "#34d399"; // green
  };

  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="bg-bg-2 border border-border rounded-lg p-6 mb-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-text mb-2">
          Usage &amp; Limits
        </h2>
        <p className="text-text-3 text-sm">
          Plan: <span className="text-accent capitalize">{stats.plan}</span>
          {" "}• Billing period: {formatDate(stats.billing_month_start)} –{" "}
          {formatDate(stats.billing_month_end)}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Messages */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-text-2 text-sm">Messages This Month</span>
            <span className="text-text font-semibold">
              {stats.messages_used}/{stats.messages_limit}
            </span>
          </div>
          <div className="w-full bg-bg-3 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${Math.min(stats.messages_percent, 100)}%`,
                backgroundColor: getColor(stats.messages_percent),
              }}
            />
          </div>
          <p className="text-text-3 text-xs mt-2">
            {stats.messages_limit - stats.messages_used} remaining
          </p>
        </div>

        {/* Agents */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-text-2 text-sm">Agents</span>
            <span className="text-text font-semibold">
              {stats.agents_used}/{stats.agents_limit}
            </span>
          </div>
          <div className="w-full bg-bg-3 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${Math.min(stats.agents_percent, 100)}%`,
                backgroundColor: getColor(stats.agents_percent),
              }}
            />
          </div>
          <p className="text-text-3 text-xs mt-2">
            {stats.agents_limit - stats.agents_used} remaining
          </p>
        </div>

        {/* Schedules */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-text-2 text-sm">Schedules</span>
            <span className="text-text font-semibold">
              {stats.schedules_used}/{stats.schedules_limit}
            </span>
          </div>
          <div className="w-full bg-bg-3 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${Math.min(stats.schedules_percent, 100)}%`,
                backgroundColor: getColor(stats.schedules_percent),
              }}
            />
          </div>
          <p className="text-text-3 text-xs mt-2">
            {stats.schedules_limit - stats.schedules_used} remaining
          </p>
        </div>
      </div>

      {(stats.messages_percent >= 80 ||
        stats.agents_percent >= 80 ||
        stats.schedules_percent >= 80) && (
        <div className="mt-6 p-4 bg-red/20 border border-red/40 rounded text-red text-sm">
          ⚠️ You're approaching your plan limits. Upgrade to continue using
          Nexora without restrictions.
        </div>
      )}
    </div>
  );
}