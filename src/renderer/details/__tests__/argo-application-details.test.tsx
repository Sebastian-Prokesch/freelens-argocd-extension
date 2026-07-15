import { Renderer } from "@freelensapp/extensions";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { buildApplicationRollbackMergePatch } from "../../endpoints/argo-application-endpoints";
import { ArgoApplicationDetails } from "../argo-application-details";

const patchMock = jest.fn();

jest.mock("../../k8s/argocd", () => {
  const actual = jest.requireActual("../../k8s/argocd");
  return {
    ...actual,
    getArgoApplicationStore: () => ({
      patch: patchMock,
    }),
  };
});

const extension = { name: "argocd-test-extension" } as any;

const historySource = { repoURL: "https://github.com/org/repo.git" };

function renderDetails(object: any) {
  render(<ArgoApplicationDetails object={object} extension={extension} />);
}

function createRollbackApp(overrides: Record<string, unknown> = {}) {
  return {
    getName: () => "demo-app",
    metadata: { name: "demo-app" },
    spec: {
      source: { repoURL: "https://github.com/org/repo.git" },
      destination: { namespace: "apps" },
    },
    status: {
      history: [
        {
          id: 10,
          revision: "abc123",
          deployedAt: "2025-01-01T08:00:00.000Z",
          initiatedBy: { username: "admin" },
          source: historySource,
        },
      ],
      resources: [],
    },
    ...overrides,
  };
}

