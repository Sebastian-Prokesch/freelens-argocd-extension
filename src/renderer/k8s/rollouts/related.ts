import type { ArgoAnalysisRun } from "./analysis-run";

interface RolloutLike {
  metadata?: {
    uid?: string;
    name?: string;
    namespace?: string;
  };
  getName?: () => string;
  getNs?: () => string | undefined;
}

export function getAnalysisRunsForRollout(rollout: RolloutLike, runs: ArgoAnalysisRun[]): ArgoAnalysisRun[] {
  const rolloutUid = rollout.metadata?.uid;
  const rolloutName = rollout.getName?.() ?? rollout.metadata?.name;
  const rolloutNamespace = rollout.getNs?.() ?? rollout.metadata?.namespace;

  return runs.filter((run) => {
    if (rolloutNamespace && run.getNs() !== rolloutNamespace) {
      return false;
    }

    return (
      run.metadata?.ownerReferences?.some((ownerReference) => {
        if (ownerReference.kind !== "Rollout") {
          return false;
        }

        if (rolloutUid && ownerReference.uid && ownerReference.uid === rolloutUid) {
          return true;
        }

        if (rolloutName && ownerReference.name === rolloutName) {
          return true;
        }

        return false;
      }) ?? false
    );
  });
}
