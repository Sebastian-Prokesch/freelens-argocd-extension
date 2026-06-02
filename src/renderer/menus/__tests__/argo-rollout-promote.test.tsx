import { Renderer } from "@freelensapp/extensions";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ArgoRolloutPromoteFullMenuItem,
  ArgoRolloutPromoteMenuItem,
  ArgoRolloutPromoteSkipAllMenuItem,
  ArgoRolloutPromoteSkipCurrentMenuItem,
} from "../argo-rollout-promote";

jest.mock("../../k8s/rollouts", () => {
  const actual = jest.requireActual("../../k8s/rollouts");
  const mockStore = {
    patch: jest.fn().mockResolvedValue(undefined),
    api: {
      formatUrlForNotListing: jest.fn(() => "/apis/argoproj.io/v1alpha1/namespaces/default/rollouts/demo-rollout"),
      request: { patch: jest.fn().mockResolvedValue({}) },
    },
  };
  return {
    ...actual,
    getArgoRolloutStore: jest.fn(() => mockStore),
    __TEST_PROMOTE_PATCH__: mockStore.api.request.patch,
  };
});

const extension = { name: "argocd-test-extension" } as any;
const getPromotePatchMock = () => (jest.requireMock("../../k8s/rollouts") as any).__TEST_PROMOTE_PATCH__ as jest.Mock;

describe("ArgoRolloutPromoteMenuItem", () => {
  beforeEach(() => {
    getPromotePatchMock().mockReset();
    getPromotePatchMock().mockResolvedValue({});
    (Renderer.Component.Notifications.ok as jest.Mock).mockReset();
    (Renderer.Component.Notifications.error as jest.Mock).mockReset();
  });

  it("renders when rollout is in promotable paused state", () => {
    render(
      <ArgoRolloutPromoteMenuItem
        object={
          {
            spec: { paused: false },
            status: {
              phase: "Paused",
              pauseConditions: [{ reason: "CanaryPauseStep" }],
            },
          } as any
        }
        extension={extension}
      />,
    );

    expect(screen.getByText("Promote")).toBeInTheDocument();
  });

  it("promotes and shows success notification", async () => {
    const user = userEvent.setup();

    render(
      <ArgoRolloutPromoteMenuItem
        object={
          {
            getName: () => "demo-rollout",
            getNs: () => "default",
            spec: { paused: false },
            status: {
              phase: "Paused",
              pauseConditions: [{ reason: "CanaryPauseStep" }],
            },
          } as any
        }
        extension={extension}
      />,
    );

    await user.click(screen.getByText("Promote"));

    expect(getPromotePatchMock()).toHaveBeenCalled();
    expect(Renderer.Component.Notifications.ok).toHaveBeenCalledWith("Promote requested for demo-rollout");
  });

  it("shows fallback message when promotion fails with non-Error", async () => {
    getPromotePatchMock().mockRejectedValueOnce({ code: 403 });
    const user = userEvent.setup();

    render(
      <ArgoRolloutPromoteMenuItem
        object={
          {
            getName: () => "demo-rollout",
            getNs: () => "default",
            spec: { paused: false },
            status: {
              phase: "Paused",
              pauseConditions: [{ reason: "CanaryPauseStep" }],
            },
          } as any
        }
        extension={extension}
      />,
    );

    await user.click(screen.getByText("Promote"));

    expect(Renderer.Component.Notifications.error).toHaveBeenCalledWith("Failed to promote rollout.");
  });
});

describe("ArgoRolloutPromoteFullMenuItem", () => {
  it("renders when rollout is progressing", () => {
    render(
      <ArgoRolloutPromoteFullMenuItem
        object={
          {
            spec: { paused: false },
            status: { phase: "Progressing", currentPodHash: "a", stableRS: "b" },
          } as any
        }
        extension={extension}
      />,
    );

    expect(screen.getByText("Promote full")).toBeInTheDocument();
  });
});

describe("ArgoRolloutPromoteSkipCurrentMenuItem", () => {
  it("renders for progressing canary with steps", () => {
    render(
      <ArgoRolloutPromoteSkipCurrentMenuItem
        object={
          {
            spec: { strategy: { canary: { steps: [{ pause: {} }] } }, paused: false },
            status: { phase: "Progressing", currentStepIndex: 0 },
          } as any
        }
        extension={extension}
      />,
    );

    expect(screen.getByText("Promote (skip current step)")).toBeInTheDocument();
  });
});

describe("ArgoRolloutPromoteSkipAllMenuItem", () => {
  it("renders for progressing canary with steps", () => {
    render(
      <ArgoRolloutPromoteSkipAllMenuItem
        object={
          {
            spec: { strategy: { canary: { steps: [{ pause: {} }, { pause: {} }] } }, paused: false },
            status: { phase: "Progressing", currentStepIndex: 0 },
          } as any
        }
        extension={extension}
      />,
    );

    expect(screen.getByText("Promote (skip all steps)")).toBeInTheDocument();
  });
});
