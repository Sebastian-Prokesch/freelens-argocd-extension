import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  ArgoWorkflowsClusterTemplatesTabContent,
  ArgoWorkflowsCronWorkflowsTabContent,
  ArgoWorkflowsTabContent,
  ArgoWorkflowsTemplatesTabContent,
} from "../workflows";

const workflowStore = {
  items: [
    {
      getName: () => "wf-demo",
      getNs: () => "argocd",
      getCreationTimestamp: () => "2026-01-01T00:00:00.000Z",
      getSearchFields: () => ["wf-demo", "argocd"],
      status: { phase: "Running" },
      spec: {},
    },
  ],
  api: {
    formatUrlForNotListing: ({ namespace, name }: { namespace: string; name: string }) =>
      `/apis/argoproj.io/v1alpha1/namespaces/${namespace}/workflows/${name}`,
  },
};

const cronWorkflowStore = {
  items: [
    {
      getName: () => "cron-demo",
      getNs: () => "argocd",
      getCreationTimestamp: () => "2026-01-01T00:00:00.000Z",
      getSearchFields: () => ["cron-demo", "argocd"],
      spec: { schedules: ["*/5 * * * *"], suspend: false },
      status: { active: [] },
    },
  ],
  api: {
    formatUrlForNotListing: ({ namespace, name }: { namespace: string; name: string }) =>
      `/apis/argoproj.io/v1alpha1/namespaces/${namespace}/cronworkflows/${name}`,
  },
};

const workflowTemplateStore = {
  items: [
    {
      getName: () => "tmpl-demo",
      getNs: () => "argocd",
      getCreationTimestamp: () => "2026-01-01T00:00:00.000Z",
      getSearchFields: () => ["tmpl-demo", "argocd"],
      spec: { entrypoint: "main" },
    },
  ],
  api: {
    formatUrlForNotListing: ({ namespace, name }: { namespace: string; name: string }) =>
      `/apis/argoproj.io/v1alpha1/namespaces/${namespace}/workflowtemplates/${name}`,
  },
};

const clusterWorkflowTemplateStore = {
  items: [
    {
      getName: () => "cluster-tmpl-demo",
      getCreationTimestamp: () => "2026-01-01T00:00:00.000Z",
      getSearchFields: () => ["cluster-tmpl-demo"],
      spec: { entrypoint: "main" },
    },
  ],
  api: {
    formatUrlForNotListing: ({ name }: { name: string }) =>
      `/apis/argoproj.io/v1alpha1/clusterworkflowtemplates/${name}`,
  },
};

jest.mock("../../k8s/workflows", () => ({
  ArgoWorkflow: {
    crd: { plural: "workflows", title: "Workflows" },
  },
  ArgoCronWorkflow: {
    crd: { plural: "cronworkflows", title: "CronWorkflows" },
  },
  ArgoWorkflowTemplate: {
    crd: { plural: "workflowtemplates", title: "WorkflowTemplates" },
  },
  ArgoClusterWorkflowTemplate: {
    crd: { plural: "clusterworkflowtemplates", title: "ClusterWorkflowTemplates" },
  },
  getArgoWorkflowStore: () => workflowStore,
  getArgoCronWorkflowStore: () => cronWorkflowStore,
  getArgoWorkflowTemplateStore: () => workflowTemplateStore,
  getArgoClusterWorkflowTemplateStore: () => clusterWorkflowTemplateStore,
  getWorkflowPhase: () => "Running",
  getArgoWorkflowProgress: () => "1/3",
  getArgoWorkflowDuration: () => "12s",
  getArgoWorkflowStatusReason: () => "N/A",
  getCronWorkflowSchedules: () => "*/5 * * * *",
  getCronWorkflowSuspendLabel: () => "No",
  getCronWorkflowActiveCount: () => 0,
  getCronWorkflowLastScheduled: () => "N/A",
}));

describe("Argo Workflows list pages", () => {
  it("links workflow name to workflow details", () => {
    render(
      <MemoryRouter>
        <ArgoWorkflowsTabContent />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "wf-demo" })).toHaveAttribute(
      "href",
      "/apis/argoproj.io/v1alpha1/namespaces/argocd/workflows/wf-demo",
    );
  });

  it("links cron workflow name to cron workflow details", () => {
    render(
      <MemoryRouter>
        <ArgoWorkflowsCronWorkflowsTabContent />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "cron-demo" })).toHaveAttribute(
      "href",
      "/apis/argoproj.io/v1alpha1/namespaces/argocd/cronworkflows/cron-demo",
    );
  });

  it("links workflow template name to template details", () => {
    render(
      <MemoryRouter>
        <ArgoWorkflowsTemplatesTabContent />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "tmpl-demo" })).toHaveAttribute(
      "href",
      "/apis/argoproj.io/v1alpha1/namespaces/argocd/workflowtemplates/tmpl-demo",
    );
  });

  it("links cluster workflow template name to cluster template details", () => {
    render(
      <MemoryRouter>
        <ArgoWorkflowsClusterTemplatesTabContent />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "cluster-tmpl-demo" })).toHaveAttribute(
      "href",
      "/apis/argoproj.io/v1alpha1/clusterworkflowtemplates/cluster-tmpl-demo",
    );
  });
});
