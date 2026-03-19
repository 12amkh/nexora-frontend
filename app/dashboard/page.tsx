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
import { useToast } from "@/components/ToastProvider";
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

interface AgentRunResult {
  agent: Agent;
  agentId: number;
  prompt: string;
  response: string;
}

interface WorkflowStarter {
  id: string;
  title: string;
  description: string;
  label: string;
  steps: string[];
}

const WORKFLOW_STARTERS: WorkflowStarter[] = [
  {
    id: "trend-insight-weekly-report",
    title: "Startup Opportunity Finder",
    description: "Best when you want one sharp opportunity, not a pile of research. This flow turns market shifts into a single build recommendation and execution plan.",
    label: "Founder favorite",
    steps: ["Trend Research", "Insight Analysis", "Final Recommendation"],
  },
  {
    id: "competitor-strategy-action-plan",
    title: "Competitor Gap Workflow",
    description: "Use this when you want to spot weak coverage, copy gaps, or overlooked positioning moves competitors are missing.",
    label: "Positioning",
    steps: ["Competitor Research", "Strategy Analysis", "Action Plan"],
  },
  {
    id: "market-research-startup-summary",
    title: "Market-to-Idea Workflow",
    description: "Use this when you already have a market in mind and want Nexora to narrow it into concrete startup wedges worth testing.",
    label: "New concepts",
    steps: ["Market Research", "Idea Generation", "Decision Report"],
  },
];

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

