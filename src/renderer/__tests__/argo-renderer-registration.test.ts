jest.mock("../../common/store", () => ({
  ArgoPreferencesStore: {
    getInstanceOrCreate: () => ({
      loadExtension: () => {},
    }),
  },
}));

jest.mock("../icons", () => ({
  ArgoPlainLogoIcon: () => null,
}));

jest.mock("../preferences", () => ({
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
    expect(components[0]?.id).toBe("argocd-config-dialog");
    expect(components[0]?.Component).toBeDefined();
    expect(typeof components[0]?.shouldRender?.get).toBe("function");
  });

  it("registers AppProject page and menu entries", () => {
    const renderer = createRenderer();

    const pageIds = renderer.clusterPages.map((page: any) => page.id);
    const pageRoutes = renderer.clusterPages.map((page: any) => page.routePath);
    const menuIds = renderer.clusterPageMenus.map((menu: any) => menu.id);

    expect(pageIds).toContain("appprojects");
    expect(pageIds).toContain("applicationsets");
    expect(pageIds).toContain("rollouts");
    expect(pageIds).toContain("argo-workflows-root");
    expect(pageIds).toContain("argo-workflows-cron-workflows");
    expect(pageIds).toContain("argo-workflows-templates");
    expect(pageIds).toContain("argo-workflows-cluster-templates");
    expect(pageRoutes).toContain("/argo/argocd/appprojects");
    expect(pageRoutes).toContain("/argo/argocd/applicationsets");
    expect(pageRoutes).toContain("/argo/workflows");
    expect(pageRoutes).toContain("/argo/workflows/cron-workflows");
    expect(pageRoutes).toContain("/argo/workflows/workflow-templates");
    expect(pageRoutes).toContain("/argo/workflows/cluster-workflow-templates");
    expect(pageRoutes).toContain("/argocd/appprojects");
    expect(pageRoutes).toContain("/argocd/applicationsets");
    expect(menuIds).toContain("appprojects");
    expect(menuIds).toContain("applicationsets");
    expect(menuIds).toContain("argo-workflows-workflows-menu");
    expect(menuIds).toContain("argo-workflows-cron-menu");
    expect(menuIds).toContain("argo-workflows-templates-menu");
    expect(menuIds).toContain("argo-workflows-cluster-templates-menu");
  });

  it("registers Application and AppProject detail items", () => {
    const renderer = createRenderer();
    const detailKinds = renderer.kubeObjectDetailItems.map((item: any) => item.kind);

    expect(detailKinds).toContain("Application");
    expect(detailKinds).toContain("ApplicationSet");
    expect(detailKinds).toContain("AppProject");
    expect(detailKinds).toContain("Rollout");
    expect(detailKinds).toContain("Workflow");
    expect(detailKinds).toContain("CronWorkflow");
    expect(detailKinds).toContain("WorkflowTemplate");
    expect(detailKinds).toContain("ClusterWorkflowTemplate");
  });

  it("registers sync, terminate and rollback menu items for applications", () => {
    const renderer = createRenderer();
    const applicationMenuItems = renderer.kubeObjectMenuItems.filter((item: any) => item.kind === "Application");

    expect(applicationMenuItems.length).toBeGreaterThanOrEqual(3);
  });

  it("registers promote, abort and retry menu items for rollouts", () => {
    const renderer = createRenderer();
    const rolloutMenuItems = renderer.kubeObjectMenuItems.filter((item: any) => item.kind === "Rollout");

    expect(rolloutMenuItems.length).toBeGreaterThanOrEqual(6);
  });

  it("registers workflow and cron workflow menu actions", () => {
    const renderer = createRenderer();
    const workflowMenuItems = renderer.kubeObjectMenuItems.filter((item: any) => item.kind === "Workflow");
    const cronWorkflowMenuItems = renderer.kubeObjectMenuItems.filter((item: any) => item.kind === "CronWorkflow");

    expect(workflowMenuItems.length).toBeGreaterThanOrEqual(5);
    expect(cronWorkflowMenuItems.length).toBeGreaterThanOrEqual(2);
  });
});
