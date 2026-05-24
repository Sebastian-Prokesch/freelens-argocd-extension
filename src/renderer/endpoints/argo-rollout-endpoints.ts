import type { ArgoRollout, ArgoRolloutStore } from "../k8s/rollouts";

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
  await store.patch(rollout, buildRolloutAbortMergePatch(), "merge");
}

export async function retryRollout(store: ArgoRolloutStore, rollout: ArgoRollout): Promise<void> {
  await store.patch(rollout, buildRolloutRetryMergePatch(), "merge");
}
