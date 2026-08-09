import { getCurrentCanaryStep, isInconclusiveCanaryAnalysis } from "../k8s/rollouts/canary-step";

import type { ArgoRollout, ArgoRolloutStore } from "../k8s/rollouts";
import { isKubeNotFoundError, patchStatusSubresource } from "./kube-patch-transport";

export function buildRolloutAbortMergePatch(): Record<string, unknown> {
  return {
    status: {
      abort: true,
    },
  };
}

export function buildRolloutRetryMergePatch(): Record<string, unknown> {
  return {
    status: {
      abort: false,
    },
  };
}

export async function abortRollout(store: ArgoRolloutStore, rollout: ArgoRollout): Promise<void> {
  await patchRolloutStatusWithFallback(store, rollout, buildRolloutAbortMergePatch());
}

export async function retryRollout(store: ArgoRolloutStore, rollout: ArgoRollout): Promise<void> {
  await patchRolloutStatusWithFallback(store, rollout, buildRolloutRetryMergePatch());
}

async function patchRolloutStatusWithFallback(
  store: ArgoRolloutStore,
  rollout: ArgoRollout,
  statusPatch: Record<string, unknown>,
): Promise<void> {
  try {
    const patched = await patchStatusSubresource(store, rollout, statusPatch);
    if (patched) {
      return;
    }
  } catch (error) {
    if (!isKubeNotFoundError(error)) {
      throw error;
    }
  }

  await store.patch(rollout, statusPatch, "merge");
}

export type PromoteMergePatch = Record<string, unknown>;

export interface PromoteOptions {
  full?: boolean;
  skipCurrentStep?: boolean;
  skipAllSteps?: boolean;
}

export const PROMOTE_ERRORS = {
  bothSkipFlags: "Cannot use skip-current-step and skip-all-steps flags at the same time",
  skipWithBlueGreen: "Cannot skip steps of a bluegreen rollout. Run without a flags",
  skipNoCanarySteps: "Cannot skip steps of a rollout without steps",
  fullWithSkipFlags: "Cannot combine promote full with skip-step options",
} as const;

export function validatePromoteOptions(rollout: ArgoRollout, opts: PromoteOptions): void {
  const { full = false, skipCurrentStep = false, skipAllSteps = false } = opts;

  if (skipCurrentStep && skipAllSteps) {
    throw new Error(PROMOTE_ERRORS.bothSkipFlags);
  }

  if (full && (skipCurrentStep || skipAllSteps)) {
    throw new Error(PROMOTE_ERRORS.fullWithSkipFlags);
  }

  if (!skipCurrentStep && !skipAllSteps) {
    return;
  }

  if (rollout.spec?.strategy?.blueGreen) {
    throw new Error(PROMOTE_ERRORS.skipWithBlueGreen);
  }

  const steps = rollout.spec?.strategy?.canary?.steps ?? [];
  if (steps.length === 0) {
    throw new Error(PROMOTE_ERRORS.skipNoCanarySteps);
  }
}

/**
 * Mirrors argo-rollouts `getPatches`:
 * https://github.com/argoproj/argo-rollouts/blob/master/pkg/kubectl-argo-rollouts/cmd/promote/promote.go
 */
export function buildPromotePatches(
  rollout: ArgoRollout,
  opts: PromoteOptions,
): {
  specPatch: PromoteMergePatch | undefined;
  statusPatch: PromoteMergePatch | undefined;
  unifiedPatch: PromoteMergePatch | undefined;
} {
  const { full = false, skipCurrentStep = false, skipAllSteps = false } = opts;

  let specPatch: PromoteMergePatch | undefined;
  let statusPatch: PromoteMergePatch | undefined;
  let unifiedPatch: PromoteMergePatch | undefined;

  const steps = rollout.spec?.strategy?.canary?.steps ?? [];

  if (skipCurrentStep) {
    const { index } = getCurrentCanaryStep(rollout);
    if (index !== undefined) {
      let nextIndex = index;
      if (nextIndex < steps.length) {
        nextIndex++;
      }
      statusPatch = { status: { currentStepIndex: nextIndex } };
      unifiedPatch = statusPatch;
    }
    return { specPatch, statusPatch, unifiedPatch };
  }

  if (skipAllSteps) {
    statusPatch = { status: { currentStepIndex: steps.length } };
    unifiedPatch = statusPatch;
    return { specPatch, statusPatch, unifiedPatch };
  }

  if (full) {
    if (rollout.spec?.paused) {
      specPatch = { spec: { paused: false } };
    }
    // Always PATCH promoteFull for `--full` (matches unifiedPatch). Upstream kubectl only
    // sets a separate status patch when hashes differ, but then nothing is sent when hashes
    // match and spec is not paused — we still need promoteFull on /status for that edge case.
    statusPatch = { status: { promoteFull: true } };
    unifiedPatch = { spec: { paused: false }, status: { promoteFull: true } };
    return { specPatch, statusPatch, unifiedPatch };
  }

  unifiedPatch = {
    spec: { paused: false },
    status: { pauseConditions: null },
  };

  if (rollout.spec?.paused) {
    specPatch = { spec: { paused: false } };
  }

  const pauseConditions = rollout.status?.pauseConditions ?? [];
  const controllerPause = rollout.status?.controllerPause === true;

  if (isInconclusiveCanaryAnalysis(rollout) && pauseConditions.length > 0 && controllerPause) {
    const { index } = getCurrentCanaryStep(rollout);
    if (index !== undefined) {
      let nextIndex = index;
      if (nextIndex < steps.length) {
        nextIndex++;
      }
      statusPatch = {
        status: {
          pauseConditions: null,
          controllerPause: false,
          currentStepIndex: nextIndex,
        },
      };
      unifiedPatch = {
        spec: { paused: false },
        status: {
          pauseConditions: null,
          controllerPause: false,
          currentStepIndex: nextIndex,
        },
      };
    }
  } else if (pauseConditions.length > 0) {
    statusPatch = { status: { pauseConditions: null } };
  } else if (rollout.spec?.strategy?.canary != null) {
    const { index } = getCurrentCanaryStep(rollout);
    if (index !== undefined) {
      let nextIndex = index;
      if (nextIndex < steps.length) {
        nextIndex++;
      }
      statusPatch = {
        status: {
          pauseConditions: null,
          currentStepIndex: nextIndex,
        },
      };
      unifiedPatch = {
        spec: { paused: false },
        status: {
          pauseConditions: null,
          currentStepIndex: nextIndex,
        },
      };
    }
  }

  return { specPatch, statusPatch, unifiedPatch };
}

/**
 * Mirrors argo-rollouts `PromoteRollout` (+ Freelens JsonApi patch shape `{ data: ... }` on `/status`).
 */
export async function requestRolloutPromotion(
  rolloutStore: ArgoRolloutStore,
  rollout: ArgoRollout,
  options: PromoteOptions | boolean = false,
): Promise<void> {
  const opts: PromoteOptions = typeof options === "boolean" ? { full: options } : { ...options };

  validatePromoteOptions(rollout, opts);

  let { specPatch, statusPatch, unifiedPatch } = buildPromotePatches(rollout, opts);

  if (statusPatch) {
    try {
      const patched = await patchStatusSubresource(rolloutStore, rollout, statusPatch);
      if (!patched) {
        specPatch = unifiedPatch;
      }
    } catch (error) {
      if (!isKubeNotFoundError(error)) {
        throw error;
      }
      specPatch = unifiedPatch;
    }
  }

  if (specPatch) {
    await rolloutStore.patch(rollout, specPatch as Record<string, unknown>, "merge");
  }
}
