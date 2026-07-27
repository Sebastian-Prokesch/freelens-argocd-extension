import { render, screen } from "@testing-library/react";
import { ApplicationDiffPanel } from "../application-diff-panel";

describe("ApplicationDiffPanel", () => {
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
});
