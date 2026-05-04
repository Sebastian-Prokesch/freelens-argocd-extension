import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArgoRolloutAbortMenuItem } from "../argo-rollout-abort";

const patchMock = jest.fn();

jest.mock("../../k8s/rollouts", () => ({
  getArgoRolloutStore: () => ({
    patch: patchMock,
  }),
  canAbortRollout: jest.requireActual("../../k8s/rollouts/state").canAbortRollout,
  getAbortMergePatch: jest.requireActual("../../k8s/rollouts/actions").getAbortMergePatch,
}));

const extension = { name: "argocd-test-extension" } as any;

describe("ArgoRolloutAbortMenuItem", () => {
  it("renders when rollout is progressing", () => {
    render(
      <ArgoRolloutAbortMenuItem
        object={
          {
            status: {
              phase: "Progressing",
            },
          } as any
        }
        extension={extension}
      />,
    );

    expect(screen.getByText("Abort")).toBeInTheDocument();
  });

  it("patches rollout when clicked", async () => {
    patchMock.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    const object = {
      status: {
        phase: "Progressing",
      },
    } as any;

    render(<ArgoRolloutAbortMenuItem object={object} extension={extension} />);

    await user.click(screen.getByText("Abort"));

    expect(patchMock).toHaveBeenCalledWith(
      object,
      {
        status: { abort: true },
      },
      "merge",
    );
  });
});
