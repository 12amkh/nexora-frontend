"use client";

import type { CSSProperties } from "react";
import Sidebar from "@/components/Sidebar";

export function SkeletonBlock({
  width = "100%",
  height,
  radius = 12,
  style,
}: {
  width?: CSSProperties["width"];
  height: number | string;
  radius?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      className="skeleton-block"
      style={{
        width,
        height,
        borderRadius: radius,
        ...style,
      }}
    />
  );
}

function LoadingShell({
  children,
  narrow,
}: {
  children: React.ReactNode;
  narrow?: boolean;
}) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <Sidebar />
      <main className={narrow ? "app-shell-main app-shell-main--narrow" : "app-shell-main"}>
        <div className={narrow ? undefined : "app-shell-content"}>{children}</div>
      </main>
    </div>
  );
}

function Surface({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        background: "var(--bg-2)",
        border: "1px solid var(--border)",
        borderRadius: 20,
        padding: 24,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function DashboardLoadingState() {
  return (
    <LoadingShell>
      <div className="dashboard-header">
        <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
          <SkeletonBlock width={92} height={12} radius={999} />
          <SkeletonBlock width={220} height={34} />
          <SkeletonBlock width={320} height={16} />
        </div>
        <div className="dashboard-header-actions">
          <SkeletonBlock width={110} height={34} radius={999} />
          <SkeletonBlock width={84} height={34} radius={10} />
        </div>
      </div>

      <Surface style={{ marginBottom: 28 }}>
        <div style={{ display: "grid", gap: 20 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <SkeletonBlock width={140} height={18} />
            <SkeletonBlock width={260} height={14} />
          </div>
          <div className="usage-stats-grid">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} style={{ display: "grid", gap: 10 }}>
                <SkeletonBlock width={110} height={14} />
                <SkeletonBlock width="100%" height={12} radius={999} />
                <SkeletonBlock width={90} height={12} />
              </div>
            ))}
          </div>
        </div>
      </Surface>

      <div style={{ display: "grid", gap: 24 }}>
        <Surface>
          <div style={{ display: "grid", gap: 16 }}>
            <SkeletonBlock width={170} height={24} />
            <SkeletonBlock width={340} height={14} />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 14,
              }}
            >
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: 16,
                    padding: 18,
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <SkeletonBlock width={84} height={12} radius={999} />
                  <SkeletonBlock width={160} height={18} />
                  <SkeletonBlock width="100%" height={14} />
                  <SkeletonBlock width="75%" height={14} />
                </div>
              ))}
            </div>
          </div>
        </Surface>

        <Surface>
          <div style={{ display: "grid", gap: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ display: "grid", gap: 8 }}>
                <SkeletonBlock width={150} height={26} />
                <SkeletonBlock width={280} height={14} />
              </div>
              <SkeletonBlock width={148} height={42} radius={12} />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 18,
              }}
            >
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: 18,
                    padding: 20,
                    display: "grid",
                    gap: 12,
                  }}
                >
                  <SkeletonBlock width={130} height={18} />
                  <SkeletonBlock width="100%" height={14} />
                  <SkeletonBlock width="82%" height={14} />
                  <SkeletonBlock width="68%" height={14} />
                  <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                    <SkeletonBlock width={90} height={34} radius={10} />
                    <SkeletonBlock width={84} height={34} radius={10} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Surface>
      </div>
    </LoadingShell>
  );
}

export function SettingsLoadingState() {
  return (
    <LoadingShell>
      <Surface
        style={{
          background:
            "radial-gradient(circle at top left, rgba(217,121,85,0.18), transparent 32%), linear-gradient(180deg, var(--bg-2) 0%, rgba(255,255,255,0.02) 100%)",
          marginBottom: 24,
        }}
      >
        <div style={{ display: "grid", gap: 22 }}>
          <div style={{ display: "grid", gap: 10 }}>
            <SkeletonBlock width={130} height={12} radius={999} />
            <SkeletonBlock width={180} height={36} />
            <SkeletonBlock width={360} height={16} />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 14,
            }}
          >
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 16,
                  padding: 16,
                  display: "grid",
                  gap: 10,
                }}
              >
                <SkeletonBlock width={34} height={5} radius={999} />
                <SkeletonBlock width={88} height={12} />
                <SkeletonBlock width={120} height={18} />
              </div>
            ))}
          </div>
        </div>
      </Surface>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "var(--settings-content-columns)",
          gap: 24,
          alignItems: "start",
        }}
      >
        <div style={{ display: "grid", gap: 24 }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Surface key={index}>
              <div style={{ display: "grid", gap: 18 }}>
                <div style={{ display: "grid", gap: 8 }}>
                  <SkeletonBlock width={160} height={24} />
                  <SkeletonBlock width={300} height={14} />
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 14,
                  }}
                >
                  {Array.from({ length: index === 2 ? 2 : 3 }).map((__, innerIndex) => (
                    <div key={innerIndex} style={{ display: "grid", gap: 10 }}>
                      <SkeletonBlock width={110} height={12} />
                      <SkeletonBlock width="100%" height={44} radius={12} />
                      <SkeletonBlock width="70%" height={12} />
                    </div>
                  ))}
                </div>
              </div>
            </Surface>
          ))}
        </div>

        <div style={{ display: "grid", gap: 24 }}>
          {Array.from({ length: 2 }).map((_, index) => (
            <Surface key={index}>
              <div style={{ display: "grid", gap: 14 }}>
                <SkeletonBlock width={150} height={22} />
                <SkeletonBlock width="100%" height={14} />
                <SkeletonBlock width="82%" height={14} />
                <SkeletonBlock width={120} height={38} radius={10} />
              </div>
            </Surface>
          ))}
        </div>
      </div>
    </LoadingShell>
  );
}

