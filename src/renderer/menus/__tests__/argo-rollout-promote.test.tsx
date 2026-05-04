import { render, screen } from "@testing-library/react";
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
  };
});

const extension = { name: "argocd-test-extension" } as any;

describe("ArgoRolloutPromoteMenuItem", () => {
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
