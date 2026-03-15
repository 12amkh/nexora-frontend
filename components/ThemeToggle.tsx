"use client";

import { useTheme } from "@/components/ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  const actionLabel = theme === "dark" ? "Light" : "Dark";

  return (
    <button
      onClick={() => void toggleTheme()}
      aria-label={label}
      title={label}
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        zIndex: 1001,
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        borderRadius: 999,
        border: "1px solid var(--border-2)",
        background: "color-mix(in srgb, var(--bg-2) 88%, transparent)",
        backdropFilter: "blur(16px)",
        color: "var(--text)",
        cursor: "pointer",
        boxShadow: "0 10px 35px rgba(0,0,0,0.18)",
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          background: theme === "dark" ? "rgba(245,239,227,0.12)" : "rgba(23,23,23,0.08)",
          fontSize: 13,
        }}
      >
        {theme === "dark" ? "☀" : "☾"}
      </span>
      <span>{actionLabel}</span>
    </button>
  );
}
