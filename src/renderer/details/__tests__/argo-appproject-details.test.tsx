import { render, screen } from "@testing-library/react";
import { ArgoAppProjectDetails } from "../argo-appproject-details";

const extension = { name: "argocd-test-extension" } as any;

describe("ArgoAppProjectDetails", () => {
  it("renders all major sections for a populated AppProject", () => {
    render(
      <ArgoAppProjectDetails
        object={
          {
            spec: {
              sourceRepos: ["https://github.com/acme/apps.git"],
              destinations: [{ server: "https://kubernetes.default.svc", namespace: "apps" }],
              clusterResourceWhitelist: [{ group: "rbac.authorization.k8s.io", kind: "ClusterRole" }],
              namespaceResourceWhitelist: [{ group: "apps", kind: "Deployment" }],
              roles: [
                {
                  name: "dev",
                  description: "Developer access",
                  policies: ["p, proj:dev, applications, get, */*, allow"],
                  jwtTokens: [{ iat: 123 }],
                },
              ],
              syncWindows: [
                {
                  kind: "allow",
                  schedule: "* * * * *",
                  duration: "1h",
                  applications: ["*"],
                  manualSync: true,
                  timeZone: "UTC",
                },
              ],
              sourceNamespaces: ["apps"],
              orphanedResources: {
                warn: true,
                ignore: [{ kind: "ConfigMap", name: "ignored" }],
              },
            },
          } as any
        }
        extension={extension}
      />,
    );

    expect(screen.getByText("Source Repositories")).toBeInTheDocument();
    expect(screen.getByText("Destinations")).toBeInTheDocument();
    expect(screen.getByText("Cluster Resource Whitelist")).toBeInTheDocument();
    expect(screen.getByText("Namespace Resource Whitelist")).toBeInTheDocument();
    expect(screen.getByText("Roles")).toBeInTheDocument();
    expect(screen.getByText("Sync Windows")).toBeInTheDocument();
    expect(screen.getByText("Source Namespaces")).toBeInTheDocument();
    expect(screen.getByText("Orphaned Resources")).toBeInTheDocument();
    expect(screen.getByText("https://github.com/acme/apps.git")).toBeInTheDocument();
    expect(screen.getByText("Developer access")).toBeInTheDocument();
  });

  it("renders graceful fallback values for missing optional fields", () => {
    render(
      <ArgoAppProjectDetails
        object={
          {
            spec: {},
          } as any
        }
        extension={extension}
      />,
    );

    expect(screen.getAllByText("None").length).toBeGreaterThan(0);
    expect(screen.getByText("N/A")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
