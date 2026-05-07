import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArgoCronWorkflowResumeMenuItem, ArgoCronWorkflowSuspendMenuItem } from "../argo-cron-workflow-actions";

const patchMock = jest.fn();

jest.mock("../../k8s/workflows", () => ({
  getArgoCronWorkflowStore: () => ({
    patch: patchMock,
  }),
  canSuspendCronWorkflow: jest.requireActual("../../k8s/workflows/actions").canSuspendCronWorkflow,
  canResumeCronWorkflow: jest.requireActual("../../k8s/workflows/actions").canResumeCronWorkflow,
  getSuspendCronWorkflowPatch: jest.requireActual("../../k8s/workflows/actions").getSuspendCronWorkflowPatch,
  getResumeCronWorkflowPatch: jest.requireActual("../../k8s/workflows/actions").getResumeCronWorkflowPatch,
}));

const extension = { name: "argocd-test-extension" } as any;

describe("ArgoCronWorkflow action menu items", () => {
  beforeEach(() => {
    patchMock.mockReset();
  });

  it("renders and patches suspend action for active cron workflow", async () => {
    patchMock.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    const object = {
      getName: () => "cron-enabled",
      spec: { suspend: false },
    } as any;

    render(<ArgoCronWorkflowSuspendMenuItem object={object} extension={extension} />);
    await user.click(screen.getByText("Suspend"));

    expect(patchMock).toHaveBeenCalledWith(object, { spec: { suspend: true } }, "merge");
  });

  it("renders and patches resume action for suspended cron workflow", async () => {
    patchMock.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    const object = {
      getName: () => "cron-suspended",
      spec: { suspend: true },
    } as any;

    render(<ArgoCronWorkflowResumeMenuItem object={object} extension={extension} />);
    await user.click(screen.getByText("Resume"));

    expect(patchMock).toHaveBeenCalledWith(object, { spec: { suspend: false } }, "merge");
  });
});
