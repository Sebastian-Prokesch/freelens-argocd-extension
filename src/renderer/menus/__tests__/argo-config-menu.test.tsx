import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Renderer } from "@freelensapp/extensions";
import { ArgoConfigMenuItem } from "../argo-config-menu";

const extension = { name: "argocd-test-extension" } as any;

const makeObject = (labels: Record<string, string>) => ({
  metadata: {
    name: "test",
    namespace: "argocd",
    labels,
  },
  getName: () => "test",
  getNs: () => "argocd",
});

describe("ArgoConfigMenuItem", () => {
  it("renders only for labeled resources", () => {
    const { rerender } = render(
      <ArgoConfigMenuItem object={makeObject({}) as any} extension={extension} />,
    );

    expect(screen.queryByTestId("MenuItem")).not.toBeInTheDocument();

    rerender(
      <ArgoConfigMenuItem
        object={makeObject({ "argocd.argoproj.io/secret-type": "repository" }) as any}
        extension={extension}
      />,
    );

    expect(screen.getByText("Edit ArgoCD Config")).toBeInTheDocument();
  });

  it("invokes remove on delete", async () => {
    const object = makeObject({ "argocd.argoproj.io/secret-type": "repository" });
    const secretsStore = Renderer.K8sApi.secretsStore as any;
    const user = userEvent.setup();

    render(<ArgoConfigMenuItem object={object as any} extension={extension} />);

    await user.click(screen.getByText("Delete ArgoCD Config"));

    expect(secretsStore.remove).toHaveBeenCalledWith(object);
  });
});

