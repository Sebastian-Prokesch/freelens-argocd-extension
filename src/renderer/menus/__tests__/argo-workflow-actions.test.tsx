import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Renderer } from "@freelensapp/extensions";
import {
  ArgoWorkflowResubmitMenuItem,
  ArgoWorkflowResumeMenuItem,
  ArgoWorkflowRetryMenuItem,
  ArgoWorkflowSuspendMenuItem,
  ArgoWorkflowTerminateMenuItem,
} from "../argo-workflow-actions";

const patchMock = jest.fn();
const requestWorkflowActionMock = jest.fn();

jest.mock("../../k8s/workflows", () => ({
  getArgoWorkflowStore: () => ({
    patch: patchMock,
  }),
  canSuspendWorkflow: jest.requireActual("../../k8s/workflows/actions").canSuspendWorkflow,
  canResumeWorkflow: jest.requireActual("../../k8s/workflows/actions").canResumeWorkflow,
  canTerminateWorkflow: jest.requireActual("../../k8s/workflows/actions").canTerminateWorkflow,
  canRetryWorkflow: jest.requireActual("../../k8s/workflows/actions").canRetryWorkflow,
  canResubmitWorkflow: jest.requireActual("../../k8s/workflows/actions").canResubmitWorkflow,
  getSuspendWorkflowPatch: jest.requireActual("../../k8s/workflows/actions").getSuspendWorkflowPatch,
  getResumeWorkflowPatch: jest.requireActual("../../k8s/workflows/actions").getResumeWorkflowPatch,
  getTerminateWorkflowPatch: jest.requireActual("../../k8s/workflows/actions").getTerminateWorkflowPatch,
  getErrorMessage: jest.requireActual("../../k8s/workflows/actions").getErrorMessage,
  requestWorkflowAction: (...args: any[]) => requestWorkflowActionMock(...args),
}));

const extension = { name: "argocd-test-extension" } as any;
const notifications = Renderer.Component.Notifications;

describe("ArgoWorkflow action menu items", () => {
  beforeEach(() => {
    patchMock.mockReset();
    requestWorkflowActionMock.mockReset();
    (notifications.ok as jest.Mock).mockReset();
    (notifications.error as jest.Mock).mockReset();
  });

  it("renders and patches suspend action for running workflow", async () => {
    patchMock.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    const object = {
      getName: () => "wf-running",
      spec: { suspend: false },
      status: { phase: "Running" },
    } as any;

    render(<ArgoWorkflowSuspendMenuItem object={object} extension={extension} />);
    await user.click(screen.getByText("Suspend"));

    expect(patchMock).toHaveBeenCalledWith(object, { spec: { suspend: true } }, "merge");
  });

  it("renders and patches resume action for suspended workflow", async () => {
    patchMock.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    const object = {
      getName: () => "wf-suspended",
      spec: { suspend: true },
      status: { phase: "Running" },
    } as any;

    render(<ArgoWorkflowResumeMenuItem object={object} extension={extension} />);
    await user.click(screen.getByText("Resume"));

    expect(patchMock).toHaveBeenCalledWith(object, { spec: { suspend: false } }, "merge");
  });

  it("renders and patches terminate action for running workflow", async () => {
    patchMock.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    const object = {
      getName: () => "wf-terminating",
      status: { phase: "Running" },
      spec: {},
    } as any;

    render(<ArgoWorkflowTerminateMenuItem object={object} extension={extension} />);
    await user.click(screen.getByText("Terminate"));

    expect(patchMock).toHaveBeenCalledWith(object, { spec: { shutdown: "Terminate" } }, "merge");
  });

  it("triggers retry and resubmit workflow actions", async () => {
    requestWorkflowActionMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    const object = {
      getName: () => "wf-finished",
      status: { phase: "Failed" },
      spec: {},
    } as any;

    render(
      <>
        <ArgoWorkflowRetryMenuItem object={object} extension={extension} />
        <ArgoWorkflowResubmitMenuItem object={object} extension={extension} />
      </>,
    );

    await user.click(screen.getByText("Retry"));
    await user.click(screen.getByText("Resubmit"));

    expect(requestWorkflowActionMock).toHaveBeenNthCalledWith(1, expect.any(Object), object, "retry");
    expect(requestWorkflowActionMock).toHaveBeenNthCalledWith(2, expect.any(Object), object, "resubmit");
    expect(notifications.ok).toHaveBeenNthCalledWith(1, "Retry requested for wf-finished");
    expect(notifications.ok).toHaveBeenNthCalledWith(2, "Resubmit requested for wf-finished");
  });

  it("hides resubmit for running workflows", () => {
    const object = {
      getName: () => "wf-running",
      status: { phase: "Running" },
      spec: { suspend: false },
    } as any;

    render(<ArgoWorkflowResubmitMenuItem object={object} extension={extension} />);

    expect(screen.queryByText("Resubmit")).not.toBeInTheDocument();
  });

  it("shows retry only for failed workflows and resubmit only for succeeded workflows", () => {
    const failed = {
      getName: () => "wf-failed",
      status: { phase: "Failed" },
      spec: { suspend: false },
    } as any;
    const succeeded = {
      getName: () => "wf-succeeded",
      status: { phase: "Succeeded" },
      spec: { suspend: false },
    } as any;

    const { rerender } = render(
      <>
        <ArgoWorkflowRetryMenuItem object={failed} extension={extension} />
        <ArgoWorkflowResubmitMenuItem object={failed} extension={extension} />
      </>,
    );

    expect(screen.getByText("Retry")).toBeInTheDocument();
    expect(screen.getByText("Resubmit")).toBeInTheDocument();

    rerender(
      <>
        <ArgoWorkflowRetryMenuItem object={succeeded} extension={extension} />
        <ArgoWorkflowResubmitMenuItem object={succeeded} extension={extension} />
      </>,
    );

    expect(screen.queryByText("Retry")).not.toBeInTheDocument();
    expect(screen.getByText("Resubmit")).toBeInTheDocument();
  });

  it("surfaces non-Error failures from workflow action requests", async () => {
    requestWorkflowActionMock.mockRejectedValue({ response: { data: { message: "Action rejected" } } });
    const user = userEvent.setup();
    const object = {
      getName: () => "wf-failed",
      status: { phase: "Failed" },
      spec: { suspend: false },
    } as any;

    render(<ArgoWorkflowRetryMenuItem object={object} extension={extension} />);
    await user.click(screen.getByText("Retry"));

    expect(notifications.error).toHaveBeenCalledWith("Action rejected");
  });
});
