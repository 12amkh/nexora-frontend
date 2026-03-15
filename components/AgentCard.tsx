"use client";

import Link from "next/link";
import { MouseEvent } from "react";

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

interface AgentCardProps {
  agent: Agent;
  onDelete?: (agent: Agent) => void | Promise<void>;
  deleting?: boolean;
}

export default function AgentCard({ agent, onDelete, deleting = false }: AgentCardProps) {
  const agentType = (agent.config?.agent_type || "custom").replace(/_/g, " ");
  const tone = agent.config?.tone || "professional";
  const handleDeleteClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onDelete?.(agent);
  };

  return (
    <Link
      href={`/agents/${agent.id}`}
      style={{
        display: "block",
        background: "var(--bg-2)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: "20px 22px",
        color: "inherit",
        textDecoration: "none",
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
              fontSize: 18,
              fontWeight: 700,
              color: "var(--text)",
              marginBottom: 6,
            }}
          >
            {agent.name}
          </div>
          <div
            style={{
              fontSize: 12,
              letterSpacing: "0.18em",
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
              padding: "4px 10px",
              borderRadius: 999,
              fontSize: 12,
              color: "var(--accent)",
              background: "rgba(108,99,255,0.12)",
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
          lineHeight: 1.6,
          minHeight: 72,
          marginBottom: 16,
        }}
      >
        {agent.description || "No description yet. Open this agent to start chatting and customizing it."}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          fontSize: 13,
          color: "var(--text-3)",
        }}
      >
        <span>
          {agent.config?.use_web_search ? "Web search enabled" : "Knowledge only"}
        </span>
        <span>Open chat</span>
      </div>
    </Link>
  );
}
