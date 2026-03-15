"use client";

import Link from "next/link";

interface Agent {
  id: number;
  name: string;
  description: string;
  config?: {
    agent_type?: string;
    tone?: string;
    use_web_search?: boolean;
  };
}

export default function AgentCard({ agent }: { agent: Agent }) {
  const agentType = (agent.config?.agent_type || "custom").replace(/_/g, " ");
  const tone = agent.config?.tone || "professional";

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
