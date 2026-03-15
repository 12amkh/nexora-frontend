"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, getUser, logout } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import AgentCard from "@/components/AgentCard";
import UsageStats from "@/components/UsageStats";

interface Agent {
  id: number;
  name: string;
  description: string;
  user_id: number;
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

  if (loading || !user) {
    return (
      <div className="flex min-h-screen bg-bg">
        <Sidebar />
        <div className="flex-1 pl-[220px]">
          <div className="p-8 text-text">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <div className="flex-1 pl-[220px]">
        <div className="p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-text mb-2">Dashboard</h1>
              <p className="text-text-2">Welcome back, {user.name}!</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-text-2 text-sm bg-accent-g px-3 py-1 rounded-full">
                {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-text-2 hover:text-text transition"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* NEW: Usage Stats Component */}
          <UsageStats />

          {/* Agents Section */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-text">Your Agents</h2>
              <Link
                href="/agents/new"
                className="px-6 py-2 bg-accent text-bg rounded-lg font-medium hover:bg-accent/90 transition"
              >
                Create Agent
              </Link>
            </div>

            {agents.length === 0 ? (
              <div className="bg-bg-2 border border-border rounded-lg p-12 text-center">
                <p className="text-text-2 mb-4">No agents yet.</p>
                <Link
                  href="/agents/new"
                  className="text-accent hover:underline font-medium"
                >
                  Create your first agent →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
