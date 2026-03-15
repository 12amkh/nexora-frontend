"use client";

// Stage 14: Edit Agent page
// Loads agent config via GET /agents/{id}, displays full form, saves via PUT /agents/{id}
// Uses React controlled inputs — form state is the single source of truth

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

// Mirrors the AgentConfig fields the backend accepts on PUT /agents/{id}
interface AgentFormState {
  name: string;
  description: string;
  // Behavior
  tone: string;
  response_length: string;
  language: string;
  use_web_search: boolean;
  // Content
  instructions: string;
  welcome_message: string;
  focus_topics: string;    // stored as comma-separated string for the textarea
  avoid_topics: string;    // same — we join/split on save/load
  // Advanced
  custom_knowledge: string;
  max_history: number;
}

// Default values used while the agent is loading (prevents uncontrolled→controlled flicker)
const DEFAULT_FORM: AgentFormState = {
  name: "",
  description: "",
  tone: "professional",
  response_length: "medium",
  language: "English",
  use_web_search: true,
  instructions: "",
  welcome_message: "",
  focus_topics: "",
  avoid_topics: "",
  custom_knowledge: "",
  max_history: 20,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function EditAgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Next.js 16: params is a Promise — must unwrap with use()
  const { id } = use(params);
  const router = useRouter();

  const [form, setForm] = useState<AgentFormState>(DEFAULT_FORM);
  const [agentType, setAgentType] = useState(""); // read-only display badge
  const [loading, setLoading] = useState(true);   // true while fetching agent
  const [saving, setSaving] = useState(false);    // true while PUT is in flight
  const [error, setError] = useState("");

  // ── Load agent on mount ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const res = await api.get(`/agents/${id}`);
        const agent = res.data;

        // focus_topics and avoid_topics come as arrays from the backend — join for textarea
        const focusArr: string[] = agent.config?.focus_topics ?? [];
        const avoidArr: string[] = agent.config?.avoid_topics ?? [];

        setAgentType(agent.config?.agent_type ?? "");

        // Populate the form with all existing values
        setForm({
          name: agent.name ?? "",
          description: agent.description ?? "",
          tone: agent.config?.tone ?? "professional",
          response_length: agent.config?.response_length ?? "medium",
          language: agent.config?.language ?? "english",
          use_web_search: agent.config?.use_web_search ?? true,
          instructions: agent.config?.instructions ?? "",
          welcome_message: agent.config?.welcome_message ?? "",
          focus_topics: focusArr.join(", "),
          avoid_topics: avoidArr.join(", "),
          custom_knowledge: agent.config?.custom_knowledge ?? "",
          max_history: agent.config?.max_history ?? 20,
        });
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load agent";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchAgent();
  }, [id]); // re-run if id ever changes (e.g. back/forward navigation)

  // ── Generic change handler for all text/select/number inputs ─────────────
  // Using a single handler avoids one onChange per field boilerplate
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      // checkboxes need the checked property, everything else uses value
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : type === "number"
          ? Number(value)
          : value,
    }));
  };

  // ── Save handler ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      // Split comma-separated strings back into arrays for the backend
      const focusArr = form.focus_topics
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const avoidArr = form.avoid_topics
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await api.put(`/agents/${id}`, {
        name: form.name,
        description: form.description,
        config: {
          tone: form.tone,
          response_length: form.response_length,
          language: form.language,
          use_web_search: form.use_web_search,
          instructions: form.instructions,
          welcome_message: form.welcome_message,
          focus_topics: focusArr,
          avoid_topics: avoidArr,
          custom_knowledge: form.custom_knowledge,
          max_history: form.max_history,
        },
      });

      // Success → navigate back to the agent chat page
      router.push(`/agents/${id}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save changes";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>

      {/* ── Fixed sidebar (matches dashboard + chat pages) ── */}
      <aside
        style={{
          width: 220,
          minHeight: "100vh",
          background: "var(--bg-2)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          padding: "24px 16px",
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 10,
        }}
      >
        {/* Logo */}
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "var(--text)",
            marginBottom: 32,
            letterSpacing: "-0.5px",
          }}
        >
          Nexora
        </div>

        {/* Nav links */}
        {[
          { label: "Dashboard", href: "/dashboard" },
          { label: "New Agent", href: "/agents/new" },
        ].map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            style={{
              display: "block",
              padding: "10px 12px",
              borderRadius: 8,
              color: "var(--text-2)",
              textDecoration: "none",
              fontSize: 14,
              marginBottom: 4,
            }}
          >
            {label}
          </Link>
        ))}

        {/* Back to agent link */}
        <Link
          href={`/agents/${id}`}
          style={{
            display: "block",
            padding: "10px 12px",
            borderRadius: 8,
            color: "var(--accent)",
            textDecoration: "none",
            fontSize: 14,
            marginTop: "auto",
          }}
        >
          ← Back to agent
        </Link>
      </aside>

      {/* ── Main content area ── */}
      <main
        style={{
          marginLeft: 220,
          flex: 1,
          padding: "40px 48px",
          maxWidth: 800,
        }}
      >

        {/* Page header */}
        <div style={{ marginBottom: 32 }}>
          <Link
            href={`/agents/${id}`}
            style={{
              color: "var(--text-2)",
              textDecoration: "none",
              fontSize: 14,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 12,
            }}
          >
            ← Back to agent
          </Link>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "var(--text)",
              margin: 0,
              letterSpacing: "-0.5px",
            }}
          >
            Edit Agent
          </h1>
          {agentType && (
            <span
              style={{
                display: "inline-block",
                marginTop: 8,
                padding: "3px 10px",
                borderRadius: 20,
                background: "var(--accent-g)",
                border: "1px solid var(--accent)",
                color: "var(--accent)",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              {agentType.replace(/_/g, " ")}
            </span>
          )}
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div style={{ color: "var(--text-2)", fontSize: 14 }}>
            Loading agent...
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div
            style={{
              background: "rgba(248,113,113,0.1)",
              border: "1px solid var(--red)",
              borderRadius: 8,
              padding: "12px 16px",
              color: "var(--red)",
              fontSize: 14,
              marginBottom: 24,
            }}
          >
            {error}
          </div>
        )}

        {/* ── Form (only shown once agent is loaded) ── */}
        {!loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* ── Section: Basic Info ── */}
            <Section title="Basic info">
              <Field label="Agent name">
                <Input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="My Research Agent"
                />
              </Field>
              <Field label="Description">
                <Textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="What does this agent do?"
                  rows={3}
                />
              </Field>
            </Section>

            {/* ── Section: Behavior ── */}
            <Section title="Behavior">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

                <Field label="Tone">
                  <Select name="tone" value={form.tone} onChange={handleChange}>
                    <option value="professional">Professional</option>
                    <option value="analytical">Analytical</option>
                    <option value="friendly">Friendly</option>
                    <option value="casual">Casual</option>
                    <option value="creative">Creative</option>
                    <option value="persuasive">Persuasive</option>
                  </Select>
                </Field>

                <Field label="Response length">
                  <Select name="response_length" value={form.response_length} onChange={handleChange}>
                    <option value="short">Short</option>
                    <option value="medium">Medium</option>
                    <option value="detailed">Detailed</option>
                  </Select>
                </Field>

                <Field label="Language">
                  <Input
                    name="language"
                    value={form.language}
                    onChange={handleChange}
                    placeholder="English"
                  />
                </Field>

                <Field label="Max conversation history">
                  <Input
                    name="max_history"
                    type="number"
                    value={String(form.max_history)}
                    onChange={handleChange}
                    placeholder="20"
                    min={1}
                    max={100}
                  />
                </Field>

              </div>

              {/* Web search toggle — separate row for visual clarity */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 16px",
                  background: "var(--bg-3)",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  marginTop: 4,
                }}
              >
                <div>
                  <div style={{ color: "var(--text)", fontSize: 14, fontWeight: 500 }}>
                    Web search
                  </div>
                  <div style={{ color: "var(--text-2)", fontSize: 12, marginTop: 2 }}>
                    Allow this agent to search the web for up-to-date information
                  </div>
                </div>
                <label style={{ position: "relative", display: "inline-block", width: 44, height: 24, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    name="use_web_search"
                    checked={form.use_web_search}
                    onChange={handleChange}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  {/* Toggle track */}
                  <span
                    style={{
                      position: "absolute",
                      top: 0, left: 0, right: 0, bottom: 0,
                      borderRadius: 12,
                      background: form.use_web_search ? "var(--accent)" : "var(--bg-2)",
                      border: `1px solid ${form.use_web_search ? "var(--accent)" : "var(--border-2)"}`,
                      transition: "background 0.2s",
                    }}
                  />
                  {/* Toggle thumb */}
                  <span
                    style={{
                      position: "absolute",
                      top: 3,
                      left: form.use_web_search ? 22 : 3,
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: "white",
                      transition: "left 0.2s",
                    }}
                  />
                </label>
              </div>
            </Section>

            {/* ── Section: Instructions & Content ── */}
            <Section title="Instructions & content">

              <Field label="System instructions">
                <Textarea
                  name="instructions"
                  value={form.instructions}
                  onChange={handleChange}
                  placeholder="You are a helpful assistant that specializes in..."
                  rows={5}
                />
              </Field>

              <Field label="Welcome message" hint="Shown to users when they open a new chat">
                <Textarea
                  name="welcome_message"
                  value={form.welcome_message}
                  onChange={handleChange}
                  placeholder="Hello! How can I help you today?"
                  rows={2}
                />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Focus topics" hint="Comma-separated — e.g. finance, investing">
                  <Textarea
                    name="focus_topics"
                    value={form.focus_topics}
                    onChange={handleChange}
                    placeholder="finance, investing, stocks"
                    rows={3}
                  />
                </Field>

                <Field label="Avoid topics" hint="Comma-separated — topics the agent should skip">
                  <Textarea
                    name="avoid_topics"
                    value={form.avoid_topics}
                    onChange={handleChange}
                    placeholder="politics, religion"
                    rows={3}
                  />
                </Field>
              </div>

            </Section>

            {/* ── Section: Advanced ── */}
            <Section title="Advanced">
              <Field
                label="Custom knowledge"
                hint="Paste documents, FAQs, or any context you want the agent to know"
              >
                <Textarea
                  name="custom_knowledge"
                  value={form.custom_knowledge}
                  onChange={handleChange}
                  placeholder="Paste product documentation, FAQs, company policies..."
                  rows={6}
                />
              </Field>
            </Section>

            {/* ── Save / Cancel row ── */}
            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "flex-end",
                paddingBottom: 48, // breathing room at bottom of page
              }}
            >
              <Link
                href={`/agents/${id}`}
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  border: "1px solid var(--border-2)",
                  color: "var(--text-2)",
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                Cancel
              </Link>

              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                style={{
                  padding: "10px 24px",
                  borderRadius: 8,
                  background: saving ? "var(--bg-3)" : "var(--accent)",
                  border: "none",
                  color: saving ? "var(--text-2)" : "white",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: saving || !form.name.trim() ? "not-allowed" : "pointer",
                  transition: "opacity 0.15s",
                  opacity: !form.name.trim() ? 0.5 : 1,
                }}
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}

// ─── Reusable sub-components (defined in same file for simplicity) ─────────────

// Card section wrapper with title
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--bg-2)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 24,
      }}
    >
      <h2
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "var(--text-2)",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          margin: "0 0 20px",
        }}
      >
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {children}
      </div>
    </div>
  );
}

// Label + input wrapper
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 500,
          color: "var(--text-2)",
          marginBottom: 6,
        }}
      >
        {label}
        {hint && (
          <span style={{ color: "var(--text-3)", fontWeight: 400, marginLeft: 6 }}>
            — {hint}
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

// Shared input styles
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "var(--bg-3)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text)",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

function Input({
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  max,
}: {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  min?: number;
  max?: number;
}) {
  return (
    <input
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      min={min}
      max={max}
      style={inputStyle}
    />
  );
}

function Textarea({
  name,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
    />
  );
}

function Select({
  name,
  value,
  onChange,
  children,
}: {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      name={name}
      value={value}
      onChange={onChange}
      style={{ ...inputStyle, cursor: "pointer" }}
    >
      {children}
    </select>
  );
}
