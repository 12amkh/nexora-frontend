"use client";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(3, 6, 18, 0.72)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        zIndex: 1000,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        style={{
          width: "100%",
          maxWidth: 460,
          background: "linear-gradient(180deg, rgba(19,20,28,0.98) 0%, rgba(12,13,19,0.98) 100%)",
          border: "1px solid var(--border)",
          borderRadius: 20,
          boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
          padding: 24,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: destructive ? "rgba(248,113,113,0.12)" : "var(--accent-g)",
            border: destructive ? "1px solid rgba(248,113,113,0.3)" : "1px solid var(--border)",
            color: destructive ? "var(--red)" : "var(--accent)",
            display: "grid",
            placeItems: "center",
            fontSize: 20,
            fontWeight: 700,
            marginBottom: 18,
          }}
        >
          {destructive ? "!" : "?"}
        </div>

        <h3
          id="confirm-dialog-title"
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 700,
            color: "var(--text)",
            letterSpacing: "-0.03em",
          }}
        >
          {title}
        </h3>

        <p
          style={{
            margin: "12px 0 0",
            color: "var(--text-2)",
            fontSize: 15,
            lineHeight: 1.7,
          }}
        >
          {description}
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            marginTop: 28,
          }}
        >
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "1px solid var(--border-2)",
              background: "transparent",
              color: "var(--text-2)",
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              background: destructive ? "var(--red)" : "var(--accent)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              minWidth: 120,
              opacity: loading ? 0.8 : 1,
            }}
          >
            {loading ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
