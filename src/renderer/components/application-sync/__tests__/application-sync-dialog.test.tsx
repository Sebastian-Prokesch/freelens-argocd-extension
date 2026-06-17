import { Renderer } from "@freelensapp/extensions";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApplicationSyncDialog } from "../application-sync-dialog";
import { applicationSyncDialogStore } from "../application-sync-dialog-store";

const patchMock = jest.fn();

jest.mock("../../../k8s/argocd", () => ({
  getArgoApplicationStore: () => ({
    patch: patchMock,
  }),
}));

describe("ApplicationSyncDialog", () => {
  beforeEach(() => {
    patchMock.mockReset();
    applicationSyncDialogStore.close();
    (Renderer.Component.Notifications.ok as jest.Mock).mockReset();
    (Renderer.Component.Notifications.error as jest.Mock).mockReset();
    (Renderer.Component.ConfirmDialog.confirm as jest.Mock).mockReset();
  });

  it("pre-fills sync options from policy and submits selected payload", async () => {
    patchMock.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    const application = {
      getName: () => "demo-app",
      spec: {
        source: { targetRevision: "main" },
        syncPolicy: {
          syncOptions: ["CreateNamespace=true", "PruneLast=true"],
        },
      },
    } as any;

    applicationSyncDialogStore.open(application);
    render(<ApplicationSyncDialog />);

    expect(screen.getByText("Sync with options — demo-app")).toBeInTheDocument();
    expect(screen.getByLabelText("Create namespace")).toBeChecked();
    expect(screen.getByLabelText("Prune last")).toBeChecked();
    expect(screen.getByLabelText("Skip validation")).not.toBeChecked();

    await user.click(screen.getByLabelText("Prune"));
    await user.click(screen.getByLabelText("Force"));
    await user.click(screen.getByText("Apply"));
    await user.click(screen.getByText("Sync"));

    expect(Renderer.Component.ConfirmDialog.confirm).not.toHaveBeenCalled();
    expect(patchMock).toHaveBeenCalledWith(
      expect.objectContaining({ getName: expect.any(Function) }),
      {
        operation: {
          initiatedBy: { username: "LensApp" },
          sync: {
            prune: true,
            syncOptions: ["CreateNamespace=true", "PruneLast=true"],
            syncStrategy: {
              apply: {
                force: true,
              },
            },
          },
        },
      },
      "merge",
    );
    expect(Renderer.Component.Notifications.ok).toHaveBeenCalledWith("Sync requested for demo-app");
    expect(applicationSyncDialogStore.isOpen).toBe(false);
  });

  it("shows warnings for force, prune, and replace selections", async () => {
    const user = userEvent.setup();
    const application = {
      getName: () => "demo-app",
      spec: {
        source: { targetRevision: "main" },
        syncPolicy: {
          syncOptions: ["Replace=true"],
        },
      },
    } as any;

    applicationSyncDialogStore.open(application);
    render(<ApplicationSyncDialog />);

    expect(screen.getByText("Replace will recreate resources.")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Prune"));
    await user.click(screen.getByLabelText("Force"));

    expect(screen.getByText("Force may recreate resources on conflict.")).toBeInTheDocument();
    expect(screen.getByText("Prune will delete cluster resources no longer in Git.")).toBeInTheDocument();
  });

  it("hides revision input for multi-source apps", () => {
    const application = {
      getName: () => "demo-app",
      spec: {
        sources: [{ repoURL: "https://example.com/a.git", targetRevision: "main" }],
        syncPolicy: {},
      },
    } as any;

    applicationSyncDialogStore.open(application);
    render(<ApplicationSyncDialog />);

    expect(screen.getByText("Revision targeting for multi-source apps is not supported in v1.")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("main")).not.toBeInTheDocument();
  });

  it("uses dry run button label and payload", async () => {
    patchMock.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    const application = {
      getName: () => "demo-app",
      spec: {
        source: { targetRevision: "main" },
        syncPolicy: {},
      },
    } as any;

    applicationSyncDialogStore.open(application);
    render(<ApplicationSyncDialog />);

    await user.click(screen.getByLabelText("Dry run"));

    expect(screen.getByText("Dry run", { selector: "button" })).toBeInTheDocument();
    expect(screen.getByText("No changes will be applied.")).toBeInTheDocument();

    await user.click(screen.getByText("Dry run", { selector: "button" }));

    expect(patchMock).toHaveBeenCalledWith(
      expect.objectContaining({ getName: expect.any(Function) }),
      {
        operation: {
          initiatedBy: { username: "LensApp" },
          sync: {
            dryRun: true,
            syncStrategy: {
              hook: {},
            },
          },
        },
      },
      "merge",
    );
    expect(Renderer.Component.Notifications.ok).toHaveBeenCalledWith("Dry run requested for demo-app");
  });
});
