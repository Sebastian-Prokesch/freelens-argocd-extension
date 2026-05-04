/**
 * Stable cluster page ids — must match `buildClusterPages` in registration.
 */
export const ArgoPageIds = {
  landing: "argo-root",
  argocdRoot: "argo-argocd-root",
  argocdOverview: "argocd-overview",
  argocdConfig: "argocd-config",
  workflowsRoot: "argo-workflows-root",
  workflowsCron: "argo-workflows-cron-workflows",
  legacyArgocdRoot: "argocd-root-legacy",
  legacyArgocdOverview: "argocd-overview-legacy",
  legacyArgocdConfig: "argocd-config-legacy",
} as const;

export type ArgoProductTab = "argocd" | "workflows" | "rollouts";
