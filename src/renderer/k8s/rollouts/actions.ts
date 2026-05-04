import type { ArgoRollout } from "./index";

export function getAbortMergePatch(_rollout: ArgoRollout): Record<string, unknown> {
  return {
    status: {
      abort: true,
    },
  };
}

export function getRetryMergePatch(_rollout: ArgoRollout): Record<string, unknown> {
  return {
    status: {
      abort: false,
    },
  };
}