function SectionToggleHeader({
  open,
  onToggle,
  title,
  description,
}: {
  open: boolean;
  onToggle: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        border: "none",
        background: "transparent",
        padding: "2px 0",
        cursor: "pointer",
        textAlign: "left",
        minWidth: 0,
        flex: "1 1 320px",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 34,
          minWidth: 34,
          height: 34,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--accent)",
          background: "var(--accent-g)",
          border: "1px solid color-mix(in srgb, var(--accent) 32%, transparent)",
          borderRadius: 999,
          fontSize: 20,
          fontWeight: 700,
          lineHeight: 1,
          marginTop: 2,
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s ease",
        }}
      >
        ▾
      </span>
      <div style={{ minWidth: 0 }}>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "var(--text)",
            margin: "0 0 4px",
            lineHeight: 1.2,
          }}
        >
          {title}
        </h2>
        <p style={{ color: "var(--text-2)", margin: 0, fontSize: 14, lineHeight: 1.5 }}>
          {description}
        </p>
      </div>
    </button>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { pushToast, updateToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsOpen, setAgentsOpen] = useState(true);
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
    const agentsRes = await api.get("/agents/list?limit=50");
    setAgents(Array.isArray(agentsRes.data) ? agentsRes.data : []);
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
    const toastId = pushToast({
      title: `Running ${agent.name}`,
      description: "Your agent is preparing a quick result from the dashboard.",
      tone: "loading",
      dismissible: false,
    });
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
      updateToast(toastId, {
        title: `${agent.name} is ready`,
        description: "The quick run finished successfully.",
        tone: "success",
        dismissible: true,
      });
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      setError(message);
      updateToast(toastId, {
        title: `Couldn't run ${agent.name}`,
        description: message,
        tone: "error",
        dismissible: true,
      });
    } finally {
      setRunningAgentId(null);
    }
  };

  const confirmDeleteAgent = async () => {
    if (!agentPendingDelete) return;

    const agentName = agentPendingDelete.name;
    const toastId = pushToast({
      title: `Deleting ${agentName}`,
      description: "We're removing this agent and its conversation history.",
      tone: "loading",
      dismissible: false,
    });
    setDeletingAgentId(agentPendingDelete.id);
    setError("");

    try {
      await api.delete(`/agents/${agentPendingDelete.id}`);
      setAgents((prev) => prev.filter((item) => item.id !== agentPendingDelete.id));
      setAgentPendingDelete(null);
      updateToast(toastId, {
        title: `${agentName} deleted`,
        description: "The agent was removed successfully.",
        tone: "success",
        dismissible: true,
      });
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      setError(message);
      updateToast(toastId, {
        title: `Couldn't delete ${agentName}`,
        description: message,
        tone: "error",
        dismissible: true,
      });
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
    return <DashboardLoadingState />;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <ConfirmDialog
        open={!!agentPendingDelete}
        title={agentPendingDelete ? `Delete ${agentPendingDelete.name}?` : "Delete agent?"}
        description="This will permanently remove the agent and all of its conversation history. This action cannot be undone."
        warning="Deleting an agent also removes its stored chat history and any quick-run context tied to it."
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
          className="app-modal-overlay"
          style={{ zIndex: 1100 }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            className="app-modal-card"
            style={{ width: "100%", maxWidth: 860, maxHeight: "88vh", overflowY: "auto", padding: 28 }}
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
          className="app-modal-overlay"
          style={{ zIndex: 1000 }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            className="app-modal-card"
            style={{ width: "100%", maxWidth: 760, padding: 28 }}
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

          <section
            style={{
              marginBottom: 28,
              background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 13%, var(--bg-2)) 0%, var(--bg-2) 72%)",
              border: "1px solid color-mix(in srgb, var(--accent) 24%, var(--border))",
              borderRadius: 22,
              padding: 22,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 18,
                marginBottom: 18,
                flexWrap: "wrap",
              }}
            >
              <div style={{ maxWidth: 760 }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 12px",
                    borderRadius: 999,
                    background: "rgba(217,121,85,0.12)",
                    color: "var(--accent)",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: 12,
                  }}
                >
                  Workflow Quick Start
                </div>
                <h2
                  style={{
                    margin: "0 0 8px",
                    fontSize: 24,
                    fontWeight: 700,
                    color: "var(--text)",
                    letterSpacing: "-0.03em",
                  }}
                >
                  Use Nexora for one clear decision, not just more research
                </h2>
                <p style={{ margin: 0, color: "var(--text-2)", fontSize: 15, lineHeight: 1.75 }}>
                  These workflow starters are the fastest path to the product’s strongest outcome: a narrow opportunity, a clear recommendation, and something real you can build or sell next.
                </p>
              </div>
              <Link
                href="/workflows"
                style={{
                  padding: "11px 16px",
                  borderRadius: 14,
                  background: "var(--accent)",
                  color: "#fff",
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                Open workflow studio
              </Link>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 14,
              }}
            >
              {WORKFLOW_STARTERS.map((workflow) => (
                <Link
                  key={workflow.id}
                  href={`/workflows?template=${workflow.id}`}
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: 18,
                    padding: 18,
                    textDecoration: "none",
                    display: "grid",
                    gap: 12,
                    boxShadow: "0 8px 30px rgba(15, 23, 42, 0.04)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div>
                      <div style={{ color: "var(--text)", fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
                        {workflow.title}
                      </div>
                      <div style={{ color: "var(--text-2)", fontSize: 13, lineHeight: 1.7 }}>
                        {workflow.description}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        background: "var(--accent-g)",
                        color: "var(--accent)",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {workflow.label}
                    </span>
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                    {workflow.steps.map((step, index) => (
                      <div
                        key={`${workflow.id}-${step}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          color: "var(--text-3)",
                          fontSize: 12,
                        }}
                      >
                        <span
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 999,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "var(--bg-3)",
                            border: "1px solid var(--border)",
                            color: "var(--accent)",
                            fontWeight: 700,
                            fontSize: 11,
                          }}
                        >
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ color: "var(--accent)", fontSize: 13, fontWeight: 700 }}>
                    Start this workflow →
                  </div>
                </Link>
              ))}
            </div>
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
                flexWrap: "wrap",
              }}
            >
              <SectionToggleHeader
                open={agentsOpen}
                onToggle={() => setAgentsOpen((current) => !current)}
                title="Your Agents"
                description="Search, filter, and manage the agents currently in your workspace."
              />
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

              {!agentsOpen ? null : agents.length > 0 && (
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

            {!agentsOpen ? null : agents.length === 0 ? (
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
