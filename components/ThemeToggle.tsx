"use client";

import { useTheme } from "@/components/ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={() => void toggleTheme()}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      style={{
        position: "fixed",
        top: 16,
        right: 16,
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
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        boxShadow: "0 10px 35px rgba(0,0,0,0.18)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          background: theme === "dark" ? "rgba(245,239,227,0.12)" : "rgba(23,23,23,0.08)",
          fontSize: 12,
        }}
      >
        {theme === "dark" ? "☀" : "☾"}
      </span>
      <span>{theme === "dark" ? "Light" : "Dark"}</span>
    </button>
  );
}
