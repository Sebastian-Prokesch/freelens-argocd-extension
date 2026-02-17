import { Renderer } from "@freelensapp/extensions";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArgoRollbackMenuItem } from "../argo-application-rollback";

const patchMock = jest.fn();

jest.mock("../../k8s/argocd", () => ({
  getArgoApplicationStore: () => ({
    patch: patchMock,
  }),
}));

const extension = { name: "argocd-test-extension" } as any;

describe("ArgoRollbackMenuItem", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("does not render when no history is available", () => {
    render(<ArgoRollbackMenuItem object={{ status: { history: [] } } as any} extension={extension} />);

    expect(screen.queryByText("Rollback")).not.toBeInTheDocument();
  });

  it("renders when history entries exist", () => {
    render(
      <ArgoRollbackMenuItem
        object={
          {
            status: {
              history: [{ id: 1, revision: "abc123", initiatedBy: { username: "admin" } }],
            },
          } as any
        }
        extension={extension}
      />,
    );

    expect(screen.getByText("Rollback")).toBeInTheDocument();
  });

  it("rolls back to selected revision", async () => {
    patchMock.mockResolvedValueOnce(undefined);
    const okSpy = jest.spyOn(Renderer.Component.Notifications, "ok");
    const promptSpy = jest.spyOn(window, "prompt").mockReturnValue("1");
    const user = userEvent.setup();
    const object = {
      status: {
        history: [{ id: 1, revision: "abc123", initiatedBy: { username: "admin" } }],
      },
    } as any;

    render(<ArgoRollbackMenuItem object={object} extension={extension} />);

    await user.click(screen.getByText("Rollback"));

    expect(promptSpy).toHaveBeenCalled();
    expect(patchMock).toHaveBeenCalledWith(
      object,
      {
        operation: {
          initiatedBy: {
            username: "LensApp",
          },
          sync: {
            revision: "abc123",
          },
        },
      },
      "merge",
    );
    expect(okSpy).toHaveBeenCalledWith("Rollback started for revision abc123");
  });

  it("shows an error for invalid selection", async () => {
    const errorSpy = jest.spyOn(Renderer.Component.Notifications, "error");
    jest.spyOn(window, "prompt").mockReturnValue("10");
    const user = userEvent.setup();

    render(
      <ArgoRollbackMenuItem
        object={
          {
            status: {
              history: [{ id: 1, revision: "abc123", initiatedBy: { username: "admin" } }],
            },
          } as any
        }
        extension={extension}
      />,
    );

    await user.click(screen.getByText("Rollback"));

    expect(errorSpy).toHaveBeenCalledWith("Invalid rollback selection");
  });
});
