import type { ApplicationHistoryEntry } from "../endpoints/argo-application-endpoints";
import type { GuardedMutationConfirm } from "./guarded-mutation";

export function getAbortRolloutConfirmCopy(rolloutName: string): GuardedMutationConfirm {
  return {
    title: "Abort Rollout",
    message: `Abort rollout ${rolloutName}? This interrupts the ongoing rollout operation.`,
  };
}

export function getRollbackApplicationConfirmCopy(
  appName: string,
  entry: ApplicationHistoryEntry,
): GuardedMutationConfirm {
  const revision = entry.revision ?? "unknown";
  const historyId = entry.id ?? "unknown";
  const deployedAt = entry.deployedAt ? new Date(entry.deployedAt).toLocaleString() : "unknown time";

  return {
    title: "Rollback Application",
    message: `Rollback ${appName} to history ID ${historyId} (revision ${revision}, deployed ${deployedAt})? This will revert the application to that state and may replace current workloads.`,
  };
}
