"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MouseEvent } from "react";

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

interface AgentCardProps {
  agent: Agent;
  onInspect?: (agent: Agent) => void;
  onRun?: (agent: Agent) => void | Promise<void>;
  onDelete?: (agent: Agent) => void | Promise<void>;
  deleting?: boolean;
  running?: boolean;
}

export default function AgentCard({ agent, onInspect, onRun, onDelete, deleting = false, running = false }: AgentCardProps) {
  const router = useRouter();
  const agentType = (agent.config?.agent_type || "custom").replace(/_/g, " ");
  const tone = agent.config?.tone || "professional";
  const shortDescription = agent.description
    ? agent.description.length > 120
      ? `${agent.description.slice(0, 117).trimEnd()}...`
      : agent.description
    : "No description yet. Open this agent to start chatting and customizing it.";
  const statusLabel = agent.config?.use_web_search ? "Research-ready" : "Knowledge-ready";
  const capabilityLabel = agent.config?.use_web_search ? "Web search enabled" : "Knowledge only";

  const handleDeleteClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onDelete?.(agent);
  };

  const handleInspectClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onInspect?.(agent);
  };

  const handleRunClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onRun?.(agent);
  };

  const handleCardOpen = () => {
    router.push(`/agents/${agent.id}`);
  };

  return (
    <div
      onClick={handleCardOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleCardOpen();
        }
      }}
      style={{
        display: "block",
        background: "var(--bg-2)",
        border: "1px solid var(--border)",
        borderRadius: 20,
        padding: "22px",
        color: "inherit",
        textDecoration: "none",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 16,
        }}
        >
        <div style={{ minWidth: 0 }}>
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
              marginBottom: 12,
            }}
          >
            {statusLabel}
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "var(--text)",
              marginBottom: 8,
              letterSpacing: "-0.02em",
            }}
          >
            {agent.name}
          </div>
          <div
            style={{
              fontSize: 12,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--text-3)",
            }}
          >
            {agentType}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              padding: "5px 10px",
              borderRadius: 999,
              fontSize: 12,
              color: "var(--accent)",
              background: "rgba(217,121,85,0.12)",
              whiteSpace: "nowrap",
              textTransform: "capitalize",
            }}
          >
            {tone}
          </span>
          {onDelete && (
            <button
              onClick={handleDeleteClick}
              disabled={deleting}
              aria-label={`Delete ${agent.name}`}
              title={`Delete ${agent.name}`}
              style={{
                width: 30,
                height: 30,
                borderRadius: 999,
                border: "1px solid var(--border-2)",
                background: "var(--bg-3)",
                color: deleting ? "var(--text-3)" : "var(--red)",
                cursor: deleting ? "not-allowed" : "pointer",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                fontSize: 16,
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              {deleting ? "…" : "×"}
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          color: "var(--text-2)",
          fontSize: 14,
          lineHeight: 1.7,
          minHeight: 72,
          marginBottom: 18,
        }}
      >
        {shortDescription}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 10,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            background: "var(--bg-3)",
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ color: "var(--text-3)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
            Type
          </div>
          <div style={{ color: "var(--text)", fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>
            {agentType}
          </div>
        </div>
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            background: "var(--bg-3)",
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ color: "var(--text-3)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
            Status
          </div>
          <div style={{ color: "var(--text)", fontSize: 13, fontWeight: 600 }}>
            {capabilityLabel}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {onInspect && (
            <button
              onClick={handleInspectClick}
              style={{
                padding: "9px 14px",
                borderRadius: 10,
                background: "var(--bg-3)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Details
            </button>
          )}
          <Link
            href={`/agents/${agent.id}`}
            onClick={(event) => event.stopPropagation()}
            style={{
              padding: "9px 14px",
              borderRadius: 10,
              background: "var(--accent)",
              color: "#fff",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Open
          </Link>
          <Link
            href={`/agents/${agent.id}/edit`}
            onClick={(event) => event.stopPropagation()}
            style={{
              padding: "9px 14px",
              borderRadius: 10,
              background: "var(--bg-3)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Edit
          </Link>
          <button
            onClick={handleRunClick}
            disabled={running}
            style={{
              padding: "9px 14px",
              borderRadius: 10,
              background: "transparent",
              border: "1px solid var(--border)",
              color: running ? "var(--text-3)" : "var(--text-2)",
              fontSize: 13,
              fontWeight: 600,
              cursor: running ? "not-allowed" : "pointer",
            }}
          >
            {running ? "Running..." : "Run"}
          </button>
        </div>
        <span style={{ fontSize: 12, color: "var(--text-3)" }}>
          Ready for follow-up chat
        </span>
      </div>
    </div>
  );
}
