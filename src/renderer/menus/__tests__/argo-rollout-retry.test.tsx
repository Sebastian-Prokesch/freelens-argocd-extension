import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArgoRolloutRetryMenuItem } from "../argo-rollout-retry";

const patchMock = jest.fn();

jest.mock("../../k8s/rollouts", () => ({
  getArgoRolloutStore: () => ({
    patch: patchMock,
  }),
  canRetryRollout: jest.requireActual("../../k8s/rollouts/state").canRetryRollout,
  getRetryMergePatch: jest.requireActual("../../k8s/rollouts/actions").getRetryMergePatch,
}));

const extension = { name: "argocd-test-extension" } as any;

describe("ArgoRolloutRetryMenuItem", () => {
  it("renders when rollout is degraded", () => {
    render(
      <ArgoRolloutRetryMenuItem
        object={
          {
            status: {
              phase: "Degraded",
            },
          } as any
        }
        extension={extension}
      />,
    );

    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("patches rollout when clicked", async () => {
    patchMock.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    const object = {
      status: {
        phase: "Degraded",
      },
    } as any;

    render(<ArgoRolloutRetryMenuItem object={object} extension={extension} />);

    await user.click(screen.getByText("Retry"));

    expect(patchMock).toHaveBeenCalledWith(
      object,
      {
        status: { abort: false },
      },
      "merge",
    );
  });
});
