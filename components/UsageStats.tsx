"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppStateCard, StateActionButton } from "@/components/AppState";
import { api, formatPlanName, normalizePlan } from "@/lib/api";

interface UsageStatsData {
  plan: string;
  messages_used: number;
  messages_limit: number | null;
  messages_percent: number;
  agents_used: number;
  agents_limit: number | null;
  agents_percent: number;
  schedules_used: number;
  schedules_limit: number | null;
  schedules_percent: number;
  billing_month_start: string;
  billing_month_end: string;
}

function getColor(percent: number) {
  if (percent >= 90) return "#f87171";
  if (percent >= 70) return "#fbbf24";
  return "#34d399";
}

function formatDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function MetricBar({
  label,
  used,
  limit,
  percent,
}: {
  label: string;
  used: number;
  limit: number | null;
  percent: number;
}) {
  const isUnlimited = limit === null;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <span style={{ color: "var(--text-2)", fontSize: 14 }}>{label}</span>
        <span style={{ color: "var(--text)", fontWeight: 700, fontSize: 15 }}>
          {isUnlimited ? `${used}/Unlimited` : `${used}/${limit}`}
        </span>
      </div>
      <div
        style={{
          width: "100%",
          height: 12,
          background: "var(--bg-3)",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.min(percent, 100)}%`,
            height: "100%",
            background: getColor(percent),
            borderRadius: 999,
          }}
        />
      </div>
      <div style={{ color: "var(--text-3)", fontSize: 13, marginTop: 8 }}>
        {isUnlimited ? "Unlimited" : `${Math.max(limit - used, 0)} remaining`}
      </div>
    </div>
  );
}

export default function UsageStats() {
  const [stats, setStats] = useState<UsageStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/usage/stats");
      setStats(res.data.data);
    } catch (fetchError) {
      console.error("Failed to fetch usage stats:", fetchError);
      setError("We couldn't load your usage right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStats();
  }, []);

  if (loading) {
    return (
      <div style={{ color: "var(--text-2)", fontSize: 14, padding: "1rem 0" }}>
        Loading usage...
      </div>
    );
  }

  if (error) {
    return (
      <AppStateCard
        eyebrow="Usage unavailable"
        icon="📊"
        title="Usage details are temporarily unavailable"
        description="Your account is still active, but Nexora couldn't load the latest usage metrics. Try again to refresh your plan data."
        tone="error"
        actions={<StateActionButton label="Retry usage" onClick={() => void fetchStats()} />}
      />
    );
  }

  if (!stats) {
    return (
      <AppStateCard
        eyebrow="Usage unavailable"
        icon="📈"
        title="No usage data yet"
        description="Usage totals will appear here after Nexora has enough activity to summarize your current billing period."
        tone="neutral"
        compact
      />
    );
  }

  const shouldWarn =
    stats.messages_percent >= 80 ||
    stats.agents_percent >= 80 ||
    stats.schedules_percent >= 80;
  const plan = normalizePlan(stats.plan);

  return (
    <section
      className="usage-stats-shell"
      style={{
        width: "100%",
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <h2
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: "var(--text)",
            margin: "0 0 8px",
          }}
        >
          Usage & Limits
        </h2>
        <p style={{ color: "var(--text-2)", fontSize: 15, margin: 0 }}>
          Plan:{" "}
          <span style={{ color: "var(--accent)" }}>
            {formatPlanName(plan)}
          </span>
          {" "}• Billing period: {formatDate(stats.billing_month_start)} –{" "}
          {formatDate(stats.billing_month_end)}
        </p>
      </div>

      <div
        className="usage-stats-grid"
        style={{
          width: "100%",
        }}
      >
        <MetricBar
          label="Messages This Month"
          used={stats.messages_used}
          limit={stats.messages_limit}
          percent={stats.messages_percent}
        />
        <MetricBar
          label="Agents"
          used={stats.agents_used}
          limit={stats.agents_limit}
          percent={stats.agents_percent}
        />
        <MetricBar
          label="Schedules"
          used={stats.schedules_used}
          limit={stats.schedules_limit}
          percent={stats.schedules_percent}
        />
      </div>

      {shouldWarn && (
        <div
          style={{
            marginTop: 20,
            padding: "14px 16px",
            borderRadius: 10,
            border: "1px solid rgba(248,113,113,0.35)",
            background: "rgba(248,113,113,0.08)",
            color: "var(--red)",
            fontSize: 14,
          }}
        >
          You&apos;re approaching your plan limits. Upgrade to continue using Nexora without restrictions.
          <Link
            href="/dashboard/upgrade"
            style={{
              marginLeft: 8,
              color: "var(--text)",
              fontWeight: 700,
              textDecoration: "underline",
            }}
          >
            View plans
          </Link>
        </div>
      )}
    </section>
  );
}
