"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type ToastTone = "success" | "error" | "loading" | "info";

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
  dismissible: boolean;
}

interface ToastContextValue {
  pushToast: (input: {
    title: string;
    description?: string;
    tone?: ToastTone;
    durationMs?: number;
    dismissible?: boolean;
  }) => string;
  updateToast: (
    id: string,
    input: Partial<Pick<ToastItem, "title" | "description" | "tone" | "dismissible">> & {
      durationMs?: number;
    }
  ) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function getToastToneStyles(tone: ToastTone) {
  if (tone === "success") {
    return {
      icon: "✓",
      border: "1px solid rgba(52,211,153,0.28)",
      background: "rgba(52,211,153,0.1)",
      accent: "var(--green)",
    };
  }

  if (tone === "error") {
    return {
      icon: "!",
      border: "1px solid rgba(248,113,113,0.28)",
      background: "rgba(248,113,113,0.1)",
      accent: "var(--red)",
    };
  }

  if (tone === "loading") {
    return {
      icon: "⋯",
      border: "1px solid rgba(217,121,85,0.28)",
      background: "rgba(217,121,85,0.1)",
      accent: "var(--accent)",
    };
  }

  return {
    icon: "i",
    border: "1px solid var(--border)",
    background: "rgba(255,255,255,0.05)",
    accent: "var(--text)",
  };
}

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const scheduleDismiss = useCallback(
    (id: string, durationMs?: number) => {
      if (!durationMs || durationMs <= 0) return;
      window.setTimeout(() => dismissToast(id), durationMs);
    },
    [dismissToast]
  );

  const pushToast = useCallback<ToastContextValue["pushToast"]>(
    ({ title, description, tone = "info", durationMs, dismissible = true }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((current) => [...current, { id, title, description, tone, dismissible }]);
      scheduleDismiss(id, durationMs ?? (tone === "loading" ? 0 : 3400));
      return id;
    },
    [scheduleDismiss]
  );

  const updateToast = useCallback<ToastContextValue["updateToast"]>(
    (id, input) => {
      setToasts((current) =>
        current.map((toast) =>
          toast.id === id
            ? {
                ...toast,
                ...input,
                dismissible: input.dismissible ?? toast.dismissible,
              }
            : toast
        )
      );
      scheduleDismiss(id, input.durationMs ?? 3400);
    },
    [scheduleDismiss]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      pushToast,
      updateToast,
      dismissToast,
    }),
    [dismissToast, pushToast, updateToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        style={{
          position: "fixed",
          right: 18,
          bottom: 18,
          zIndex: 1500,
          display: "grid",
          gap: 12,
          width: "min(360px, calc(100vw - 24px))",
        }}
      >
        {toasts.map((toast) => {
          const styles = getToastToneStyles(toast.tone);
          return (
            <div
              key={toast.id}
              style={{
                borderRadius: 18,
                border: styles.border,
                background: styles.background,
                boxShadow: "0 22px 50px rgba(0,0,0,0.22)",
                backdropFilter: "blur(12px)",
                padding: 14,
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    background: "rgba(0,0,0,0.18)",
                    display: "grid",
                    placeItems: "center",
                    color: styles.accent,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {styles.icon}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ color: "var(--text)", fontSize: 14, fontWeight: 700, marginBottom: toast.description ? 4 : 0 }}>
                    {toast.title}
                  </div>
                  {toast.description && (
                    <div style={{ color: "var(--text-2)", fontSize: 13, lineHeight: 1.6 }}>
                      {toast.description}
                    </div>
                  )}
                </div>
                {toast.dismissible && (
                  <button
                    type="button"
                    onClick={() => dismissToast(toast.id)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "var(--text-3)",
                      fontSize: 16,
                      cursor: "pointer",
                      padding: 2,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
