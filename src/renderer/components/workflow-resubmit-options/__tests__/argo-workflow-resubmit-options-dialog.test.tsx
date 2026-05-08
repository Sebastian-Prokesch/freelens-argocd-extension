import { Renderer } from "@freelensapp/extensions";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArgoWorkflowResubmitOptionsDialog } from "../argo-workflow-resubmit-options-dialog";

const requestWorkflowActionMock = jest.fn();
const closeDialogMock = jest.fn();

jest.mock("../../../k8s/workflows", () => ({
  ...jest.requireActual("../../../k8s/workflows"),
  getArgoWorkflowStore: () => ({}),
  requestWorkflowAction: (...args: any[]) => requestWorkflowActionMock(...args),
}));

jest.mock("../argo-workflow-resubmit-options-dialog-store", () => ({
  argoWorkflowResubmitOptionsDialogStore: {
    isOpen: true,
    target: {
      workflow: {
        getName: () => "wf-demo",
        metadata: { name: "wf-demo", namespace: "argocd" },
        spec: {},
      },
    },
    close: (...args: any[]) => closeDialogMock(...args),
  },
}));

const notifications = Renderer.Component.Notifications;
const dialogStoreMock = (jest.requireMock("../argo-workflow-resubmit-options-dialog-store") as any)
  .argoWorkflowResubmitOptionsDialogStore;

describe("ArgoWorkflowResubmitOptionsDialog", () => {
  beforeEach(() => {
    requestWorkflowActionMock.mockReset();
    closeDialogMock.mockReset();
    (notifications.ok as jest.Mock).mockReset();
    (notifications.error as jest.Mock).mockReset();
    dialogStoreMock.isOpen = true;
    dialogStoreMock.target = {
      workflow: {
        getName: () => "wf-demo",
        metadata: { name: "wf-demo", namespace: "argocd" },
        spec: {},
      },
    };
  });

  it("submits parsed key=value parameter overrides", async () => {
    requestWorkflowActionMock.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<ArgoWorkflowResubmitOptionsDialog />);
    fireEvent.change(screen.getByTestId("Input"), {
      target: { value: "foo=bar" },
    });

    await user.click(screen.getByRole("button", { name: "Resubmit" }));

    expect(requestWorkflowActionMock).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), "resubmit", {
      parameters: [{ name: "foo", value: "bar" }],
    });
    expect(notifications.ok).toHaveBeenCalledWith("Resubmit requested for wf-demo");
    expect(closeDialogMock).toHaveBeenCalled();
  });

  it("shows validation error when parameter line is invalid", async () => {
    const user = userEvent.setup();

    render(<ArgoWorkflowResubmitOptionsDialog />);
    fireEvent.change(screen.getByTestId("Input"), {
      target: { value: "missing-separator" },
    });

    await user.click(screen.getByRole("button", { name: "Resubmit" }));

    expect(requestWorkflowActionMock).not.toHaveBeenCalled();
    expect(notifications.error).toHaveBeenCalledWith(
      'Invalid parameter override "missing-separator". Use key=value format.',
    );
    expect(
      screen.getByText('Invalid parameter override "missing-separator". Use key=value format.'),
    ).toBeInTheDocument();
  });

  it("does not render memoized control in clone mode", () => {
    render(<ArgoWorkflowResubmitOptionsDialog />);

    expect(screen.queryByText(/memoized/i)).not.toBeInTheDocument();
  });
});
