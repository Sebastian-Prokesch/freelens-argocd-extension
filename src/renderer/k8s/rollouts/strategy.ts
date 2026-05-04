import type { IRollout } from "@kubernetes-models/argo-rollouts/argoproj.io/v1alpha1/Rollout";

export function getRolloutStrategyLabel(strategy?: IRollout["spec"]["strategy"]): string {
  if (!strategy) {
    return "N/A";
  }
  if (strategy.canary) {
    return "Canary";
  }
  if (strategy.blueGreen) {
    return "BlueGreen";
  }
  return "Unknown";
}
