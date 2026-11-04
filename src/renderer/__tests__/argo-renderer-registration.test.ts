vi.mock("../../common/store", () => ({
  ArgoPreferencesStore: {
    getInstanceOrCreate: () => ({
      loadExtension: () => {},
    }),
  },
}));

vi.mock("../icons", () => ({
  ArgoPlainLogoIcon: () => null,
}));

vi.mock("../preferences", () => ({
  ArgoPreferenceInput: () => null,
  ArgoPreferenceHint: () => null,
}));

import ArgoRenderer from "../index";

const createRenderer = () =>
  new (ArgoRenderer as any)(
    {
      logger: {
        info: () => {},
        warn: () => {},
        error: () => {},
      },
      ensureHashedDirectoryForExtension: async () => "/tmp",
    },
    {
      id: "argocd-test-extension",
      manifest: {
        name: "argocd-test-extension",
        version: "0.0.0",
        main: "out/main/index.js",
        renderer: "out/renderer/index.js",
      },
      manifestPath: "/tmp/manifest.yml",
      isBundled: false,
    },
  );

describe("ArgoRenderer registrations", () => {
  it("registers cluster frame components with computed shouldRender", () => {
    const renderer = createRenderer();
    const components = renderer.clusterFrameComponents;

    expect(Array.isArray(components)).toBe(true);
    expect(components).toHaveLength(4);
    expect(components[0]?.id).toBe("argocd-config-dialog");
    expect(components[1]?.id).toBe("argocd-application-sync-dialog");
    expect(components[2]?.id).toBe("argocd-api-application-drawer");
    expect(components[3]?.id).toBe("argocd-api-appproject-drawer");
    expect(components[0]?.Component).toBeDefined();
    expect(typeof components[0]?.shouldRender?.get).toBe("function");
  });

  it("registers AppProject page and menu entries", () => {
    const renderer = createRenderer();

    const pageIds = renderer.clusterPages.map((page: any) => page.id);
    const menuIds = renderer.clusterPageMenus.map((menu: any) => menu.id);

    expect(pageIds).toContain("appprojects");
    expect(pageIds).toContain("applicationsets");
    expect(pageIds).toContain("argocd-application-api-details");
    expect(pageIds).toContain("rollouts");
    expect(pageIds).toContain("argo-rollouts-overview");
    expect(pageIds).toContain("analysisruns");
    expect(pageIds).toContain("experiments");
    expect(pageIds).toContain("analysistemplates");
    expect(pageIds).toContain("clusteranalysistemplates");
    expect(pageIds).toContain("argo-workflows-root");
    expect(pageIds).toContain("argo-workflows-cron-workflows");
    expect(pageIds).toContain("argo-workflows-templates");
    expect(pageIds).toContain("argo-workflows-cluster-templates");
    // Freelens 2 pages are keyed by id and params only; `routePath` was a Freelens 1 field.
    expect(renderer.clusterPages.every((page: any) => page.routePath === undefined)).toBe(true);
    expect(
      Object.keys(renderer.clusterPages.find((page: any) => page.id === "argocd-application-api-details").params),
    ).toEqual(["namespace", "name"]);
    // Every menu entry that targets a page must point at a registered page id.
    const menuTargets = renderer.clusterPageMenus
      .map((menu: any) => menu.target?.pageId)
      .filter((pageId: string | undefined): pageId is string => Boolean(pageId));
    for (const pageId of menuTargets) {
      expect(pageIds).toContain(pageId);
    }
    expect(menuIds).toContain("appprojects");
    expect(menuIds).toContain("applicationsets");
    expect(menuIds).toContain("argo-workflows-workflows-menu");
    expect(menuIds).toContain("argo-workflows-cron-menu");
    expect(menuIds).toContain("argo-workflows-templates-menu");
    expect(menuIds).toContain("argo-workflows-cluster-templates-menu");
    expect(menuIds).toContain("argo-rollouts-overview-menu");
    expect(menuIds).toContain("argo-rollouts-analysis-runs-menu");
    expect(menuIds).toContain("argo-rollouts-experiments-menu");
    expect(menuIds).toContain("argo-rollouts-analysis-templates-menu");
    expect(menuIds).toContain("argo-rollouts-cluster-analysis-templates-menu");
  });

  it("registers Argo CD connection preferences", () => {
    const renderer = createRenderer();

    expect(renderer.appPreferences).toHaveLength(1);
    expect(renderer.appPreferences[0]?.title).toBe("Argo CD Connection");
    expect(renderer.appPreferences[0]?.components?.Input).toBeDefined();
    expect(renderer.appPreferences[0]?.components?.Hint).toBeDefined();
  });

  it("registers Application and AppProject detail items", () => {
    const renderer = createRenderer();
    const detailKinds = renderer.kubeObjectDetailItems.map((item: any) => item.kind);

    expect(detailKinds).toContain("Application");
    expect(detailKinds).toContain("ApplicationSet");
    expect(detailKinds).toContain("AppProject");
    expect(detailKinds).toContain("Rollout");
    expect(detailKinds).toContain("AnalysisTemplate");
    expect(detailKinds).toContain("ClusterAnalysisTemplate");
    expect(detailKinds).toContain("AnalysisRun");
    expect(detailKinds).toContain("Experiment");
    expect(detailKinds).toContain("Workflow");
    expect(detailKinds).toContain("CronWorkflow");
    expect(detailKinds).toContain("WorkflowTemplate");
    expect(detailKinds).toContain("ClusterWorkflowTemplate");
  });

  it("registers refresh, hard refresh, sync, adv sync and terminate menu items for applications", () => {
    const renderer = createRenderer();
    const applicationMenuItems = renderer.kubeObjectMenuItems.filter((item: any) => item.kind === "Application");

    expect(applicationMenuItems.length).toBeGreaterThanOrEqual(5);
  });

  it("registers promote, abort and retry menu items for rollouts", () => {
    const renderer = createRenderer();
    const rolloutMenuItems = renderer.kubeObjectMenuItems.filter((item: any) => item.kind === "Rollout");

    expect(rolloutMenuItems.length).toBeGreaterThanOrEqual(6);
  });

  it("does not register workflow and cron workflow mutation menu actions", () => {
    const renderer = createRenderer();
    const workflowMenuItems = renderer.kubeObjectMenuItems.filter((item: any) => item.kind === "Workflow");
    const cronWorkflowMenuItems = renderer.kubeObjectMenuItems.filter((item: any) => item.kind === "CronWorkflow");

    expect(workflowMenuItems).toHaveLength(0);
    expect(cronWorkflowMenuItems).toHaveLength(0);
  });
});
