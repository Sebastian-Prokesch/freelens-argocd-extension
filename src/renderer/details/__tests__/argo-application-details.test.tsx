import { render, screen } from "@testing-library/react";
import { ArgoApplicationDetails } from "../argo-application-details";

const extension = { name: "argocd-test-extension" } as any;

function renderDetails(object: any) {
  render(<ArgoApplicationDetails object={object} extension={extension} />);
}

describe("ArgoApplicationDetails", () => {
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
    expect(screen.getByText("db")).toBeInTheDocument();
    expect(screen.getAllByText("Unknown").length).toBeGreaterThan(0);
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
    expect(screen.getByText("Running")).toBeInTheDocument();
    expect(screen.getByText("Sync in progress")).toBeInTheDocument();

    expect(screen.getByText("Last Sync Information")).toBeInTheDocument();
    expect(screen.getByText("rev-current")).toBeInTheDocument();
    expect(screen.getByText("OutOfSync")).toBeInTheDocument();
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
});
