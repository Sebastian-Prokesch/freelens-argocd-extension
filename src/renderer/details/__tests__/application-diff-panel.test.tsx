import { render, screen } from "@testing-library/react";
import {
  buildApplicationResourceKey,
  getApplicationResourceRowElementId,
} from "../../k8s/argocd/application-diagnostics";
import { ApplicationDiffPanel } from "../application-diff-panel";

describe("ApplicationDiffPanel", () => {
  const scrollIntoViewMock = jest.fn();

  beforeEach(() => {
    scrollIntoViewMock.mockReset();
    Element.prototype.scrollIntoView = scrollIntoViewMock;
  });

  it("shows empty state when all resources are in sync", () => {
    render(
      <ApplicationDiffPanel
        resources={[{ name: "web", kind: "Deployment", status: "Synced", health: { status: "Healthy" } }]}
      />,
    );

    expect(screen.getByText("All resources in sync")).toBeInTheDocument();
  });

  it("renders grouped OutOfSync resources", () => {
    render(
      <ApplicationDiffPanel
        resources={[
          { name: "web", kind: "Deployment", namespace: "apps", status: "OutOfSync", health: { status: "Healthy" } },
          { name: "api", kind: "Service", namespace: "apps", status: "OutOfSync", health: { status: "Degraded" } },
        ]}
      />,
    );

    expect(screen.getByText("apps")).toBeInTheDocument();
    expect(screen.getByText("Deployment")).toBeInTheDocument();
    expect(screen.getByText("Service")).toBeInTheDocument();
    expect(screen.getByText("web")).toBeInTheDocument();
    expect(screen.getByText("api")).toBeInTheDocument();
    expect(screen.getAllByText("OutOfSync").length).toBeGreaterThan(0);
  });

  it("highlights the selected resource row", () => {
    const resourceKey = buildApplicationResourceKey({ name: "web", kind: "Deployment", namespace: "apps" }, "apps");

    render(
      <ApplicationDiffPanel
        resources={[
          { name: "web", kind: "Deployment", namespace: "apps", status: "OutOfSync", health: { status: "Healthy" } },
        ]}
        defaultNamespace="apps"
        highlightedResourceKey={resourceKey}
      />,
    );

    const highlightedRow = document.getElementById(getApplicationResourceRowElementId(resourceKey));
    expect(highlightedRow).toBeInTheDocument();
    expect(highlightedRow?.className).toContain("highlightedRow");
  });

  it("scrolls highlighted resource row into view", () => {
    const resourceKey = buildApplicationResourceKey({ name: "web", kind: "Deployment", namespace: "apps" }, "apps");

    render(
      <ApplicationDiffPanel
        resources={[
          { name: "web", kind: "Deployment", namespace: "apps", status: "OutOfSync", health: { status: "Healthy" } },
        ]}
        defaultNamespace="apps"
        highlightedResourceKey={resourceKey}
      />,
    );

    expect(scrollIntoViewMock).toHaveBeenCalled();
  });

  it("groups resources under defaultNamespace when resource namespace is missing", () => {
    render(
      <ApplicationDiffPanel
        resources={[{ name: "crb", kind: "ClusterRoleBinding", status: "OutOfSync", health: { status: "Healthy" } }]}
        defaultNamespace="platform"
      />,
    );

    expect(screen.getByText("platform")).toBeInTheDocument();
    expect(screen.getByText("crb")).toBeInTheDocument();
  });
});
