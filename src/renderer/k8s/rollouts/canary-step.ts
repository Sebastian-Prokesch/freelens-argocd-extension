/** Minimal rollout shape for canary helpers (avoids circular imports with `index.ts`). */
export type CanaryRolloutLike = {
  spec?: {
    paused?: boolean;
    strategy?: {
      canary?: {
        steps?: unknown[];
      };
      blueGreen?: unknown;
    };
  };
  status?: {
    currentStepIndex?: number;
    pauseConditions?: { reason?: string }[];
    controllerPause?: boolean;
    canary?: {
      currentStepAnalysisRunStatus?: {
        status?: string;
      };
    };
  };
};

/** Mirrors argo-rollouts `AnalysisPhaseInconclusive`. */
export const ANALYSIS_PHASE_INCONCLUSIVE = "Inconclusive";

export interface CurrentCanaryStepResult {
  step: unknown | undefined;
  index: number | undefined;
}

/**
 * Port of argo-rollouts `GetCurrentCanaryStep`:
 * https://github.com/argoproj/argo-rollouts/blob/master/utils/replicaset/canary.go
 */
export function getCurrentCanaryStep(rollout: CanaryRolloutLike): CurrentCanaryStepResult {
  const canary = rollout.spec?.strategy?.canary;
  const steps = canary?.steps ?? [];

  if (!canary || steps.length === 0) {
    return { step: undefined, index: undefined };
  }

  let currentStepIndex = 0;
  if (rollout.status?.currentStepIndex != null) {
    currentStepIndex = rollout.status.currentStepIndex;
  }

  if (steps.length <= currentStepIndex) {
    return { step: undefined, index: currentStepIndex };
  }

  return { step: steps[currentStepIndex], index: currentStepIndex };
}

/** Port of promote.go `isInconclusive`. */
export function isInconclusiveCanaryAnalysis(rollout: CanaryRolloutLike): boolean {
  if (!rollout.spec?.strategy?.canary) {
    return false;
  }

  const status = rollout.status?.canary?.currentStepAnalysisRunStatus?.status;

  return status === ANALYSIS_PHASE_INCONCLUSIVE;
}
