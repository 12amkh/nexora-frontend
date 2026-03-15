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
      className="block rounded-xl border border-border bg-bg-2 p-5 transition hover:border-accent/40 hover:bg-bg-3"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="mb-1 text-lg font-semibold text-text">{agent.name}</h3>
          <p className="text-xs uppercase tracking-[0.16em] text-text-3">
            {agentType}
          </p>
        </div>
        <span className="rounded-full bg-accent/10 px-2 py-1 text-xs capitalize text-accent">
          {tone}
        </span>
      </div>

      <p className="mb-4 min-h-12 text-sm leading-6 text-text-2">
        {agent.description || "No description yet. Open this agent to start chatting and customizing it."}
      </p>

      <div className="flex items-center justify-between text-xs text-text-3">
        <span>
          {agent.config?.use_web_search ? "Web search enabled" : "Knowledge only"}
        </span>
        <span>Open chat</span>
      </div>
    </Link>
  );
}
