import type { GuardedMutationConfirm } from "./guarded-mutation";

export function getAbortRolloutConfirmCopy(rolloutName: string): GuardedMutationConfirm {
  return {
    title: "Abort Rollout",
    message: `Abort rollout ${rolloutName}? This interrupts the ongoing rollout operation.`,
  };
}
