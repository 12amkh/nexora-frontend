"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, getErrorMessage, getUser, logout } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import AgentCard from "@/components/AgentCard";
import UsageStats from "@/components/UsageStats";

interface Agent {
  id: number;
  name: string;
  description: string;
  user_id?: number;
  config?: {
    agent_type?: string;
    tone?: string;
    use_web_search?: boolean;
  };
}

interface User {
  id: number;
  name: string;
  email: string;
  plan: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingAgentId, setDeletingAgentId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      const userData = await getUser();
      if (!userData) {
        router.push("/login");
        return;
      }
      setUser(userData);

      try {
        const res = await api.get("/agents/list?limit=50");
        setAgents(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        console.error("Failed to fetch agents:", error);
        setError("Failed to load agents.");
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

  const handleDeleteAgent = async (agent: Agent) => {
    if (deletingAgentId) return;

    const confirmed = window.confirm(
      `Delete "${agent.name}"?\n\nThis will also remove its conversation history and cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingAgentId(agent.id);
    setError("");

    try {
      await api.delete(`/agents/${agent.id}`);
      setAgents((prev) => prev.filter((item) => item.id !== agent.id));
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setDeletingAgentId(null);
    }
  };

  if (loading || !user) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
        <Sidebar />
        <main style={{ marginLeft: 220, flex: 1, padding: "40px 48px", color: "var(--text)" }}>Loading...</main>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: "40px 48px" }}>
        <div style={{ maxWidth: 1400 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 20,
              marginBottom: 28,
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: "var(--text)",
                  margin: "0 0 8px",
                  letterSpacing: "-0.03em",
                }}
              >
                Dashboard
              </h1>
              <p style={{ color: "var(--text-2)", margin: 0, fontSize: 16 }}>
                Welcome back, {user.name}!
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span
                style={{
                  color: "var(--text-2)",
                  fontSize: 14,
                  background: "var(--accent-g)",
                  padding: "6px 12px",
                  borderRadius: 999,
                }}
              >
                {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
              </span>
              <button
                onClick={handleLogout}
                style={{
                  padding: "8px 14px",
                  color: "var(--text-2)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                Sign Out
              </button>
            </div>
          </div>

          <UsageStats />

          {error && (
            <div
              style={{
                marginBottom: 20,
                background: "rgba(248,113,113,0.1)",
                border: "1px solid var(--red)",
                borderRadius: 12,
                color: "var(--red)",
                padding: "12px 16px",
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}

          <section>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
                marginBottom: 22,
              }}
            >
              <h2
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "var(--text)",
                  margin: 0,
                }}
              >
                Your Agents
              </h2>
              <Link
                href="/agents/new"
                style={{
                  padding: "10px 18px",
                  background: "var(--accent)",
                  color: "#fff",
                  borderRadius: 10,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Create Agent
              </Link>
            </div>

            {agents.length === 0 ? (
              <div
                style={{
                  background: "var(--bg-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 16,
                  padding: "48px 24px",
                  textAlign: "center",
                }}
              >
                <p style={{ color: "var(--text-2)", margin: "0 0 16px", fontSize: 16 }}>
                  No agents yet.
                </p>
                <Link
                  href="/agents/new"
                  style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}
                >
                  Create your first agent →
                </Link>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: 20,
                }}
              >
                {agents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    onDelete={handleDeleteAgent}
                    deleting={deletingAgentId === agent.id}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
