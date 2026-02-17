import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArgoTerminateMenuItem } from "../argo-application-terminate";

const patchMock = jest.fn();

jest.mock("../../k8s/argocd", () => ({
  getArgoApplicationStore: () => ({
    patch: patchMock,
  }),
}));

const extension = { name: "argocd-test-extension" } as any;

describe("ArgoTerminateMenuItem", () => {
  it("renders when operation is in progress", () => {
    render(
      <ArgoTerminateMenuItem
        object={
          {
            status: {
              operationState: {
                phase: "Running",
              },
            },
          } as any
        }
        extension={extension}
      />,
    );

    expect(screen.getByText("Terminate Operation")).toBeInTheDocument();
  });

  it("does not render when operation is in terminal phase", () => {
    render(
      <ArgoTerminateMenuItem
        object={
          {
            status: {
              operationState: {
                phase: "Succeeded",
              },
            },
          } as any
        }
        extension={extension}
      />,
    );

    expect(screen.queryByText("Terminate Operation")).not.toBeInTheDocument();
  });

  it("patches operation to null when clicked", async () => {
    patchMock.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();

    render(
      <ArgoTerminateMenuItem
        object={
          {
            status: {
              operationState: {
                phase: "Running",
              },
            },
          } as any
        }
        extension={extension}
      />,
    );

    await user.click(screen.getByText("Terminate Operation"));

    expect(patchMock).toHaveBeenCalledWith(expect.any(Object), [{ op: "remove", path: "/operation" }], "json");
  });
});
