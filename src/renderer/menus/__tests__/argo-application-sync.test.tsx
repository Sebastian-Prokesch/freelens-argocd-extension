import { Renderer } from "@freelensapp/extensions";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArgoSyncMenuItem } from "../argo-application-sync";

const patchMock = jest.fn();

jest.mock("../../k8s/argocd", () => ({
  getArgoApplicationStore: () => ({
    patch: patchMock,
  }),
}));

const extension = { name: "argocd-test-extension" } as any;

describe("ArgoSyncMenuItem", () => {
  beforeEach(() => {
    patchMock.mockReset();
    (Renderer.Component.Notifications.ok as jest.Mock).mockReset();
    (Renderer.Component.Notifications.error as jest.Mock).mockReset();
  });

  it("renders sync action for application", () => {
    render(<ArgoSyncMenuItem object={{} as any} extension={extension} />);

    expect(screen.getByText("Sync")).toBeInTheDocument();
  });

  it("patches sync operation when clicked", async () => {
    patchMock.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    const object = {
      getName: () => "demo-app",
    } as any;

    render(<ArgoSyncMenuItem object={object} extension={extension} />);

    await user.click(screen.getByText("Sync"));

    expect(patchMock).toHaveBeenCalledWith(
      object,
      {
        operation: {
          initiatedBy: {
            username: "LensApp",
          },
          sync: {
            syncStrategy: {
              hook: {},
            },
          },
        },
      },
      "merge",
    );
    expect(Renderer.Component.Notifications.ok).toHaveBeenCalledWith("Sync started for demo-app");
  });

  it("shows endpoint error message when sync fails", async () => {
    patchMock.mockRejectedValueOnce(new Error("sync denied"));
    const user = userEvent.setup();

    render(<ArgoSyncMenuItem object={{ getName: () => "demo-app" } as any} extension={extension} />);

    await user.click(screen.getByText("Sync"));

    expect(Renderer.Component.Notifications.error).toHaveBeenCalledWith("sync denied");
  });

  it("shows fallback error message when sync fails with non-Error", async () => {
    patchMock.mockRejectedValueOnce({ code: 403 });
    const user = userEvent.setup();

    render(<ArgoSyncMenuItem object={{ getName: () => "demo-app" } as any} extension={extension} />);

    await user.click(screen.getByText("Sync"));

    expect(Renderer.Component.Notifications.error).toHaveBeenCalledWith("Failed to start sync.");
  });
});
