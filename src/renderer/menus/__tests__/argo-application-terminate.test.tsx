import { Renderer } from "@freelensapp/extensions";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArgoTerminateMenuItem } from "../argo-application-terminate";

const patchMock = jest.fn();

jest.mock("../../k8s/argocd", () => ({
  getArgoApplicationStore: () => ({
    patch: patchMock,
  }),
}));

const extension = { name: "argocd-test-extension" } as any;

describe("ArgoTerminateMenuItem", () => {
  beforeEach(() => {
    patchMock.mockReset();
    (Renderer.Component.ConfirmDialog.confirm as jest.Mock).mockReset();
    (Renderer.Component.Notifications.ok as jest.Mock).mockReset();
    (Renderer.Component.Notifications.error as jest.Mock).mockReset();
  });

  it("renders when operation is in progress", () => {
    render(
      <ArgoTerminateMenuItem
        object={
          {
            status: {
              operationState: {
                phase: "Running",
              },
            },
          } as any
        }
        extension={extension}
      />,
    );

    expect(screen.getByText("Terminate Operation")).toBeInTheDocument();
  });

  it("does not render when operation is in terminal phase", () => {
    render(
      <ArgoTerminateMenuItem
        object={
          {
            status: {
              operationState: {
                phase: "Succeeded",
              },
            },
          } as any
        }
        extension={extension}
      />,
    );

    expect(screen.queryByText("Terminate Operation")).not.toBeInTheDocument();
  });

  it("patches operation to null when clicked", async () => {
    patchMock.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();

    render(
      <ArgoTerminateMenuItem
        object={
          {
            status: {
              operationState: {
                phase: "Running",
              },
            },
          } as any
        }
        extension={extension}
      />,
    );

    await user.click(screen.getByText("Terminate Operation"));

    expect(patchMock).toHaveBeenCalledWith(expect.any(Object), [{ op: "remove", path: "/operation" }], "json");
    expect(Renderer.Component.ConfirmDialog.confirm).not.toHaveBeenCalled();
  });

  it("shows success notification when termination is requested", async () => {
    patchMock.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();

    render(
      <ArgoTerminateMenuItem
        object={
          {
            getName: () => "demo-app",
            status: {
              operationState: {
                phase: "Running",
              },
            },
          } as any
        }
        extension={extension}
      />,
    );

    await user.click(screen.getByText("Terminate Operation"));

    expect(Renderer.Component.Notifications.ok).toHaveBeenCalledWith("Terminate requested for demo-app");
    expect(Renderer.Component.ConfirmDialog.confirm).not.toHaveBeenCalled();
  });

  it("shows endpoint error message when terminate fails", async () => {
    patchMock.mockRejectedValueOnce(new Error("terminate denied"));
    const user = userEvent.setup();

    render(
      <ArgoTerminateMenuItem
        object={
          {
            getName: () => "demo-app",
            status: {
              operationState: {
                phase: "Running",
              },
            },
          } as any
        }
        extension={extension}
      />,
    );

    await user.click(screen.getByText("Terminate Operation"));

    expect(Renderer.Component.Notifications.error).toHaveBeenCalledWith("terminate denied");
    expect(Renderer.Component.ConfirmDialog.confirm).not.toHaveBeenCalled();
  });

  it("shows fallback error message for non-Error failures", async () => {
    patchMock.mockRejectedValueOnce({ code: 403 });
    const user = userEvent.setup();

    render(
      <ArgoTerminateMenuItem
        object={
          {
            getName: () => "demo-app",
            status: {
              operationState: {
                phase: "Running",
              },
            },
          } as any
        }
        extension={extension}
      />,
    );

    await user.click(screen.getByText("Terminate Operation"));

    expect(Renderer.Component.Notifications.error).toHaveBeenCalledWith("Failed to terminate operation.");
    expect(Renderer.Component.ConfirmDialog.confirm).not.toHaveBeenCalled();
  });
});
