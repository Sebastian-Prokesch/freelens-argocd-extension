/**
 * Cluster page and sidebar menu registration for the Argo umbrella (ArgoCD + future products).
 *
 * Adding a new Argo product: define routes in `routes/argo-routes.ts`, add k8s types under
 * `k8s/<product>/`, add pages/details/menus, then append entries here and in `index.tsx` if needed.
 */

import { Renderer } from "@freelensapp/extensions";
import { ArgoPlainLogoIcon } from "../icons";
import { ArgoApplication, ArgoApplicationSet, ArgoAppProject } from "../k8s/argocd";
import {
  ArgoApplicationSetsPage,
  ArgoApplicationsPage,
  ArgoAppProjectsPage,
  ArgoConfigPage,
  ArgoLandingPage,
  ArgoOverviewPage,
  ArgoRolloutsAnalysisRunsPage,
  ArgoRolloutsRolloutsPage,
  ArgoWorkflowsCronWorkflowsPage,
  ArgoWorkflowsWorkflowsPage,
} from "../pages";
import { ArgoPageIds } from "../routes/argo-page-ids";
import { ArgoRoutes, LegacyArgoCdRoutes } from "../routes/argo-routes";

export { ArgoPageIds };

export function buildClusterPages(extension: Renderer.LensExtension) {
  return [
    {
      id: ArgoPageIds.landing,
      routePath: ArgoRoutes.landing,
      components: {
        Page: () => <ArgoLandingPage />,
      },
    },
    {
      id: ArgoPageIds.argocdRoot,
      routePath: ArgoRoutes.argocd.root,
      components: {
        Page: () => <ArgoOverviewPage />,
      },
    },
    {
      id: ArgoPageIds.argocdOverview,
      routePath: ArgoRoutes.argocd.overview,
      components: {
        Page: () => <ArgoOverviewPage />,
      },
    },
    {
      id: ArgoApplication.crd.plural,
      routePath: ArgoRoutes.argocd.applications,
      components: {
        Page: () => <ArgoApplicationsPage extension={extension} />,
      },
    },
    {
      id: ArgoApplicationSet.crd.plural,
      routePath: ArgoRoutes.argocd.applicationsets,
      components: {
        Page: () => <ArgoApplicationSetsPage extension={extension} />,
      },
    },
    {
      id: ArgoAppProject.crd.plural,
      routePath: ArgoRoutes.argocd.appprojects,
      components: {
        Page: () => <ArgoAppProjectsPage extension={extension} />,
      },
    },
    {
      id: ArgoPageIds.argocdConfig,
      routePath: ArgoRoutes.argocd.config,
      components: {
        Page: () => <ArgoConfigPage extension={extension} />,
      },
    },
    {
      id: ArgoPageIds.workflowsRoot,
      routePath: ArgoRoutes.workflows.workflows,
      components: {
        Page: () => <ArgoWorkflowsWorkflowsPage />,
      },
    },
    {
      id: ArgoPageIds.workflowsCron,
      routePath: ArgoRoutes.workflows.cronWorkflows,
      components: {
        Page: () => <ArgoWorkflowsCronWorkflowsPage />,
      },
    },
    {
      id: ArgoPageIds.rolloutsRoot,
      routePath: ArgoRoutes.rollouts.rollouts,
      components: {
        Page: () => <ArgoRolloutsRolloutsPage />,
      },
    },
    {
      id: ArgoPageIds.rolloutsAnalysis,
      routePath: ArgoRoutes.rollouts.analysisRuns,
      components: {
        Page: () => <ArgoRolloutsAnalysisRunsPage />,
      },
    },
    // Legacy `/argocd/*` — same UI as above; keeps old bookmarks working.
    {
      id: ArgoPageIds.legacyArgocdRoot,
      routePath: LegacyArgoCdRoutes.root,
      components: {
        Page: () => <ArgoOverviewPage />,
      },
    },
    {
      id: ArgoPageIds.legacyArgocdOverview,
      routePath: LegacyArgoCdRoutes.overview,
      components: {
        Page: () => <ArgoOverviewPage />,
      },
    },
    {
      id: `${ArgoApplication.crd.plural}-legacy`,
      routePath: LegacyArgoCdRoutes.applications,
      components: {
        Page: () => <ArgoApplicationsPage extension={extension} />,
      },
    },
    {
      id: `${ArgoApplicationSet.crd.plural}-legacy`,
      routePath: LegacyArgoCdRoutes.applicationsets,
      components: {
        Page: () => <ArgoApplicationSetsPage extension={extension} />,
      },
    },
    {
      id: `${ArgoAppProject.crd.plural}-legacy`,
      routePath: LegacyArgoCdRoutes.appprojects,
      components: {
        Page: () => <ArgoAppProjectsPage extension={extension} />,
      },
    },
    {
      id: ArgoPageIds.legacyArgocdConfig,
      routePath: LegacyArgoCdRoutes.config,
      components: {
        Page: () => <ArgoConfigPage extension={extension} />,
      },
    },
  ];
}

export function buildClusterPageMenus() {
  return [
    {
      id: "argo",
      title: "Argo",
      target: { pageId: ArgoPageIds.landing },
      components: {
        Icon: ArgoPlainLogoIcon,
      },
    },
    {
      id: "argo-argocd",
      parentId: "argo",
      title: "ArgoCD",
      target: { pageId: ArgoPageIds.argocdOverview },
      components: {},
    },
    {
      id: "argocd-overview-menu",
      parentId: "argo-argocd",
      title: "Overview",
      target: { pageId: ArgoPageIds.argocdOverview },
      components: {},
    },
    {
      id: ArgoApplication.crd.plural,
      parentId: "argo-argocd",
      title: ArgoApplication.crd.title,
      target: { pageId: ArgoApplication.crd.plural },
      components: {},
    },
    {
      id: ArgoApplicationSet.crd.plural,
      parentId: "argo-argocd",
      title: ArgoApplicationSet.crd.title,
      target: { pageId: ArgoApplicationSet.crd.plural },
      components: {},
    },
    {
      id: ArgoAppProject.crd.plural,
      parentId: "argo-argocd",
      title: ArgoAppProject.crd.title,
      target: { pageId: ArgoAppProject.crd.plural },
      components: {},
    },
    {
      id: "argocd-config-menu",
      parentId: "argo-argocd",
      title: "Config",
      target: { pageId: ArgoPageIds.argocdConfig },
      components: {},
    },
    {
      id: "argo-workflows",
      parentId: "argo",
      title: "Argo Workflows",
      target: { pageId: ArgoPageIds.workflowsRoot },
      components: {},
    },
    {
      id: "argo-workflows-workflows-menu",
      parentId: "argo-workflows",
      title: "Workflows",
      target: { pageId: ArgoPageIds.workflowsRoot },
      components: {},
    },
    {
      id: "argo-workflows-cron-menu",
      parentId: "argo-workflows",
      title: "CronWorkflows",
      target: { pageId: ArgoPageIds.workflowsCron },
      components: {},
    },
    {
      id: "argo-rollouts",
      parentId: "argo",
      title: "Argo Rollouts",
      target: { pageId: ArgoPageIds.rolloutsRoot },
      components: {},
    },
    {
      id: "argo-rollouts-rollouts-menu",
      parentId: "argo-rollouts",
      title: "Rollouts",
      target: { pageId: ArgoPageIds.rolloutsRoot },
      components: {},
    },
    {
      id: "argo-rollouts-analysis-menu",
      parentId: "argo-rollouts",
      title: "AnalysisRuns",
      target: { pageId: ArgoPageIds.rolloutsAnalysis },
      components: {},
    },
  ];
}
