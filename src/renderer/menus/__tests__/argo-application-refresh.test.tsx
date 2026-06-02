import { Renderer } from "@freelensapp/extensions";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArgoHardRefreshMenuItem, ArgoRefreshMenuItem } from "../argo-application-refresh";

const patchMock = jest.fn();

jest.mock("../../k8s/argocd", () => ({
  getArgoApplicationStore: () => ({
    patch: patchMock,
  }),
}));

const extension = { name: "argocd-test-extension" } as any;

describe("ArgoRefreshMenuItem", () => {
  beforeEach(() => {
    patchMock.mockReset();
    (Renderer.Component.ConfirmDialog.confirm as jest.Mock).mockReset();
    (Renderer.Component.Notifications.ok as jest.Mock).mockReset();
    (Renderer.Component.Notifications.error as jest.Mock).mockReset();
  });

  it("renders refresh action for application", () => {
    render(<ArgoRefreshMenuItem object={{} as any} extension={extension} />);

    expect(screen.getByText("Refresh")).toBeInTheDocument();
  });

  it("patches refresh annotation when clicked", async () => {
    patchMock.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    const object = {
      getName: () => "demo-app",
    } as any;

    render(<ArgoRefreshMenuItem object={object} extension={extension} />);

    await user.click(screen.getByText("Refresh"));

    expect(patchMock).toHaveBeenCalledWith(
      object,
      {
        metadata: {
          annotations: {
            "argocd.argoproj.io/refresh": "normal",
          },
        },
      },
      "merge",
    );
    expect(Renderer.Component.Notifications.ok).toHaveBeenCalledWith("Refresh requested for demo-app");
    expect(Renderer.Component.ConfirmDialog.confirm).not.toHaveBeenCalled();
  });

  it("shows endpoint error message when refresh fails", async () => {
    patchMock.mockRejectedValueOnce(new Error("refresh denied"));
    const user = userEvent.setup();

    render(<ArgoRefreshMenuItem object={{ getName: () => "demo-app" } as any} extension={extension} />);

    await user.click(screen.getByText("Refresh"));

    expect(Renderer.Component.Notifications.error).toHaveBeenCalledWith("refresh denied");
  });

  it("shows fallback error message when refresh fails with non-Error", async () => {
    patchMock.mockRejectedValueOnce({ code: 403 });
    const user = userEvent.setup();

    render(<ArgoRefreshMenuItem object={{ getName: () => "demo-app" } as any} extension={extension} />);

    await user.click(screen.getByText("Refresh"));

    expect(Renderer.Component.Notifications.error).toHaveBeenCalledWith("Failed to refresh application.");
  });
});

describe("ArgoHardRefreshMenuItem", () => {
  beforeEach(() => {
    patchMock.mockReset();
    (Renderer.Component.ConfirmDialog.confirm as jest.Mock).mockReset();
    (Renderer.Component.Notifications.ok as jest.Mock).mockReset();
    (Renderer.Component.Notifications.error as jest.Mock).mockReset();
  });

  it("renders hard refresh action for application", () => {
    render(<ArgoHardRefreshMenuItem object={{} as any} extension={extension} />);

    expect(screen.getByText("Hard Refresh")).toBeInTheDocument();
  });

  it("patches hard refresh annotation when clicked", async () => {
    patchMock.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    const object = {
      getName: () => "demo-app",
    } as any;

    render(<ArgoHardRefreshMenuItem object={object} extension={extension} />);

    await user.click(screen.getByText("Hard Refresh"));

    expect(patchMock).toHaveBeenCalledWith(
      object,
      {
        metadata: {
          annotations: {
            "argocd.argoproj.io/refresh": "hard",
          },
        },
      },
      "merge",
    );
    expect(Renderer.Component.Notifications.ok).toHaveBeenCalledWith("Hard refresh requested for demo-app");
    expect(Renderer.Component.ConfirmDialog.confirm).not.toHaveBeenCalled();
  });

  it("shows endpoint error message when hard refresh fails", async () => {
    patchMock.mockRejectedValueOnce(new Error("hard refresh denied"));
    const user = userEvent.setup();

    render(<ArgoHardRefreshMenuItem object={{ getName: () => "demo-app" } as any} extension={extension} />);

    await user.click(screen.getByText("Hard Refresh"));

    expect(Renderer.Component.Notifications.error).toHaveBeenCalledWith("hard refresh denied");
  });

  it("shows fallback error message when hard refresh fails with non-Error", async () => {
    patchMock.mockRejectedValueOnce({ code: 403 });
    const user = userEvent.setup();

    render(<ArgoHardRefreshMenuItem object={{ getName: () => "demo-app" } as any} extension={extension} />);

    await user.click(screen.getByText("Hard Refresh"));

    expect(Renderer.Component.Notifications.error).toHaveBeenCalledWith("Failed to hard refresh application.");
  });
});
