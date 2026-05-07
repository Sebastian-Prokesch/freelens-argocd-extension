import { Renderer } from "@freelensapp/extensions";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArgoWorkflowDetails } from "../argo-workflow-details";

const patchMock = jest.fn();
const requestWorkflowActionMock = jest.fn();
const openResubmitOptionsDialogMock = jest.fn();

jest.mock("../../k8s/workflows", () => ({
  ...jest.requireActual("../../k8s/workflows"),
  getArgoWorkflowStore: () => ({
    patch: patchMock,
  }),
  requestWorkflowAction: (...args: any[]) => requestWorkflowActionMock(...args),
}));

jest.mock("../../components/workflow-resubmit-options", () => ({
  argoWorkflowResubmitOptionsDialogStore: {
    open: (...args: any[]) => openResubmitOptionsDialogMock(...args),
  },
}));

const extension = { name: "argocd-test-extension" } as any;
const notifications = Renderer.Component.Notifications;

describe("ArgoWorkflowDetails", () => {
  beforeEach(() => {
    patchMock.mockReset();
    requestWorkflowActionMock.mockReset();
    openResubmitOptionsDialogMock.mockReset();
    (notifications.ok as jest.Mock).mockReset();
    (notifications.error as jest.Mock).mockReset();
  });

  it("shows and triggers resubmit for succeeded workflow", async () => {
    requestWorkflowActionMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    const object = {
      getName: () => "wf-succeeded",
      status: { phase: "Succeeded", progress: "1/1", startedAt: "2025-01-01T00:00:00Z" },
      spec: { suspend: false },
    } as any;

    render(<ArgoWorkflowDetails object={object} extension={extension} />);
    await user.click(screen.getByRole("button", { name: "Resubmit" }));

    expect(requestWorkflowActionMock).toHaveBeenCalledWith(expect.any(Object), object, "resubmit");
    expect(notifications.ok).toHaveBeenCalledWith("Resubmit requested for wf-succeeded");
  });

  it("opens resubmit options dialog from details actions", async () => {
    const user = userEvent.setup();
    const object = {
      getName: () => "wf-succeeded",
      status: { phase: "Succeeded", progress: "1/1", startedAt: "2025-01-01T00:00:00Z" },
      spec: { suspend: false },
    } as any;

    render(<ArgoWorkflowDetails object={object} extension={extension} />);
    await user.click(screen.getByRole("button", { name: "Resubmit with options" }));

    expect(openResubmitOptionsDialogMock).toHaveBeenCalledWith(object);
  });

  it("does not show resubmit while workflow is running", () => {
    const object = {
      getName: () => "wf-running",
      status: { phase: "Running", progress: "1/2", startedAt: "2025-01-01T00:00:00Z" },
      spec: { suspend: false },
    } as any;

    render(<ArgoWorkflowDetails object={object} extension={extension} />);

    expect(screen.queryByRole("button", { name: "Resubmit" })).not.toBeInTheDocument();
  });

  it("shows detailed error message when resubmit fails with API error payload", async () => {
    requestWorkflowActionMock.mockRejectedValue({ response: { data: { message: "Resubmit denied" } } });
    const user = userEvent.setup();
    const object = {
      getName: () => "wf-failed",
      status: { phase: "Failed", progress: "0/1", startedAt: "2025-01-01T00:00:00Z" },
      spec: { suspend: false },
    } as any;

    render(<ArgoWorkflowDetails object={object} extension={extension} />);
    await user.click(screen.getByRole("button", { name: "Resubmit" }));

    expect(notifications.error).toHaveBeenCalledWith("Resubmit denied");
  });
});
