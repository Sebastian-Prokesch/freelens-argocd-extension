import { Renderer } from "@freelensapp/extensions";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as rolloutsModule from "../../k8s/rollouts";
import { ArgoRolloutDetails } from "../argo-rollout-details";

import type { Mock } from "vitest";

const extension = { name: "argocd-test-extension" } as any;

vi.mock("../../k8s/rollouts", async () => {
  const actual = await vi.importActual<any>("../../k8s/rollouts");
  const requestPatchMock = vi.fn().mockResolvedValue({});
  const patchMock = vi.fn().mockResolvedValue(undefined);
  const mockStore = {
    patch: patchMock,
    api: {
      formatUrlForNotListing: vi.fn(() => "/apis/argoproj.io/v1alpha1/namespaces/default/rollouts/demo-rollout"),
      request: { patch: requestPatchMock },
    },
  };
  return {
    ...actual,
    getArgoRolloutStore: vi.fn(() => mockStore),
    __TEST_PROMOTE_PATCH__: { requestPatchMock, patchMock },
  };
});

const getPromoteMocks = () =>
  (rolloutsModule as any).__TEST_PROMOTE_PATCH__ as {
    requestPatchMock: Mock;
    patchMock: Mock;
  };

describe("ArgoRolloutDetails", () => {
  beforeEach(() => {
    const { patchMock, requestPatchMock } = getPromoteMocks();
    patchMock.mockClear();
    requestPatchMock.mockClear();
    requestPatchMock.mockResolvedValue({});
    (Renderer.Component.ConfirmDialog.confirm as Mock).mockReset();
    (Renderer.Component.Notifications.ok as Mock).mockReset();
    (Renderer.Component.Notifications.error as Mock).mockReset();
  });

  it("renders strategy and replica summary", () => {
    render(
      <>
        <ArgoRolloutDetails
          extension={extension}
          object={
            {
              spec: {
                replicas: 5,
                strategy: { blueGreen: { activeService: "svc-active", previewService: "svc-preview" } },
              },
              status: {
                replicas: 5,
                updatedReplicas: 5,
                readyReplicas: 4,
                availableReplicas: 4,
                phase: "Paused",
                currentPodHash: "abcd1234",
                stableRS: "rs-stable",
              },
            } as any
          }
        />
      </>,
    );

    expect(screen.getByText("Strategy")).toBeInTheDocument();
    expect(screen.getAllByText("BlueGreen").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Replicas (spec)")).toBeInTheDocument();
    expect(screen.getAllByText("5").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Phase")).toBeInTheDocument();
    expect(screen.getAllByText("Paused").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Current pod hash").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("abcd1234").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Stable RS").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("rs-stable").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("BlueGreen Status")).toBeInTheDocument();
    expect(screen.getByText("Promotion state")).toBeInTheDocument();
  });

  it("shows paused when pauseConditions exist", () => {
    render(
      <>
        <ArgoRolloutDetails
          extension={extension}
          object={
            {
              spec: {},
              status: {
                pauseConditions: [{ reason: "CanaryPauseStep", startTime: "2025-01-01T00:00:00Z" }],
              },
            } as any
          }
        />
      </>,
    );

    expect(screen.getAllByText("Paused").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Yes").length).toBeGreaterThanOrEqual(1);
  });

  it("shows promote and promote full for promotable pause", () => {
    render(
      <>
        <ArgoRolloutDetails
          extension={extension}
          object={
            {
              getName: () => "demo-rollout",
              spec: { paused: false },
              status: {
                phase: "Paused",
                pauseConditions: [{ reason: "CanaryPauseStep", startTime: "2025-01-01T00:00:00Z" }],
              },
            } as any
          }
        />
      </>,
    );

    expect(screen.getByRole("button", { name: /^Promote$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Promote full" })).toBeInTheDocument();
  });

  it("does not show promote button for manual pause only", () => {
    render(
      <>
        <ArgoRolloutDetails
          extension={extension}
          object={
            {
              spec: { paused: true },
              status: {
                phase: "Paused",
                pauseConditions: [],
              },
            } as any
          }
        />
      </>,
    );

    expect(screen.queryByRole("button", { name: "Promote" })).not.toBeInTheDocument();
  });

  it("shows abort button for progressing rollout and triggers patch", async () => {
    (Renderer.Component.ConfirmDialog.confirm as Mock).mockResolvedValueOnce(true);
    const user = userEvent.setup();
    const object = {
      getName: () => "demo-rollout",
      getNs: () => "default",
      status: {
        phase: "Progressing",
      },
    } as any;

    render(
      <>
        <ArgoRolloutDetails extension={extension} object={object} />
      </>,
    );

    const abortButton = screen.getByRole("button", { name: "Abort" });
    expect(abortButton).toBeInTheDocument();

    await user.click(abortButton);

    expect(getPromoteMocks().requestPatchMock).toHaveBeenCalledWith(
      "/apis/argoproj.io/v1alpha1/namespaces/default/rollouts/demo-rollout/status",
      {
        data: {
          status: { abort: true },
        },
      },
      expect.objectContaining({
        headers: { "content-type": "application/merge-patch+json" },
      }),
    );
    expect(getPromoteMocks().patchMock).not.toHaveBeenCalled();
    expect(Renderer.Component.ConfirmDialog.confirm).toHaveBeenCalledWith({
      labelOk: "Abort Rollout",
      message: "Abort rollout demo-rollout? This interrupts the ongoing rollout operation.",
    });
  });

  it("shows retry button for degraded rollout and triggers patch", () => {
    const object = {
      getName: () => "demo-rollout",
      getNs: () => "default",
      status: {
        phase: "Degraded",
        message: "analysis failed",
      },
    } as any;

    render(
      <>
        <ArgoRolloutDetails extension={extension} object={object} />
      </>,
    );

    const retryButton = screen.getByRole("button", { name: "Retry" });
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);

    expect(getPromoteMocks().requestPatchMock).toHaveBeenCalledWith(
      "/apis/argoproj.io/v1alpha1/namespaces/default/rollouts/demo-rollout/status",
      {
        data: {
          status: { abort: false },
        },
      },
      expect.objectContaining({
        headers: { "content-type": "application/merge-patch+json" },
      }),
    );
    expect(getPromoteMocks().patchMock).not.toHaveBeenCalled();
  });

  it("shows abort error notification when abort request fails", async () => {
    const { requestPatchMock } = getPromoteMocks();
    requestPatchMock.mockRejectedValueOnce(new Error("abort denied"));
    (Renderer.Component.ConfirmDialog.confirm as Mock).mockResolvedValueOnce(true);
    const user = userEvent.setup();

    render(
      <>
        <ArgoRolloutDetails
          extension={extension}
          object={
            {
              getName: () => "demo-rollout",
              getNs: () => "default",
              status: {
                phase: "Progressing",
              },
            } as any
          }
        />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Abort" }));

    expect(Renderer.Component.Notifications.error).toHaveBeenCalledWith("abort denied");
  });

  it("does not patch when abort confirmation is cancelled", async () => {
    const { patchMock } = getPromoteMocks();
    (Renderer.Component.ConfirmDialog.confirm as Mock).mockResolvedValueOnce(false);
    const user = userEvent.setup();

    render(
      <>
        <ArgoRolloutDetails
          extension={extension}
          object={
            {
              getName: () => "demo-rollout",
              status: {
                phase: "Progressing",
              },
            } as any
          }
        />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Abort" }));

    expect(patchMock).not.toHaveBeenCalled();
    expect(Renderer.Component.Notifications.ok).not.toHaveBeenCalled();
    expect(Renderer.Component.Notifications.error).not.toHaveBeenCalled();
  });
});
