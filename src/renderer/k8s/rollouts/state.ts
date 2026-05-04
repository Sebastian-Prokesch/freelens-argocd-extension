import { getPromotablePauseReasons } from "./promotion";

import type { ArgoRollout } from "./index";

export type DerivedRolloutState =
  | "healthy"
  | "progressing"
  | "paused_promotable"
  | "paused_analysis_pending"
  | "degraded"
  | "aborted"
  | "unknown";

export type BlueGreenPromotionState = "active" | "preview_pending" | "unknown" | "not_bluegreen";

const hasAnalysisPendingPause = (rollout: ArgoRollout): boolean =>
  (rollout.status?.pauseConditions ?? []).some((condition) =>
    ["PauseReasonAnalysisRunPending", "BlueGreenPause", "InconclusiveAnalysis"].includes(condition?.reason ?? ""),
  );

const hasAbortedSignals = (rollout: ArgoRollout): boolean => {
  const message = (rollout.status?.message ?? "").toLowerCase();
  const phase = (rollout.status?.phase ?? "").toLowerCase();
  const conditionReasons = (rollout.status?.conditions ?? []).map((condition) =>
    (condition.reason ?? "").toLowerCase(),
  );

  return (
    message.includes("aborted") ||
    phase.includes("abort") ||
    conditionReasons.some((reason) => reason.includes("abort"))
  );
};

export function deriveRolloutState(rollout: ArgoRollout): DerivedRolloutState {
  const phase = (rollout.status?.phase ?? "").toLowerCase();

  if (hasAbortedSignals(rollout)) {
    return "aborted";
  }

  if (phase === "degraded") {
    return "degraded";
  }

  if (phase === "paused" && getPromotablePauseReasons(rollout).length > 0) {
    return "paused_promotable";
  }

  if (phase === "paused" && hasAnalysisPendingPause(rollout)) {
    return "paused_analysis_pending";
  }

  if (phase === "progressing") {
    return "progressing";
  }

  if (phase === "healthy") {
    return "healthy";
  }

  if (phase === "paused") {
    return "unknown";
  }

  return phase ? "unknown" : "progressing";
}

export function getRolloutStateLabel(rollout: ArgoRollout): string {
  const state = deriveRolloutState(rollout);

  switch (state) {
    case "healthy":
      return "Healthy";
    case "progressing":
      return "Progressing";
    case "paused_promotable":
      return "Paused (Promotable)";
    case "paused_analysis_pending":
      return "Paused (Analysis Pending)";
    case "degraded":
      return "Degraded";
    case "aborted":
      return "Aborted";
    default:
      return "Unknown";
  }
}

export function getRolloutStateReason(rollout: ArgoRollout): string {
  const state = deriveRolloutState(rollout);

  if (state === "paused_promotable") {
    return `Pause reason: ${getPromotablePauseReasons(rollout).join(", ")}`;
  }

  if (state === "paused_analysis_pending") {
    const reason = (rollout.status?.pauseConditions ?? [])
      .map((condition) => condition.reason)
      .filter(Boolean)
      .join(", ");

    return reason ? `Analysis is pending/inconclusive: ${reason}` : "Analysis is pending/inconclusive.";
  }

  if (state === "degraded") {
    return rollout.status?.message ?? "Rollout is degraded. Check conditions for failure details.";
  }

  if (state === "aborted") {
    return rollout.status?.message ?? "Rollout is aborted and can be retried.";
  }

  if (state === "progressing") {
    return rollout.status?.message ?? "Rollout is progressing through strategy steps.";
  }

  if (state === "healthy") {
    return "Rollout is healthy.";
  }

  return rollout.status?.message ?? "State could not be derived.";
}

export function canAbortRollout(rollout: ArgoRollout): boolean {
  return deriveRolloutState(rollout) === "progressing";
}

export function canRetryRollout(rollout: ArgoRollout): boolean {
  const state = deriveRolloutState(rollout);
  return state === "degraded" || state === "aborted";
}

export function getBlueGreenPromotionState(rollout: ArgoRollout): BlueGreenPromotionState {
  if (!rollout.spec?.strategy?.blueGreen) {
    return "not_bluegreen";
  }

  const stable = rollout.status?.stableRS;
  const current = rollout.status?.currentPodHash;
  const activeSelector = rollout.status?.blueGreen?.activeSelector;
  const previewSelector = rollout.status?.blueGreen?.previewSelector;

  if (stable && current && stable === current) {
    return "active";
  }

  if (previewSelector || (stable && current && stable !== current)) {
    return "preview_pending";
  }

  if (activeSelector) {
    return "active";
  }

  return "unknown";
}

export function getBlueGreenPromotionLabel(rollout: ArgoRollout): string {
  const state = getBlueGreenPromotionState(rollout);

  switch (state) {
    case "active":
      return "Active";
    case "preview_pending":
      return "Preview Pending Promotion";
    case "unknown":
      return "Unknown";
    default:
      return "N/A";
  }
}

const dashWhenEmpty = (value: string | undefined): string => (value?.trim() ? value : "—");

/** Multi-line tooltip for Blue/Green traffic-related status fields; empty when strategy is not Blue/Green. */
export function getBlueGreenTrafficTooltip(rollout: ArgoRollout): string {
  if (!rollout.spec?.strategy?.blueGreen) {
    return "";
  }

  const phase = rollout.status?.phase ?? "—";
  const active = dashWhenEmpty(rollout.status?.blueGreen?.activeSelector);
  const preview = dashWhenEmpty(rollout.status?.blueGreen?.previewSelector);
  const stable = dashWhenEmpty(rollout.status?.stableRS);
  const current = dashWhenEmpty(rollout.status?.currentPodHash);

  return [`phase=${phase}`, `active=${active}`, `preview=${preview}`, `stable=${stable}`, `current=${current}`].join(
    "\n",
  );
}
