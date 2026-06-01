import { Renderer } from "@freelensapp/extensions";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArgoRolloutAbortMenuItem } from "../argo-rollout-abort";

const patchMock = jest.fn();

jest.mock("../../k8s/rollouts", () => ({
  getArgoRolloutStore: () => ({
    patch: patchMock,
  }),
  canAbortRollout: jest.requireActual("../../k8s/rollouts/state").canAbortRollout,
  getAbortMergePatch: jest.requireActual("../../k8s/rollouts/actions").getAbortMergePatch,
}));

const extension = { name: "argocd-test-extension" } as any;

describe("ArgoRolloutAbortMenuItem", () => {
  beforeEach(() => {
    patchMock.mockReset();
    (Renderer.Component.ConfirmDialog.confirm as jest.Mock).mockReset();
    (Renderer.Component.Notifications.ok as jest.Mock).mockReset();
    (Renderer.Component.Notifications.error as jest.Mock).mockReset();
  });

  it("renders when rollout is progressing", () => {
    render(
      <ArgoRolloutAbortMenuItem
        object={
          {
            status: {
              phase: "Progressing",
            },
          } as any
        }
        extension={extension}
      />,
    );

    expect(screen.getByText("Abort")).toBeInTheDocument();
  });

  it("confirms and patches rollout when clicked", async () => {
    patchMock.mockResolvedValueOnce(undefined);
    (Renderer.Component.ConfirmDialog.confirm as jest.Mock).mockResolvedValueOnce(true);
    const user = userEvent.setup();
    const object = {
      getName: () => "demo-rollout",
      status: {
        phase: "Progressing",
      },
    } as any;

    render(<ArgoRolloutAbortMenuItem object={object} extension={extension} />);

    await user.click(screen.getByText("Abort"));

    expect(patchMock).toHaveBeenCalledWith(
      object,
      {
        status: { abort: true },
      },
      "merge",
    );
    expect(Renderer.Component.ConfirmDialog.confirm).toHaveBeenCalledWith({
      labelOk: "Abort Rollout",
      message: "Abort rollout demo-rollout? This interrupts the ongoing rollout operation.",
    });
    expect(Renderer.Component.Notifications.ok).toHaveBeenCalledWith("Abort requested for demo-rollout");
  });

  it("does not patch when confirmation is cancelled", async () => {
    (Renderer.Component.ConfirmDialog.confirm as jest.Mock).mockResolvedValueOnce(false);
    const user = userEvent.setup();

    render(
      <ArgoRolloutAbortMenuItem
        object={
          {
            getName: () => "demo-rollout",
            status: {
              phase: "Progressing",
            },
          } as any
        }
        extension={extension}
      />,
    );

    await user.click(screen.getByText("Abort"));

    expect(patchMock).not.toHaveBeenCalled();
    expect(Renderer.Component.Notifications.ok).not.toHaveBeenCalled();
    expect(Renderer.Component.Notifications.error).not.toHaveBeenCalled();
  });

  it("shows endpoint error message on failure", async () => {
    patchMock.mockRejectedValueOnce(new Error("abort denied"));
    (Renderer.Component.ConfirmDialog.confirm as jest.Mock).mockResolvedValueOnce(true);
    const user = userEvent.setup();

    render(
      <ArgoRolloutAbortMenuItem
        object={
          {
            getName: () => "demo-rollout",
            status: {
              phase: "Progressing",
            },
          } as any
        }
        extension={extension}
      />,
    );

    await user.click(screen.getByText("Abort"));

    expect(Renderer.Component.Notifications.error).toHaveBeenCalledWith("abort denied");
  });

  it("shows fallback message for non-Error failures", async () => {
    patchMock.mockRejectedValueOnce({ code: 403 });
    (Renderer.Component.ConfirmDialog.confirm as jest.Mock).mockResolvedValueOnce(true);
    const user = userEvent.setup();

    render(
      <ArgoRolloutAbortMenuItem
        object={
          {
            getName: () => "demo-rollout",
            status: {
              phase: "Progressing",
            },
          } as any
        }
        extension={extension}
      />,
    );

    await user.click(screen.getByText("Abort"));

    expect(Renderer.Component.Notifications.error).toHaveBeenCalledWith("Failed to abort rollout.");
  });
});
