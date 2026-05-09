import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ArgoWorkflowDetails } from "../argo-workflow-details";

const extension = { name: "argocd-test-extension" } as any;

describe("ArgoWorkflowDetails", () => {
  it("renders read-only workflow status fields", () => {
    const object = {
      status: {
        phase: "Succeeded",
        progress: "1/1",
        startedAt: "2025-01-01T00:00:00Z",
        finishedAt: "2025-01-01T00:01:00Z",
        message: "Workflow completed",
      },
      spec: { suspend: true },
    } as any;

    render(
      <MemoryRouter>
        <ArgoWorkflowDetails object={object} extension={extension} />
      </MemoryRouter>,
    );

    expect(screen.getAllByText("Suspended")).toHaveLength(2);
    expect(screen.getByText("1/1")).toBeInTheDocument();
    expect(screen.getByText("2025-01-01T00:00:00Z")).toBeInTheDocument();
    expect(screen.getByText("2025-01-01T00:01:00Z")).toBeInTheDocument();
    expect(screen.getByText("Workflow completed")).toBeInTheDocument();
    expect(screen.queryByText("true")).not.toBeInTheDocument();
    expect(screen.getByText("No pod logs available yet")).toBeInTheDocument();
  });

  it("does not render any workflow action buttons", () => {
    const object = {
      status: {
        phase: "Failed",
        progress: "0/1",
        startedAt: "2025-01-01T00:00:00Z",
        nodes: {
          nodeA: {
            id: "nodeA",
            displayName: "step-a",
            podName: "workflow-pod-a",
            phase: "Succeeded",
          },
        },
      },
      spec: { suspend: false },
    } as any;

    render(
      <MemoryRouter>
        <ArgoWorkflowDetails object={object} extension={extension} />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("button", { name: "Suspend" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resume" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Terminate" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resubmit" })).not.toBeInTheDocument();
    expect(screen.getByText("Not Suspended")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "workflow-pod-a" })).toHaveAttribute(
      "href",
      "/api/v1/namespaces/default/pods/workflow-pod-a",
    );
  });
});
