import { Renderer } from "@freelensapp/extensions";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArgoRolloutRetryMenuItem } from "../argo-rollout-retry";

import type { Mock } from "vitest";

const patchMock = vi.fn();

vi.mock("../../k8s/rollouts", async () => ({
  getArgoRolloutStore: () => ({
    patch: patchMock,
  }),
  canRetryRollout: (await vi.importActual<any>("../../k8s/rollouts/state")).canRetryRollout,
}));

const extension = { name: "argocd-test-extension" } as any;

describe("ArgoRolloutRetryMenuItem", () => {
  beforeEach(() => {
    patchMock.mockReset();
    (Renderer.Component.Notifications.ok as Mock).mockReset();
    (Renderer.Component.Notifications.error as Mock).mockReset();
  });

  it("renders when rollout is degraded", () => {
    render(
      <ArgoRolloutRetryMenuItem
        object={
          {
            status: {
              phase: "Degraded",
            },
          } as any
        }
        extension={extension}
      />,
    );

    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("patches rollout when clicked", async () => {
    patchMock.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    const object = {
      status: {
        phase: "Degraded",
      },
    } as any;

    render(<ArgoRolloutRetryMenuItem object={object} extension={extension} />);

    await user.click(screen.getByText("Retry"));

    expect(patchMock).toHaveBeenCalledWith(
      object,
      {
        status: { abort: false },
      },
      "merge",
    );
    expect(Renderer.Component.Notifications.ok).toHaveBeenCalledWith("Retry requested for rollout");
  });

  it("shows endpoint error message when retry fails", async () => {
    patchMock.mockRejectedValueOnce(new Error("retry denied"));
    const user = userEvent.setup();

    render(
      <ArgoRolloutRetryMenuItem
        object={
          {
            getName: () => "demo-rollout",
            status: { phase: "Degraded" },
          } as any
        }
        extension={extension}
      />,
    );

    await user.click(screen.getByText("Retry"));

    expect(Renderer.Component.Notifications.error).toHaveBeenCalledWith("retry denied");
  });

  it("shows fallback error message for non-Error failures", async () => {
    patchMock.mockRejectedValueOnce({ code: 403 });
    const user = userEvent.setup();

    render(
      <ArgoRolloutRetryMenuItem
        object={
          {
            getName: () => "demo-rollout",
            status: { phase: "Degraded" },
          } as any
        }
        extension={extension}
      />,
    );

    await user.click(screen.getByText("Retry"));

    expect(Renderer.Component.Notifications.error).toHaveBeenCalledWith("Failed to retry rollout.");
  });
});
