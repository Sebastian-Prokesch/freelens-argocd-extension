import { Renderer } from "@freelensapp/extensions";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ArgoRolloutDetails } from "../argo-rollout-details";

const extension = { name: "argocd-test-extension" } as any;

jest.mock("../../k8s/rollouts", () => {
  const actual = jest.requireActual("../../k8s/rollouts");
  const requestPatchMock = jest.fn().mockResolvedValue({});
  const patchMock = jest.fn().mockResolvedValue(undefined);
  const mockStore = {
    patch: patchMock,
    api: {
      formatUrlForNotListing: jest.fn(() => "/apis/argoproj.io/v1alpha1/namespaces/default/rollouts/demo-rollout"),
      request: { patch: requestPatchMock },
    },
  };
  return {
    ...actual,
    getArgoRolloutStore: jest.fn(() => mockStore),
    __TEST_PROMOTE_PATCH__: { requestPatchMock, patchMock },
  };
});

const getPromoteMocks = () =>
  (jest.requireMock("../../k8s/rollouts") as any).__TEST_PROMOTE_PATCH__ as {
    requestPatchMock: jest.Mock;
    patchMock: jest.Mock;
  };

describe("ArgoRolloutDetails", () => {
  beforeEach(() => {
    const { patchMock, requestPatchMock } = getPromoteMocks();
    patchMock.mockClear();
    requestPatchMock.mockClear();
    requestPatchMock.mockResolvedValue({});
    (Renderer.Component.Notifications.ok as jest.Mock).mockReset();
    (Renderer.Component.Notifications.error as jest.Mock).mockReset();
  });

  it("renders strategy and replica summary", () => {
    render(
      <MemoryRouter>
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
      </MemoryRouter>,
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
      <MemoryRouter>
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
      </MemoryRouter>,
    );

    expect(screen.getAllByText("Paused").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Yes").length).toBeGreaterThanOrEqual(1);
  });

  it("shows promote and promote full for promotable pause", () => {
    render(
      <MemoryRouter>
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
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /^Promote$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Promote full" })).toBeInTheDocument();
  });

  it("does not show promote button for manual pause only", () => {
    render(
      <MemoryRouter>
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
      </MemoryRouter>,
    );

    expect(screen.queryByRole("button", { name: "Promote" })).not.toBeInTheDocument();
  });

  it("shows abort button for progressing rollout and triggers patch", () => {
    render(
      <MemoryRouter>
        <ArgoRolloutDetails
          extension={extension}
          object={
            {
              status: {
                phase: "Progressing",
              },
            } as any
          }
        />
      </MemoryRouter>,
    );

    const abortButton = screen.getByRole("button", { name: "Abort" });
    expect(abortButton).toBeInTheDocument();

    fireEvent.click(abortButton);

    expect(getPromoteMocks().patchMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        status: { abort: true },
      },
      "merge",
    );
  });

  it("shows retry button for degraded rollout and triggers patch", () => {
    render(
      <MemoryRouter>
        <ArgoRolloutDetails
          extension={extension}
          object={
            {
              status: {
                phase: "Degraded",
                message: "analysis failed",
              },
            } as any
          }
        />
      </MemoryRouter>,
    );

    const retryButton = screen.getByRole("button", { name: "Retry" });
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);

    expect(getPromoteMocks().patchMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        status: { abort: false },
      },
      "merge",
    );
  });

  it("shows abort error notification when abort request fails", async () => {
    const { patchMock } = getPromoteMocks();
    patchMock.mockRejectedValueOnce(new Error("abort denied"));
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ArgoRolloutDetails
          extension={extension}
          object={
            {
              status: {
                phase: "Progressing",
              },
            } as any
          }
        />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Abort" }));

    expect(Renderer.Component.Notifications.error).toHaveBeenCalledWith("abort denied");
  });
});