export function UpgradeLoadingState({ showSidebar }: { showSidebar: boolean }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {showSidebar && <Sidebar />}
      <main
        className={showSidebar ? "app-shell-main" : undefined}
        style={showSidebar ? {} : { padding: "88px 24px 72px" }}
      >
        <div className="app-shell-content" style={{ maxWidth: 1240, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 28 }}>
            <div style={{ display: "grid", gap: 12 }}>
              <SkeletonBlock width={92} height={12} radius={999} />
              <SkeletonBlock width={340} height={40} />
              <SkeletonBlock width={520} height={16} />
            </div>
            <SkeletonBlock width={128} height={40} radius={10} />
          </div>

          <Surface style={{ marginBottom: 28 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: 16,
                    padding: 18,
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <SkeletonBlock width={90} height={12} />
                  <SkeletonBlock width={130} height={20} />
                </div>
              ))}
            </div>
          </Surface>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 18,
            }}
          >
            {Array.from({ length: 5 }).map((_, index) => (
              <Surface key={index} style={{ display: "grid", gap: 14 }}>
                <SkeletonBlock width={100} height={22} />
                <SkeletonBlock width={140} height={36} />
                <SkeletonBlock width="100%" height={14} />
                <SkeletonBlock width="86%" height={14} />
                <div style={{ display: "grid", gap: 10 }}>
                  <SkeletonBlock width="72%" height={13} />
                  <SkeletonBlock width="80%" height={13} />
                  <SkeletonBlock width="64%" height={13} />
                </div>
                <SkeletonBlock width="100%" height={42} radius={12} style={{ marginTop: 8 }} />
              </Surface>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export function AgentPageLoadingState() {
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          padding: "1rem 1.5rem",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-2)",
        }}
      >
        <SkeletonBlock width={24} height={20} radius={8} />
        <div style={{ display: "grid", gap: 8 }}>
          <SkeletonBlock width={180} height={18} />
          <SkeletonBlock width={120} height={12} />
        </div>
      </div>

      <div style={{ maxWidth: 900, width: "100%", margin: "0 auto", padding: "1rem 2rem 0" }}>
        <SkeletonBlock width={180} height={36} radius={999} />
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1.5rem 2rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          maxWidth: 900,
          width: "100%",
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonBlock key={index} width={128} height={36} radius={999} />
          ))}
        </div>
        <Surface style={{ padding: 22 }}>
          <div style={{ display: "grid", gap: 12 }}>
            <SkeletonBlock width={110} height={12} radius={999} />
            <SkeletonBlock width={260} height={24} />
            <SkeletonBlock width="100%" height={15} />
            <SkeletonBlock width="84%" height={15} />
            <SkeletonBlock width="92%" height={15} />
          </div>
        </Surface>
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              justifyContent: index % 2 === 0 ? "flex-start" : "flex-end",
            }}
          >
            <div
              style={{
                width: "min(75%, 560px)",
                background: index % 2 === 0 ? "var(--bg-2)" : "var(--accent-g)",
                border: `1px solid ${index % 2 === 0 ? "var(--border)" : "transparent"}`,
                borderRadius: index % 2 === 0 ? "14px 14px 14px 4px" : "14px 14px 4px 14px",
                padding: "0.9rem 1rem",
                display: "grid",
                gap: 10,
              }}
            >
              <SkeletonBlock width={64} height={10} />
              <SkeletonBlock width="100%" height={14} />
              <SkeletonBlock width="82%" height={14} />
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: "1rem 2rem",
          borderTop: "1px solid var(--border)",
          background: "var(--bg-2)",
          display: "flex",
          gap: "0.75rem",
          maxWidth: 900,
          width: "100%",
          margin: "0 auto",
        }}
      >
        <SkeletonBlock width="100%" height={48} radius={10} />
        <SkeletonBlock width={82} height={48} radius={10} />
      </div>
    </div>
  );
}

export function ReportsLoadingState() {
  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          style={{
            background: "var(--bg-2)",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            padding: "1.1rem 1.2rem",
            display: "grid",
            gap: "0.8rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ display: "grid", gap: "0.45rem" }}>
              <SkeletonBlock width={180} height={16} />
              <SkeletonBlock width={120} height={12} />
            </div>
            <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap" }}>
              <SkeletonBlock width={78} height={34} radius={10} />
              <SkeletonBlock width={84} height={34} radius={10} />
            </div>
          </div>
          <SkeletonBlock width="100%" height={14} />
          <SkeletonBlock width="88%" height={14} />
        </div>
      ))}
    </div>
  );
}
