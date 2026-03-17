"use client";

import type { CSSProperties, ReactNode } from "react";

type Tone = "neutral" | "error" | "warning";

function getToneStyles(tone: Tone) {
  if (tone === "error") {
    return {
      border: "1px solid rgba(248,113,113,0.3)",
      background: "rgba(248,113,113,0.08)",
      badgeBackground: "rgba(248,113,113,0.14)",
      badgeColor: "var(--red)",
    };
  }

  if (tone === "warning") {
    return {
      border: "1px solid rgba(217,121,85,0.28)",
      background: "rgba(217,121,85,0.08)",
      badgeBackground: "rgba(217,121,85,0.14)",
      badgeColor: "var(--accent)",
    };
  }

  return {
    border: "1px solid var(--border)",
    background: "var(--bg-2)",
    badgeBackground: "rgba(255,255,255,0.05)",
    badgeColor: "var(--text-2)",
  };
}

export function AppStateCard({
  eyebrow,
  title,
  description,
  tone = "neutral",
  actions,
  icon,
  compact,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  tone?: Tone;
  actions?: ReactNode;
  icon?: string;
  compact?: boolean;
}) {
  const toneStyles = getToneStyles(tone);

  return (
    <div
      style={{
        ...stateCardStyle,
        ...toneStyles,
        padding: compact ? 18 : 22,
      }}
    >
      <div style={{ display: "grid", gap: compact ? 10 : 12 }}>
        {(eyebrow || icon) && (
          <div style={stateHeaderStyle}>
            {icon && <span style={stateIconStyle}>{icon}</span>}
            {eyebrow && (
              <span
                style={{
                  ...stateBadgeStyle,
                  background: toneStyles.badgeBackground,
                  color: toneStyles.badgeColor,
                }}
              >
                {eyebrow}
              </span>
            )}
          </div>
        )}

        <div style={{ display: "grid", gap: 8 }}>
          <div style={stateTitleStyle}>{title}</div>
          <div style={stateDescriptionStyle}>{description}</div>
        </div>

        {actions && <div style={stateActionsStyle}>{actions}</div>}
      </div>
    </div>
  );
}

export function StateActionButton({
  label,
  onClick,
  secondary,
}: {
  label: string;
  onClick?: () => void;
  secondary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={secondary ? secondaryButtonStyle : primaryButtonStyle}
    >
      {label}
    </button>
  );
}

const stateCardStyle: CSSProperties = {
  borderRadius: 18,
};

const stateHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};

const stateIconStyle: CSSProperties = {
  fontSize: 24,
  lineHeight: 1,
};

const stateBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const stateTitleStyle: CSSProperties = {
  color: "var(--text)",
  fontSize: 20,
  fontWeight: 700,
  letterSpacing: "-0.03em",
};

const stateDescriptionStyle: CSSProperties = {
  color: "var(--text-2)",
  fontSize: 14,
  lineHeight: 1.7,
  maxWidth: 760,
};

const stateActionsStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 4,
};

const primaryButtonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "none",
  background: "var(--accent)",
  color: "#fff",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid var(--border-2)",
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};
