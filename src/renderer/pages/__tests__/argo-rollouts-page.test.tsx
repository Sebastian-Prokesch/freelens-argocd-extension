import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ArgoRolloutsTabContent } from "../rollouts/rollouts-rollouts-page";

const canaryRollout = {
  getName: () => "demo-rollout",
  getNs: () => "default",
  getCreationTimestamp: () => "2025-01-01T00:00:00.000Z",
  getSearchFields: () => ["demo-rollout", "default"],
  spec: {
    replicas: 3,
    strategy: { canary: { steps: [] } },
  },
  status: {
    replicas: 3,
    updatedReplicas: 2,
    readyReplicas: 2,
    availableReplicas: 2,
    phase: "Healthy",
  },
};

const blueGreenRollout = {
  getName: () => "bg-rollout",
  getNs: () => "prod",
  getCreationTimestamp: () => "2025-01-02T00:00:00.000Z",
  getSearchFields: () => ["bg-rollout", "prod"],
  spec: {
    replicas: 2,
    strategy: { blueGreen: {} },
  },
  status: {
    replicas: 2,
    updatedReplicas: 1,
    readyReplicas: 1,
    availableReplicas: 1,
    phase: "Paused",
    stableRS: "rs-aaa",
    currentPodHash: "bbb",
    blueGreen: {
      activeSelector: "role=active",
      previewSelector: "role=preview",
    },
  },
};

const mockItems = [canaryRollout, blueGreenRollout];

const mockStore = {
  items: mockItems,
  api: {
    formatUrlForNotListing: ({ namespace, name }: { namespace: string; name: string }) =>
      `/apis/argoproj.io/v1alpha1/namespaces/${namespace}/rollouts/${name}`,
  },
};

jest.mock("../../k8s/rollouts", () => ({
  ArgoRollout: {
    crd: {
      plural: "rollouts",
      title: "Argo Rollouts",
    },
  },
  getArgoRolloutStore: () => mockStore,
  getRolloutStrategyLabel: jest.requireActual("../../k8s/rollouts/strategy").getRolloutStrategyLabel,
  getBlueGreenPromotionLabel: jest.requireActual("../../k8s/rollouts/state").getBlueGreenPromotionLabel,
  getBlueGreenTrafficTooltip: jest.requireActual("../../k8s/rollouts/state").getBlueGreenTrafficTooltip,
  getRolloutStateLabel: jest.requireActual("../../k8s/rollouts/state").getRolloutStateLabel,
  getRolloutStateReason: jest.requireActual("../../k8s/rollouts/state").getRolloutStateReason,
}));

describe("ArgoRolloutsTabContent", () => {
  it("links rollout name to rollout details", () => {
    render(
      <MemoryRouter>
        <ArgoRolloutsTabContent />
      </MemoryRouter>,
    );

    const nameLink = screen.getByRole("link", { name: "demo-rollout" });

    expect(nameLink).toHaveAttribute("href", "/apis/argoproj.io/v1alpha1/namespaces/default/rollouts/demo-rollout");
  });

  it("links namespace to namespace details", () => {
    render(
      <MemoryRouter>
        <ArgoRolloutsTabContent />
      </MemoryRouter>,
    );

    const namespaceLink = screen.getByRole("link", { name: "default" });

    expect(namespaceLink).toHaveAttribute("href", "/api/v1/namespaces/default");
  });

  it("renders derived rollout state", () => {
    render(
      <MemoryRouter>
        <ArgoRolloutsTabContent />
      </MemoryRouter>,
    );

    expect(screen.getByText("Healthy")).toBeInTheDocument();
  });

  it("renders blue-green traffic indicator", () => {
    render(
      <MemoryRouter>
        <ArgoRolloutsTabContent />
      </MemoryRouter>,
    );

    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("passes blue-green traffic tooltip to WithTooltip on Traffic column", () => {
    render(
      <MemoryRouter>
        <ArgoRolloutsTabContent />
      </MemoryRouter>,
    );

    const trafficTooltips = screen
      .getAllByTestId("WithTooltip")
      .map((element) => element.getAttribute("data-tooltip"))
      .filter((value): value is string => Boolean(value?.includes("phase=Paused")));

    expect(trafficTooltips).toHaveLength(1);
    expect(trafficTooltips[0]).toContain("active=role=active");
    expect(trafficTooltips[0]).toContain("preview=role=preview");
    expect(trafficTooltips[0]).toContain("stable=rs-aaa");
    expect(trafficTooltips[0]).toContain("current=bbb");
  });
});
