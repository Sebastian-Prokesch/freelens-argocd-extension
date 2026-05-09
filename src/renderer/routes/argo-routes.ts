/**
 * Cluster page route paths for the Argo umbrella menu.
 * These are matched by the Freelens cluster frame router (hash URL).
 */
export const ArgoRoutes = {
  landing: "/argo",
  argocd: {
    root: "/argo/argocd",
    overview: "/argo/argocd/overview",
    applications: "/argo/argocd/applications",
    applicationsets: "/argo/argocd/applicationsets",
    appprojects: "/argo/argocd/appprojects",
    config: "/argo/argocd/config",
  },
  workflows: {
    workflows: "/argo/workflows",
    cronWorkflows: "/argo/workflows/cron-workflows",
    workflowTemplates: "/argo/workflows/workflow-templates",
    clusterWorkflowTemplates: "/argo/workflows/cluster-workflow-templates",
  },
  rollouts: {
    overview: "/argo/rollouts/overview",
    rollouts: "/argo/rollouts",
    analysisRuns: "/argo/rollouts/analysis-runs",
    experiments: "/argo/rollouts/experiments",
    analysisTemplates: "/argo/rollouts/analysis-templates",
    clusterAnalysisTemplates: "/argo/rollouts/cluster-analysis-templates",
  },
} as const;

/** Previous default paths; kept registered so old bookmarks and deep links keep working. */
export const LegacyArgoCdRoutes = {
  root: "/argocd",
  overview: "/argocd/overview",
  applications: "/argocd/applications",
  applicationsets: "/argocd/applicationsets",
  appprojects: "/argocd/appprojects",
  config: "/argocd/config",
} as const;