describe("ArgoApplicationDetails", () => {
  beforeEach(() => {
    patchMock.mockReset();
    (Renderer.Component.ConfirmDialog.confirm as jest.Mock).mockReset();
    (Renderer.Component.Notifications.ok as jest.Mock).mockReset();
    (Renderer.Component.Notifications.error as jest.Mock).mockReset();
  });
  it("renders single-source configuration (Helm) and destination defaults", () => {
    renderDetails({
      spec: {
        source: {
          repoURL: "https://github.com/org/repo.git",
          targetRevision: "main",
          path: "apps/foo",
          helm: {
            version: "v3",
            releaseName: "foo",
            valueFiles: ["values.yaml", "values-prod.yaml"],
          },
        },
        destination: {
          server: "https://kubernetes.default.svc",
          namespace: "apps",
        },
      },
      status: {
        resources: [],
      },
    });

    expect(screen.getByText("Source Configuration")).toBeInTheDocument();
    expect(screen.getByText("Repository URL")).toBeInTheDocument();
    expect(screen.getByText("https://github.com/org/repo.git")).toBeInTheDocument();
    expect(screen.getByText("Source Type")).toBeInTheDocument();
    expect(screen.getByText("Helm")).toBeInTheDocument();
    expect(screen.getByText("Target Revision")).toBeInTheDocument();
    expect(screen.getByText("main")).toBeInTheDocument();
    expect(screen.getByText("Path")).toBeInTheDocument();
    expect(screen.getByText("apps/foo")).toBeInTheDocument();
    expect(screen.getByText("Helm Version")).toBeInTheDocument();
    expect(screen.getByText("v3")).toBeInTheDocument();
    expect(screen.getByText("Release Name")).toBeInTheDocument();
    expect(screen.getByText("foo")).toBeInTheDocument();
    expect(screen.getByText("Value Files")).toBeInTheDocument();
    expect(screen.getByText("values.yaml, values-prod.yaml")).toBeInTheDocument();

    expect(screen.getByText("Destination")).toBeInTheDocument();
    expect(screen.getByText("Cluster")).toBeInTheDocument();
    expect(screen.getByText("https://kubernetes.default.svc")).toBeInTheDocument();
    expect(screen.getByText("Namespace")).toBeInTheDocument();
    expect(screen.getByText("apps")).toBeInTheDocument();
  });

  it("renders multi-source configuration and falls back to 'Not specified' fields", () => {
    renderDetails({
      spec: {
        sources: [
          {
            name: "one",
            repoURL: "https://github.com/org/repo1.git",
            targetRevision: "v1",
            path: "apps/a",
          },
          {
            repoURL: "https://github.com/org/repo2.git",
            plugin: { name: "my-plugin" },
          },
        ],
        destination: {},
      },
      status: { resources: [] },
    });

    expect(screen.getByText("Source 1 (one)")).toBeInTheDocument();
    expect(screen.getByText("https://github.com/org/repo1.git")).toBeInTheDocument();
    expect(screen.getByText("Revision:")).toBeInTheDocument();
    expect(screen.getByText("v1")).toBeInTheDocument();
    expect(screen.getByText("Path:")).toBeInTheDocument();
    expect(screen.getByText("apps/a")).toBeInTheDocument();

    expect(screen.getByText("Source 2")).toBeInTheDocument();
    expect(screen.getByText("https://github.com/org/repo2.git")).toBeInTheDocument();
    expect(screen.getByText("Plugin:")).toBeInTheDocument();
    expect(screen.getByText("my-plugin")).toBeInTheDocument();

    // destination defaults
    expect(screen.getAllByText("Not specified").length).toBeGreaterThan(0);
  });

  it("renders sync policy booleans, sync options, retry backoff formatting", () => {
    renderDetails({
      spec: {
        source: { repoURL: "https://github.com/org/repo.git" },
        destination: { namespace: "apps" },
        syncPolicy: {
          automated: {
            prune: true,
            selfHeal: false,
            allowEmpty: true,
          },
          syncOptions: ["CreateNamespace=true", "PruneLast=true"],
          retry: {
            limit: 5,
            backoff: {
              duration: "5s",
              factor: 2,
              maxDuration: "3m",
            },
          },
        },
        ignoreDifferences: [],
      },
      status: { resources: [] },
    });

    expect(screen.getByText("Sync Policy")).toBeInTheDocument();
    expect(screen.getByText("Automated Sync")).toBeInTheDocument();
    expect(screen.getByText("Prune")).toBeInTheDocument();
    expect(screen.getByText("Self Heal")).toBeInTheDocument();
    expect(screen.getByText("Allow Empty")).toBeInTheDocument();

    // the BadgeBoolean mock prints 'true'/'false' strings
    expect(screen.getAllByTestId("BadgeBoolean").map((el) => el.textContent)).toEqual(
      expect.arrayContaining(["true", "true", "false", "true"]),
    );

    expect(screen.getByText("Sync Options")).toBeInTheDocument();
    expect(screen.getByText("CreateNamespace=true, PruneLast=true")).toBeInTheDocument();

    expect(screen.getByText("Retry Limit")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Retry Backoff")).toBeInTheDocument();
    expect(screen.getByText("Duration: 5s, Factor: 2, Max: 3m")).toBeInTheDocument();
  });

  it("renders ignoreDifferences table and resources table with fallbacks", () => {
    renderDetails({
      spec: {
        source: { repoURL: "https://github.com/org/repo.git" },
        destination: { namespace: "apps" },
        ignoreDifferences: [
          { kind: "Deployment", name: "api", namespace: "apps", group: "apps" },
          { kind: "ConfigMap", name: "", namespace: "", group: "" },
        ],
      },
      status: {
        resources: [
          { name: "api", kind: "Deployment", status: "Synced" },
          { name: "db", kind: "StatefulSet" },
        ],
      },
    });

    expect(screen.getByText("Advanced Settings")).toBeInTheDocument();
    expect(screen.getByText("Ignore Differences")).toBeInTheDocument();
    expect(screen.getAllByText("Deployment").length).toBeGreaterThan(0);
    expect(screen.getAllByText("api").length).toBeGreaterThan(0);
    expect(screen.getByText("ConfigMap")).toBeInTheDocument();
    expect(screen.getAllByText("All").length).toBeGreaterThan(0);

    expect(screen.getByText("Resources Sync Status")).toBeInTheDocument();
    expect(screen.getAllByText("api").length).toBeGreaterThan(0);
    expect(screen.getByText("Synced")).toBeInTheDocument();
    expect(screen.getAllByText("Deployment").length).toBeGreaterThan(0);

    // fallback for missing status
    expect(screen.getAllByText("db").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Unknown").length).toBeGreaterThan(0);
  });

  it("renders diagnostics health summary and operation timeline", () => {
    renderDetails({
      spec: {
        source: { repoURL: "https://github.com/org/repo.git" },
        destination: { namespace: "apps" },
      },
      status: {
        sync: { status: "OutOfSync", revision: "rev-current" },
        health: { status: "Degraded" },
        operationState: {
          phase: "Running",
          message: "Sync in progress",
          startedAt: "2025-01-01T09:00:00.000Z",
        },
        resources: [
          { name: "web", kind: "Deployment", status: "OutOfSync", health: { status: "Degraded" } },
          { name: "db", kind: "Service", status: "Synced", health: { status: "Healthy" } },
        ],
      },
    });

    expect(screen.getByText("Diagnostics")).toBeInTheDocument();
    expect(screen.getByText("Application Sync")).toBeInTheDocument();
    expect(screen.getAllByText("OutOfSync").length).toBeGreaterThan(0);
    expect(screen.getByText("Application Health")).toBeInTheDocument();
    expect(screen.getAllByText("Degraded").length).toBeGreaterThan(0);
    expect(screen.getByText("Managed Resources")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Out of Sync")).toBeInTheDocument();
    expect(screen.getByText("Unhealthy")).toBeInTheDocument();
    expect(screen.getByText("Drift Hotspots")).toBeInTheDocument();
    expect(screen.getAllByText("web").length).toBeGreaterThan(0);
    expect(screen.getByText("Operation Timeline")).toBeInTheDocument();
    expect(screen.getAllByText("Sync in progress").length).toBeGreaterThan(0);
    expect(screen.getByText("In progress")).toBeInTheDocument();
  });

  it("renders no drift detected when all resources are synced and healthy", () => {
    renderDetails({
      spec: {
        source: { repoURL: "https://github.com/org/repo.git" },
        destination: { namespace: "apps" },
      },
      status: {
        sync: { status: "Synced" },
        health: { status: "Healthy" },
        resources: [{ name: "web", kind: "Deployment", status: "Synced", health: { status: "Healthy" } }],
      },
    });

    expect(screen.getByText("No drift detected")).toBeInTheDocument();
  });

  it("renders resource diff section with OutOfSync resources grouped by namespace and kind", () => {
    renderDetails({
      spec: {
        source: { repoURL: "https://github.com/org/repo.git" },
        destination: { namespace: "apps" },
      },
      status: {
        sync: { status: "OutOfSync" },
        resources: [
          { name: "web", kind: "Deployment", namespace: "apps", status: "OutOfSync", health: { status: "Degraded" } },
          { name: "db", kind: "Service", namespace: "apps", status: "Synced", health: { status: "Healthy" } },
        ],
      },
    });

    expect(screen.getByText("Resource Diff")).toBeInTheDocument();
    expect(screen.getAllByText("apps").length).toBeGreaterThan(0);
    expect(screen.getAllByText("web").length).toBeGreaterThan(0);
  });

  it("renders resource diff empty state when all resources are in sync", () => {
    renderDetails({
      spec: {
        source: { repoURL: "https://github.com/org/repo.git" },
        destination: { namespace: "apps" },
      },
      status: {
        sync: { status: "Synced" },
        resources: [
          { name: "web", kind: "Deployment", namespace: "apps", status: "Synced", health: { status: "Healthy" } },
        ],
      },
    });

    expect(screen.getByText("Resource Diff")).toBeInTheDocument();
    expect(screen.getByText("All resources in sync")).toBeInTheDocument();
  });

  it("expands drift hotspots when more than five resources need attention", () => {
    renderDetails({
      spec: {
        source: { repoURL: "https://github.com/org/repo.git" },
        destination: { namespace: "apps" },
      },
      status: {
        resources: [
          { name: "a", kind: "Deployment", status: "OutOfSync", health: { status: "Degraded" } },
          { name: "b", kind: "Deployment", status: "OutOfSync", health: { status: "Healthy" } },
          { name: "c", kind: "Deployment", status: "OutOfSync", health: { status: "Healthy" } },
          { name: "d", kind: "Secret", status: "OutOfSync", health: { status: "Healthy" } },
          { name: "e", kind: "Service", status: "OutOfSync", health: { status: "Healthy" } },
          { name: "f", kind: "ConfigMap", status: "Unknown", health: { status: "Healthy" } },
        ],
      },
    });

    fireEvent.click(screen.getByText("Show all 6 hotspots"));
    expect(screen.getByText("Show top 5")).toBeInTheDocument();
  });

  it("renders operation state and last sync information", () => {
    renderDetails({
      spec: {
        source: { repoURL: "https://github.com/org/repo.git" },
        destination: { namespace: "apps" },
      },
      status: {
        observedAt: "2025-01-01T10:00:00.000Z",
        sync: {
          status: "OutOfSync",
          revision: "rev-current",
        },
        operationState: {
          phase: "Running",
          message: "Sync in progress",
          startedAt: "2025-01-01T09:00:00.000Z",
        },
        history: [
          {
            id: 2,
            revision: "rev-prev",
            deployedAt: "2025-01-01T08:00:00.000Z",
            initiatedBy: { automated: true },
            source: { repoURL: "https://github.com/org/repo.git" },
          },
        ],
        resources: [],
      },
    });

    expect(screen.getByText("Operation State")).toBeInTheDocument();
    expect(screen.getAllByText("Running").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sync in progress").length).toBeGreaterThan(0);

    expect(screen.getByText("Last Sync Information")).toBeInTheDocument();
    expect(screen.getByText("rev-current")).toBeInTheDocument();
    expect(screen.getAllByText("OutOfSync").length).toBeGreaterThan(0);
    expect(screen.getAllByText("rev-prev").length).toBeGreaterThan(0);
  });

  it("renders sync history table entries", () => {
    renderDetails({
      spec: {
        source: { repoURL: "https://github.com/org/repo.git" },
        destination: { namespace: "apps" },
      },
      status: {
        history: [
          {
            id: 10,
            revision: "abc123",
            deployedAt: "2025-01-01T08:00:00.000Z",
            initiatedBy: { username: "admin" },
            source: { repoURL: "https://github.com/org/repo.git" },
          },
        ],
        resources: [],
      },
    });

    expect(screen.getByText("Sync History")).toBeInTheDocument();
    expect(screen.getAllByText("abc123").length).toBeGreaterThan(0);
    expect(screen.getByText("admin")).toBeInTheDocument();
  });

  it("renders safely with malformed optional arrays", () => {
    renderDetails({
      spec: {
        source: {
          repoURL: "https://github.com/org/repo.git",
          plugin: {
            env: [null, { value: "missing-name" }],
            parameters: [null, { string: "missing-name" }],
          },
        },
        destination: { namespace: "apps" },
        ignoreDifferences: [null, { name: "config-only" }],
      },
      status: {
        resources: [null, { kind: "Deployment" }],
        history: [null, { source: { chart: "app-chart" } }],
      },
    });

    expect(screen.getByText("UNKNOWN=missing-name")).toBeInTheDocument();
    expect(screen.getByText(/Unnamed parameter/)).toBeInTheDocument();
    expect(screen.getAllByText("Unknown").length).toBeGreaterThan(0);
    expect(screen.getByText("app-chart")).toBeInTheDocument();
  });

  describe("sync history rollback", () => {
    it("shows rollback button on every history row", () => {
      renderDetails(
        createRollbackApp({
          status: {
            history: [
              {
                id: 10,
                revision: "abc123",
                source: historySource,
              },
              {
                id: 11,
                revision: "def456",
                source: historySource,
              },
            ],
            resources: [],
          },
        }),
      );

      expect(screen.getAllByRole("button", { name: "Rollback" })).toHaveLength(2);
    });

    it("disables rollback when auto-sync is enabled", async () => {
      const user = userEvent.setup();
      renderDetails(
        createRollbackApp({
          spec: {
            source: { repoURL: "https://github.com/org/repo.git" },
            destination: { namespace: "apps" },
            syncPolicy: {
              automated: {
                prune: true,
              },
            },
          },
        }),
      );

      const rollbackButton = screen.getByRole("button", { name: "Rollback" });
      expect(rollbackButton).toBeDisabled();
      expect(screen.getByTestId("WithTooltip")).toHaveAttribute(
        "data-tooltip",
        "Auto-sync must be disabled before rollback",
      );

      await user.click(rollbackButton);
      expect(patchMock).not.toHaveBeenCalled();
    });

    it("disables rollback for legacy history entries without source metadata", async () => {
      const user = userEvent.setup();
      renderDetails(
        createRollbackApp({
          status: {
            history: [{ id: 1, revision: "legacy-rev" }],
            resources: [],
          },
        }),
      );

      const rollbackButton = screen.getByRole("button", { name: "Rollback" });
      expect(rollbackButton).toBeDisabled();
      expect(screen.getByTestId("WithTooltip")).toHaveAttribute(
        "data-tooltip",
        "Source metadata unavailable for this history entry",
      );

      await user.click(rollbackButton);
      expect(patchMock).not.toHaveBeenCalled();
    });

    it("disables rollback when an operation is in progress", async () => {
      const user = userEvent.setup();
      renderDetails(
        createRollbackApp({
          status: {
            operationState: {
              phase: "Running",
            },
            history: [
              {
                id: 10,
                revision: "abc123",
                source: historySource,
              },
            ],
            resources: [],
          },
        }),
      );

      const rollbackButton = screen.getByRole("button", { name: "Rollback" });
      expect(rollbackButton).toBeDisabled();
      expect(screen.getByTestId("WithTooltip")).toHaveAttribute("data-tooltip", "An operation is already in progress");

      await user.click(rollbackButton);
      expect(patchMock).not.toHaveBeenCalled();
    });

    it("confirms and patches rollback when clicked", async () => {
      patchMock.mockResolvedValueOnce(undefined);
      (Renderer.Component.ConfirmDialog.confirm as jest.Mock).mockResolvedValueOnce(true);
      const user = userEvent.setup();
      const app = createRollbackApp();
      const historyEntry = app.status.history[0]!;

      renderDetails(app);

      await user.click(screen.getByRole("button", { name: "Rollback" }));

      expect(Renderer.Component.ConfirmDialog.confirm).toHaveBeenCalledWith({
        labelOk: "Rollback Application",
        message: expect.stringContaining("history ID 10"),
      });
      expect(patchMock).toHaveBeenCalledWith(app, buildApplicationRollbackMergePatch(historyEntry, undefined), "merge");
      expect(Renderer.Component.Notifications.ok).toHaveBeenCalledWith(
        "Rollback to revision abc123 requested for demo-app",
      );
    });

    it("does not patch when rollback confirmation is cancelled", async () => {
      (Renderer.Component.ConfirmDialog.confirm as jest.Mock).mockResolvedValueOnce(false);
      const user = userEvent.setup();

      renderDetails(createRollbackApp());

      await user.click(screen.getByRole("button", { name: "Rollback" }));

      expect(patchMock).not.toHaveBeenCalled();
      expect(Renderer.Component.Notifications.ok).not.toHaveBeenCalled();
    });

    it("shows error notification when rollback patch fails", async () => {
      patchMock.mockRejectedValueOnce(new Error("rollback denied"));
      (Renderer.Component.ConfirmDialog.confirm as jest.Mock).mockResolvedValueOnce(true);
      const user = userEvent.setup();

      renderDetails(createRollbackApp());

      await user.click(screen.getByRole("button", { name: "Rollback" }));

      expect(Renderer.Component.Notifications.error).toHaveBeenCalledWith("rollback denied");
    });
  });
});
