import React from "react";

type StatusTone = "positive" | "warning" | "negative" | "neutral";

const baseStyle: React.CSSProperties = {
  display: "inline-block",
  borderRadius: "999px",
  padding: "0.125rem 0.5rem",
  fontSize: "0.75rem",
  lineHeight: 1.4,
  fontWeight: 600,
  whiteSpace: "nowrap",
};

const toneStyles: Record<StatusTone, React.CSSProperties> = {
  positive: {
    backgroundColor: "#d9f7e8",
    color: "#0f5132",
  },
  warning: {
    backgroundColor: "#fff3cd",
    color: "#664d03",
  },
  negative: {
    backgroundColor: "#f8d7da",
    color: "#842029",
  },
  neutral: {
    backgroundColor: "#e2e3e5",
    color: "#41464b",
  },
};

const positiveStates = new Set([
  "healthy",
  "synced",
  "succeeded",
  "success",
  "available",
  "ready",
  "running",
  "completed",
]);
const warningStates = new Set(["progressing", "pending", "paused", "suspending", "terminating", "unknown"]);
const negativeStates = new Set(["degraded", "failed", "error", "outofsync", "missing", "unhealthy"]);

function normalizeStatus(status?: string | null): string {
  return (status ?? "").trim();
}

function statusKey(status?: string | null): string {
  return normalizeStatus(status)
    .toLowerCase()
    .replace(/[\s_-]/g, "");
}

export function getStatusTone(status?: string | null): StatusTone {
  const key = statusKey(status);

  if (!key) {
    return "neutral";
  }
  if (positiveStates.has(key)) {
    return "positive";
  }
  if (warningStates.has(key)) {
    return "warning";
  }
  if (negativeStates.has(key)) {
    return "negative";
  }

  return "neutral";
}

export interface StatusBadgeProps {
  status?: string | null;
  fallbackLabel?: string;
}

export function StatusBadge({ status, fallbackLabel = "Unknown" }: StatusBadgeProps) {
  const label = normalizeStatus(status) || fallbackLabel;
  const tone = getStatusTone(status);

  return (
    <span data-testid="StatusBadge" data-tone={tone} style={{ ...baseStyle, ...toneStyles[tone] }}>
      {label}
    </span>
  );
}
