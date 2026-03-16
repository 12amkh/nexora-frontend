"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, formatPlanName, getErrorMessage, getUser, logout, refreshCurrentUser } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import AgentCard from "@/components/AgentCard";
import ConfirmDialog from "@/components/ConfirmDialog";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [loading, setLoading] = useState(true);
  const [deletingAgentId, setDeletingAgentId] = useState<number | null>(null);
  const [agentPendingDelete, setAgentPendingDelete] = useState<Agent | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      const cachedUser = getUser();
      if (!cachedUser) {
        router.push("/login");
        return;
      }
      setUser(cachedUser);

      let userData = cachedUser;
      try {
        const freshUser = await refreshCurrentUser();
        if (freshUser) {
          userData = freshUser;
          setUser(freshUser);
        }
      } catch {
        // Non-fatal: keep rendering with cached user data.
      }

      if (!userData) {
        router.push("/login");
        return;
      }

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
    setAgentPendingDelete(agent);
  };

  const confirmDeleteAgent = async () => {
    if (!agentPendingDelete) return;

    setDeletingAgentId(agentPendingDelete.id);
    setError("");

    try {
      await api.delete(`/agents/${agentPendingDelete.id}`);
      setAgents((prev) => prev.filter((item) => item.id !== agentPendingDelete.id));
      setAgentPendingDelete(null);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setDeletingAgentId(null);
    }
  };

  const planLabel = formatPlanName(user?.plan || "free");
  const agentTypes = useMemo(() => {
    const types = new Set<string>();
    agents.forEach((agent) => {
      types.add(agent.config?.agent_type || "custom");
    });
    return ["all", ...Array.from(types).sort()];
  }, [agents]);

  const visibleAgents = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return [...agents]
      .filter((agent) => {
        const nameMatch = agent.name.toLowerCase().includes(normalizedQuery);
        const typeMatch = selectedType === "all" || (agent.config?.agent_type || "custom") === selectedType;
        return (!normalizedQuery || nameMatch) && typeMatch;
      })
      .sort((a, b) => {
        if (sortOrder === "oldest") {
          return a.id - b.id;
        }
        return b.id - a.id;
      });
  }, [agents, searchQuery, selectedType, sortOrder]);

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
      <ConfirmDialog
        open={!!agentPendingDelete}
        title={agentPendingDelete ? `Delete ${agentPendingDelete.name}?` : "Delete agent?"}
        description="This will permanently remove the agent and all of its conversation history. This action cannot be undone."
        confirmLabel="Delete agent"
        cancelLabel="Keep agent"
        destructive
        loading={agentPendingDelete ? deletingAgentId === agentPendingDelete.id : false}
        onConfirm={confirmDeleteAgent}
        onCancel={() => {
          if (!deletingAgentId) {
            setAgentPendingDelete(null);
          }
        }}
      />
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
                {planLabel}
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

              {agents.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1.3fr) minmax(180px, 0.75fr) minmax(180px, 0.75fr)",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      background: "var(--bg-2)",
                      border: "1px solid var(--border)",
                      borderRadius: 14,
                      padding: "10px 14px",
                    }}
                  >
                    <div style={{ color: "var(--text-3)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                      Search
                    </div>
                    <input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Find an agent by name"
                      style={{
                        width: "100%",
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        color: "var(--text)",
                        fontSize: 14,
                      }}
                    />
                  </div>

                  <label
                    style={{
                      background: "var(--bg-2)",
                      border: "1px solid var(--border)",
                      borderRadius: 14,
                      padding: "10px 14px",
                      display: "block",
                    }}
                  >
                    <div style={{ color: "var(--text-3)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                      Filter by type
                    </div>
                    <select
                      value={selectedType}
                      onChange={(event) => setSelectedType(event.target.value)}
                      style={{
                        width: "100%",
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        color: "var(--text)",
                        fontSize: 14,
                        textTransform: "capitalize",
                      }}
                    >
                      {agentTypes.map((type) => (
                        <option key={type} value={type}>
                          {type === "all" ? "All types" : type.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label
                    style={{
                      background: "var(--bg-2)",
                      border: "1px solid var(--border)",
                      borderRadius: 14,
                      padding: "10px 14px",
                      display: "block",
                    }}
                  >
                    <div style={{ color: "var(--text-3)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                      Sort
                    </div>
                    <select
                      value={sortOrder}
                      onChange={(event) => setSortOrder(event.target.value as "newest" | "oldest")}
                      style={{
                        width: "100%",
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        color: "var(--text)",
                        fontSize: 14,
                      }}
                    >
                      <option value="newest">Newest first</option>
                      <option value="oldest">Oldest first</option>
                    </select>
                  </label>
                </div>
              )}

            {agents.length === 0 ? (
              <div
                style={{
                  background: "var(--bg-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 16,
                  padding: "36px 32px",
                }}
              >
                <div style={{ maxWidth: 720 }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 12px",
                      borderRadius: 999,
                      background: "rgba(217,121,85,0.1)",
                      color: "var(--accent)",
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      marginBottom: 18,
                    }}
                  >
                    First Step
                  </div>
                  <h3
                    style={{
                      color: "var(--text)",
                      fontSize: 28,
                      lineHeight: 1.15,
                      letterSpacing: "-0.03em",
                      margin: "0 0 14px",
                    }}
                  >
                    Create your first agent and start with a template
                  </h3>
                  <p style={{ color: "var(--text-2)", margin: "0 0 22px", fontSize: 16, lineHeight: 1.7, maxWidth: 620 }}>
                    Agents are the core of Nexora. Pick a ready-made template like AI Trend Monitor or Competitor Analyzer, customize it in a minute, then open chat and use quick actions to generate your first result fast.
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 22 }}>
                    {["Choose a template", "Customize the agent", "Run a first prompt"].map((item) => (
                      <div
                        key={item}
                        style={{
                          padding: "10px 14px",
                          borderRadius: 12,
                          background: "var(--bg-3)",
                          border: "1px solid var(--border)",
                          color: "var(--text-2)",
                          fontSize: 14,
                        }}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                    <Link
                      href="/agents/new"
                      style={{
                        padding: "12px 18px",
                        background: "var(--accent)",
                        color: "#fff",
                        borderRadius: 12,
                        fontWeight: 700,
                        textDecoration: "none",
                      }}
                    >
                      Create your first agent
                    </Link>
                    <Link
                      href="/agents/new"
                      style={{
                        padding: "12px 18px",
                        background: "var(--bg-3)",
                        color: "var(--text)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      Browse templates
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 18,
                    color: "var(--text-3)",
                    fontSize: 13,
                  }}
                >
                  <span>
                    Showing {visibleAgents.length} of {agents.length} agents
                  </span>
                  {(searchQuery || selectedType !== "all" || sortOrder !== "newest") && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedType("all");
                        setSortOrder("newest");
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--accent)",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Reset filters
                    </button>
                  )}
                </div>

                {visibleAgents.length === 0 ? (
                  <div
                    style={{
                      background: "var(--bg-2)",
                      border: "1px solid var(--border)",
                      borderRadius: 16,
                      padding: "24px 22px",
                    }}
                  >
                    <div style={{ color: "var(--text)", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                      No agents match these filters
                    </div>
                    <div style={{ color: "var(--text-2)", fontSize: 14, lineHeight: 1.7, marginBottom: 14 }}>
                      Try another name, switch the type filter, or reset sorting to see your full agent list again.
                    </div>
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedType("all");
                        setSortOrder("newest");
                      }}
                      style={{
                        background: "var(--bg-3)",
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                        borderRadius: 10,
                        padding: "10px 14px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Clear search and filters
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                      gap: 20,
                    }}
                  >
                    {visibleAgents.map((agent) => (
                      <AgentCard
                        key={agent.id}
                        agent={agent}
                        onDelete={handleDeleteAgent}
                        deleting={deletingAgentId === agent.id}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
