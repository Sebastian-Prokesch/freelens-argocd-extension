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
    expect(screen.getByText("default")).toBeInTheDocument();
    expect(screen.getByText("HTTPS")).toBeInTheDocument();
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
    expect(screen.getByText("apps")).toBeInTheDocument();
    expect(screen.getByText("default")).toBeInTheDocument();
    expect(screen.getByTestId("BadgeBoolean")).toHaveTextContent("true");
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
});

