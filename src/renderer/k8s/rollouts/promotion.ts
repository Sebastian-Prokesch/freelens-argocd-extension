import type { ArgoRollout } from "./index";

const promotablePauseReasons = new Set(["CanaryPauseStep", "PauseReasonBlueGreenPause", "BlueGreenPause"]);

const isPromotablePauseReason = (reason: unknown): reason is string =>
  typeof reason === "string" && promotablePauseReasons.has(reason);

export function getPromotablePauseReasons(rollout: ArgoRollout): string[] {
  return (rollout.status?.pauseConditions ?? []).map((item) => item?.reason).filter(isPromotablePauseReason);
}

export function canShowPromoteAction(rollout: ArgoRollout): boolean {
  if (rollout.spec?.paused) {
    return false;
  }

  if (rollout.status?.phase !== "Paused") {
    return false;
  }

  return getPromotablePauseReasons(rollout).length > 0;
}

/** Standard promote plus progressing rollouts may need full promotion to skip pauses/analysis. */
export function canShowPromoteFullAction(rollout: ArgoRollout): boolean {
  if (rollout.spec?.paused) {
    return false;
  }
  const phase = rollout.status?.phase ?? "";
  return phase === "Progressing" || canShowPromoteAction(rollout);
}

/** kubectl `promote --skip-current-step` equivalent (canary with steps only). */
export function canShowPromoteSkipCurrentStepAction(rollout: ArgoRollout): boolean {
  if (rollout.spec?.strategy?.blueGreen || rollout.spec?.paused) {
    return false;
  }
  const steps = rollout.spec?.strategy?.canary?.steps ?? [];
  return steps.length > 0 && rollout.status?.phase === "Progressing";
}

/** kubectl `promote --skip-all-steps` equivalent (deprecated upstream; same guards as skip-current). */
export function canShowPromoteSkipAllStepsAction(rollout: ArgoRollout): boolean {
  return canShowPromoteSkipCurrentStepAction(rollout);
}
