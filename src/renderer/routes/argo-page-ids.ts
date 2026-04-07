/**
 * Stable cluster page ids — must match `buildClusterPages` in registration.
 */
export const ArgoPageIds = {
  landing: "argo-root",
  argocdRoot: "argo-argocd-root",
  workflowsRoot: "argo-workflows-root",
  workflowsCron: "argo-workflows-cron-workflows",
  rolloutsRoot: "argo-rollouts-root",
  rolloutsAnalysis: "argo-rollouts-analysis-runs",
  legacyArgocdRoot: "argocd-root-legacy",
} as const;

export type ArgoProductTab = "argocd" | "workflows" | "rollouts";
