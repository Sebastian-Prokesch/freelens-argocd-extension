import { render, screen } from "@testing-library/react";
import { ArgoConfigDetails } from "../argo-config-details";

const extension = { name: "argocd-test-extension" } as any;

const makeObject = (overrides: Record<string, any> = {}) => ({
  metadata: {
    name: "test",
    namespace: "argocd",
    labels: {},
  },
  getName: () => "test",
  getNs: () => "argocd",
  ...overrides,
});

describe("ArgoConfigDetails", () => {
  it("renders repository secret details", () => {
    const secret = makeObject({
      metadata: {
        name: "repo",
        namespace: "argocd",
        labels: {
          "argocd.argoproj.io/secret-type": "repository",
        },
      },
      stringData: {
        url: "https://example.com",
        type: "git",
        project: "default",
        username: "user",
      },
    });

    render(<ArgoConfigDetails object={secret as any} extension={extension} />);

    expect(screen.getByText("ArgoCD Config")).toBeInTheDocument();
    expect(screen.getByText("repository")).toBeInTheDocument();
    expect(screen.getByText("https://example.com")).toBeInTheDocument();
    expect(screen.getByText("git")).toBeInTheDocument();
    expect(screen.getByText("example.com")).toBeInTheDocument();
    expect(screen.getByText("https")).toBeInTheDocument();
    expect(screen.getByText("default")).toBeInTheDocument();
    expect(screen.getByText("HTTPS")).toBeInTheDocument();
  });

  it("redacts userinfo from repository URL in details", () => {
    const secret = makeObject({
      metadata: {
        name: "repo",
        namespace: "argocd",
        labels: {
          "argocd.argoproj.io/secret-type": "repository",
        },
      },
      stringData: {
        url: "https://user:secrettoken@example.com/org/repo.git",
        type: "git",
      },
    });

    render(<ArgoConfigDetails object={secret as any} extension={extension} />);

    expect(screen.getByText("https://example.com/org/repo.git")).toBeInTheDocument();
    expect(screen.queryByText("https://user:secrettoken@example.com/org/repo.git")).not.toBeInTheDocument();
  });

  it("renders cluster secret details", () => {
    const secret = makeObject({
      metadata: {
        name: "cluster",
        namespace: "argocd",
        labels: {
          "argocd.argoproj.io/secret-type": "cluster",
        },
      },
      stringData: {
        name: "cluster-1",
        server: "https://kubernetes.default.svc",
        namespaces: "apps",
        clusterResources: "true",
        project: "default",
      },
    });

    render(<ArgoConfigDetails object={secret as any} extension={extension} />);

    expect(screen.getByText("cluster-1")).toBeInTheDocument();
    expect(screen.getByText("https://kubernetes.default.svc")).toBeInTheDocument();
    expect(screen.getByText("kubernetes.default.svc")).toBeInTheDocument();
    expect(screen.getByText("namespaced")).toBeInTheDocument();
    expect(screen.getByText("apps")).toBeInTheDocument();
    expect(screen.getByText("default")).toBeInTheDocument();
    expect(screen.getAllByTestId("BadgeBoolean")).toHaveLength(3);
  });

  it("renders configmap details", () => {
    const configMap = makeObject({
      metadata: {
        name: "argocd-cm",
        namespace: "argocd",
        labels: {
          "app.kubernetes.io/part-of": "argocd",
        },
      },
      data: {
        url: "https://argocd.example.com",
        "dex.config": "value",
      },
    });

    render(<ArgoConfigDetails object={configMap as any} extension={extension} />);

    expect(screen.getByText("ArgoCD Config")).toBeInTheDocument();
    expect(screen.getByText("url, dex.config")).toBeInTheDocument();
  });

  it("renders notifications configmap details", () => {
    const configMap = makeObject({
      metadata: {
        name: "argocd-notifications-cm",
        namespace: "argocd",
        labels: {
          "app.kubernetes.io/part-of": "argocd",
        },
      },
      data: {
        "trigger.on-sync-succeeded": "value",
        "template.app-sync": "value",
        subscriptions: "- recipients: [slack]",
      },
    });

    render(<ArgoConfigDetails object={configMap as any} extension={extension} />);

    expect(screen.getByText("ArgoCD Notifications")).toBeInTheDocument();
    expect(screen.getByText("trigger.on-sync-succeeded")).toBeInTheDocument();
    expect(screen.getByText("template.app-sync")).toBeInTheDocument();
    expect(screen.getByText("subscriptions")).toBeInTheDocument();
  });

  it("renders rbac configmap details with parsed rules", () => {
    const configMap = makeObject({
      metadata: {
        name: "argocd-rbac-cm",
        namespace: "argocd",
        labels: {
          "app.kubernetes.io/part-of": "argocd",
        },
      },
      data: {
        "policy.default": "role:readonly",
        scopes: "[groups]",
        "policy.csv": "p, role:readonly, applications, get, */*, allow",
      },
    });

    render(<ArgoConfigDetails object={configMap as any} extension={extension} />);

    expect(screen.getByText("ArgoCD RBAC")).toBeInTheDocument();
    expect(screen.getByText("role:readonly")).toBeInTheDocument();
    expect(screen.getByText("p | role:readonly | applications | get | */* | allow")).toBeInTheDocument();
  });
});
