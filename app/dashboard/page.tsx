"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, formatPlanName, getErrorMessage, getUser, logout, refreshCurrentUser } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import AgentCard from "@/components/AgentCard";
import { AppStateCard, StateActionButton } from "@/components/AppState";
import ConfirmDialog from "@/components/ConfirmDialog";
import { DashboardLoadingState } from "@/components/LoadingSkeleton";
import UsageStats from "@/components/UsageStats";
import RichContent from "@/components/RichContent";

interface Agent {
  id: number;
  name: string;
  description: string;
  created_at?: string;
  user_id?: number;
  config?: {
    agent_type?: string;
    tone?: string;
    use_web_search?: boolean;
    response_length?: string;
    welcome_message?: string;
  };
}

interface User {
  id: number;
  name: string;
  email: string;
  plan: string;
}

interface Schedule {
  id: number;
  agent_id: number;
  name: string;
  created_at?: string;
  last_run_at?: string | null;
  last_run_status?: string | null;
}

interface ActivityItem {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  kind: "agent_created" | "schedule_run" | "schedule_created";
}

interface AgentRunResult {
  agent: Agent;
  agentId: number;
  prompt: string;
  response: string;
}

function buildDefaultRunPrompt(agent: Agent) {
  const type = agent.config?.agent_type || "custom";

  if (type === "news_monitor") {
    return "Give me a concise trends report with the most important developments and what matters most right now.";
  }
  if (type === "competitor_analyst") {
    return "Give me a quick competitor analysis with the main positioning, product strengths, and risks to watch.";
  }
  if (type === "data_interpreter") {
    return "Give me a structured interpretation of the key insights, patterns, and actions I should take from the available context.";
  }
  if (type === "content_writer") {
    return "Draft a short high-quality content outline with a strong hook, key points, and a call to action.";
  }
  if (type === "web_researcher") {
    return "Research this topic and give me a clear summary with the most useful takeaways and sources.";
  }

  return "Give me a clear, structured response showing what you are best at and the most useful next steps.";
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [loading, setLoading] = useState(true);
  const [runningAgentId, setRunningAgentId] = useState<number | null>(null);
  const [deletingAgentId, setDeletingAgentId] = useState<number | null>(null);
  const [agentPendingDelete, setAgentPendingDelete] = useState<Agent | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [runResult, setRunResult] = useState<AgentRunResult | null>(null);
  const [error, setError] = useState("");

  const loadDashboardData = async () => {
    const res = await api.get("/agents/list?limit=50");
    setAgents(Array.isArray(res.data) ? res.data : []);

    const schedulesRes = await api.get("/schedules/list?limit=20");
    setSchedules(Array.isArray(schedulesRes.data) ? schedulesRes.data : []);
  };

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
        await loadDashboardData();
      } catch (error) {
        console.error("Failed to fetch agents:", error);
        setError("Failed to load agents.");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router]);

  const handleRetryDashboard = async () => {
    setError("");
    setLoading(true);

    try {
      await loadDashboardData();
    } catch (retryError) {
      console.error("Failed to refresh dashboard:", retryError);
      setError("We couldn't refresh your dashboard right now.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleDeleteAgent = async (agent: Agent) => {
    if (deletingAgentId) return;
    setAgentPendingDelete(agent);
  };

  const handleInspectAgent = (agent: Agent) => {
    setSelectedAgent(agent);
  };

  const handleRunAgent = async (agent: Agent) => {
    if (runningAgentId) return;

    const prompt = buildDefaultRunPrompt(agent);
    setRunningAgentId(agent.id);
    setError("");

    try {
      const { data } = await api.post("/chat/run", {
        agent_id: agent.id,
        message: prompt,
      });

      setRunResult({
        agent,
        agentId: agent.id,
        prompt,
        response: data.message,
      });
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setRunningAgentId(null);
    }
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

  const recentActivity = useMemo(() => {
    const agentNames = new Map<number, string>();
    agents.forEach((agent) => {
      agentNames.set(agent.id, agent.name);
    });

    const items: ActivityItem[] = [];

    agents.forEach((agent) => {
      if (!agent.created_at) return;
      items.push({
        id: `agent-created-${agent.id}`,
        title: `Created agent ${agent.name}`,
        detail: `${(agent.config?.agent_type || "custom").replace(/_/g, " ")} agent is ready for chat.`,
        timestamp: agent.created_at,
        kind: "agent_created",
      });
    });

    schedules.forEach((schedule) => {
      if (schedule.last_run_at) {
        const statusLabel = schedule.last_run_status ? schedule.last_run_status.toLowerCase() : "completed";
        items.push({
          id: `schedule-run-${schedule.id}-${schedule.last_run_at}`,
          title: `Schedule ${schedule.name} ran`,
          detail: `${agentNames.get(schedule.agent_id) || "Agent"} · ${statusLabel}`,
          timestamp: schedule.last_run_at,
          kind: "schedule_run",
        });
      } else if (schedule.created_at) {
        items.push({
          id: `schedule-created-${schedule.id}`,
          title: `Created schedule ${schedule.name}`,
          detail: `Automation added for ${agentNames.get(schedule.agent_id) || "an agent"}.`,
          timestamp: schedule.created_at,
          kind: "schedule_created",
        });
      }
    });

    return items
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 6);
  }, [agents, schedules]);

  const formatActivityTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Recently";

    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.round(diffMinutes / 60)}h ago`;
    if (diffMinutes < 10080) return `${Math.round(diffMinutes / 1440)}d ago`;
    return date.toLocaleDateString();
  };

  if (loading || !user) {
    return <DashboardLoadingState />;
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
      {runResult && (
        <div
          onClick={() => setRunResult(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(3, 6, 18, 0.72)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            zIndex: 1100,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            style={{
              width: "100%",
              maxWidth: 860,
              maxHeight: "88vh",
              overflowY: "auto",
              background: "linear-gradient(180deg, rgba(19,20,28,0.98) 0%, rgba(12,13,19,0.98) 100%)",
              border: "1px solid var(--border)",
              borderRadius: 24,
              boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
              padding: 28,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 20,
                marginBottom: 22,
              }}
            >
              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 12px",
                    borderRadius: 999,
                    background: "rgba(217,121,85,0.1)",
                    color: "var(--accent)",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: 12,
                  }}
                >
                  Agent Run Result
                </div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 30,
                    fontWeight: 700,
                    color: "var(--text)",
                    letterSpacing: "-0.03em",
                  }}
                >
                  {runResult.agent.name}
                </h3>
                <div style={{ color: "var(--text-3)", fontSize: 14, marginTop: 8, maxWidth: 640, lineHeight: 1.7 }}>
                  Result from the dashboard quick run using the default prompt for this agent.
                </div>
              </div>
              <button
                onClick={() => setRunResult(null)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  background: "var(--bg-3)",
                  color: "var(--text)",
                  fontSize: 18,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                background: "var(--bg-3)",
                border: "1px solid var(--border)",
                borderRadius: 18,
                padding: 18,
                marginBottom: 18,
              }}
            >
              <div style={{ color: "var(--text-3)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                Prompt Used
              </div>
              <div style={{ color: "var(--text-2)", fontSize: 14, lineHeight: 1.7 }}>
                {runResult.prompt}
              </div>
            </div>

            <div
              style={{
                background: "var(--bg-3)",
                border: "1px solid var(--border)",
                borderRadius: 18,
                padding: 18,
                marginBottom: 22,
              }}
            >
              <div style={{ color: "var(--text-3)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                Response
              </div>
              <div style={{ color: "var(--text-2)", fontSize: 14, lineHeight: 1.8 }}>
                <RichContent content={runResult.response} />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={() => setRunResult(null)}
                style={{
                  padding: "10px 16px",
                  borderRadius: 12,
                  border: "1px solid var(--border-2)",
                  background: "transparent",
                  color: "var(--text-2)",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
              <Link
                href={`/agents/${runResult.agentId}`}
                onClick={() => setRunResult(null)}
                style={{
                  padding: "10px 16px",
                  borderRadius: 12,
                  border: "none",
                  background: "var(--accent)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Open Full Chat
              </Link>
            </div>
          </div>
        </div>
      )}
      {selectedAgent && (
        <div
          onClick={() => setSelectedAgent(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(3, 6, 18, 0.72)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            zIndex: 1000,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            style={{
              width: "100%",
              maxWidth: 760,
              background: "linear-gradient(180deg, rgba(19,20,28,0.98) 0%, rgba(12,13,19,0.98) 100%)",
              border: "1px solid var(--border)",
              borderRadius: 24,
              boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
              padding: 28,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 20,
                marginBottom: 22,
              }}
            >
              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 12px",
                    borderRadius: 999,
                    background: "rgba(217,121,85,0.1)",
                    color: "var(--accent)",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: 12,
                  }}
                >
                  Agent Details
                </div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 30,
                    fontWeight: 700,
                    color: "var(--text)",
                    letterSpacing: "-0.03em",
                  }}
                >
                  {selectedAgent.name}
                </h3>
                <div style={{ color: "var(--text-3)", fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 8 }}>
                  {(selectedAgent.config?.agent_type || "custom").replace(/_/g, " ")}
                </div>
              </div>
              <button
                onClick={() => setSelectedAgent(null)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  background: "var(--bg-3)",
                  color: "var(--text)",
                  fontSize: 18,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div className="dashboard-modal-grid">
              {[
                { label: "Type", value: (selectedAgent.config?.agent_type || "custom").replace(/_/g, " ") },
                { label: "Tone", value: selectedAgent.config?.tone || "professional" },
                { label: "Status", value: selectedAgent.config?.use_web_search ? "Web search enabled" : "Knowledge only" },
                { label: "Response length", value: selectedAgent.config?.response_length || "medium" },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 16,
                    background: "var(--bg-3)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{ color: "var(--text-3)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                    {item.label}
                  </div>
                    <div style={{ color: "var(--text)", fontSize: 15, fontWeight: 600, textTransform: "capitalize" }}>
                      {item.value}
                    </div>
                  </div>
                ))}
            </div>

            <div
              style={{
                background: "var(--bg-3)",
                border: "1px solid var(--border)",
                borderRadius: 18,
                padding: 18,
                marginBottom: 18,
              }}
            >
              <div style={{ color: "var(--text-3)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                Full Description
              </div>
              <div style={{ color: "var(--text-2)", fontSize: 15, lineHeight: 1.8 }}>
                {selectedAgent.description || "No description yet. Open this agent to start chatting and customizing it."}
              </div>
            </div>

            <div
              style={{
                background: "var(--bg-3)",
                border: "1px solid var(--border)",
                borderRadius: 18,
                padding: 18,
                marginBottom: 22,
              }}
            >
              <div style={{ color: "var(--text-3)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                Config Summary
              </div>
              <div style={{ display: "grid", gap: 10, color: "var(--text-2)", fontSize: 14 }}>
                <div>
                  <span style={{ color: "var(--text)", fontWeight: 700 }}>Behavior:</span>{" "}
                  {selectedAgent.config?.use_web_search ? "Research and web context enabled." : "Focused on built-in knowledge and conversation context."}
                </div>
                <div>
                  <span style={{ color: "var(--text)", fontWeight: 700 }}>Tone:</span>{" "}
                  {(selectedAgent.config?.tone || "professional").replace(/_/g, " ")}
                </div>
                <div>
                  <span style={{ color: "var(--text)", fontWeight: 700 }}>Welcome:</span>{" "}
                  {selectedAgent.config?.welcome_message || "Uses the default welcome message."}
                </div>
                <div>
                  <span style={{ color: "var(--text)", fontWeight: 700 }}>Created:</span>{" "}
                  {selectedAgent.created_at ? new Date(selectedAgent.created_at).toLocaleString() : "Recently created"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={() => handleRunAgent(selectedAgent)}
                disabled={runningAgentId === selectedAgent.id}
                style={{
                  padding: "10px 16px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--bg-3)",
                  color: "var(--text)",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: runningAgentId === selectedAgent.id ? "not-allowed" : "pointer",
                  opacity: runningAgentId === selectedAgent.id ? 0.8 : 1,
                }}
              >
                {runningAgentId === selectedAgent.id ? "Running..." : "Run agent"}
              </button>
              <button
                onClick={() => setSelectedAgent(null)}
                style={{
                  padding: "10px 16px",
                  borderRadius: 12,
                  border: "1px solid var(--border-2)",
                  background: "transparent",
                  color: "var(--text-2)",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
              <Link
                href={`/agents/${selectedAgent.id}/edit`}
                onClick={() => setSelectedAgent(null)}
                style={{
                  padding: "10px 16px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--bg-3)",
                  color: "var(--text)",
                  fontSize: 14,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Edit
              </Link>
              <Link
                href={`/agents/${selectedAgent.id}`}
                onClick={() => setSelectedAgent(null)}
                style={{
                  padding: "10px 16px",
                  borderRadius: 12,
                  border: "none",
                  background: "var(--accent)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Open
              </Link>
            </div>
          </div>
        </div>
      )}
      <Sidebar />
      <main className="app-shell-main">
        <div className="app-shell-content">
          <div className="dashboard-header">
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
            <div className="dashboard-header-actions">
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

          <section style={{ marginBottom: 28 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
                marginBottom: 16,
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: "var(--text)",
                    margin: "0 0 4px",
                  }}
                >
                  Recent Activity
                </h2>
                <p style={{ color: "var(--text-2)", margin: 0, fontSize: 14 }}>
                  The latest useful things happening across your agents and automations.
                </p>
              </div>
            </div>

            {recentActivity.length === 0 ? (
              <div
                style={{
                  background: "var(--bg-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 16,
                  padding: "20px 22px",
                  color: "var(--text-2)",
                  fontSize: 14,
                  lineHeight: 1.7,
                }}
              >
                No recent activity yet. Create an agent or run a schedule and the latest actions will appear here.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 14,
                  marginBottom: 6,
                }}
              >
                {recentActivity.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: "var(--bg-2)",
                      border: "1px solid var(--border)",
                      borderRadius: 16,
                      padding: "18px 18px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 12,
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "5px 10px",
                          borderRadius: 999,
                          background: "rgba(217,121,85,0.1)",
                          color: "var(--accent)",
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                        }}
                      >
                        {item.kind === "agent_created"
                          ? "Agent"
                          : item.kind === "schedule_run"
                            ? "Schedule Run"
                            : "Schedule"}
                      </div>
                      <span style={{ color: "var(--text-3)", fontSize: 12 }}>
                        {formatActivityTime(item.timestamp)}
                      </span>
                    </div>

                    <div style={{ color: "var(--text)", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                      {item.title}
                    </div>
                    <div style={{ color: "var(--text-2)", fontSize: 14, lineHeight: 1.7 }}>
                      {item.detail}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {error && (
            <div style={{ marginBottom: 20 }}>
              <AppStateCard
                eyebrow="Dashboard issue"
                icon="⚠️"
                title="We couldn't load the latest dashboard data"
                description={`${error} You can retry now without leaving the page.`}
                tone="error"
                compact
                actions={<StateActionButton label="Retry dashboard" onClick={() => void handleRetryDashboard()} />}
              />
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
                        onInspect={handleInspectAgent}
                        onRun={handleRunAgent}
                        onDelete={handleDeleteAgent}
                        deleting={deletingAgentId === agent.id}
                        running={runningAgentId === agent.id}
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
