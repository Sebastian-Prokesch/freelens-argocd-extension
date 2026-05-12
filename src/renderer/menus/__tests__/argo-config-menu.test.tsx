import { render, screen } from "@testing-library/react";
import { ArgoConfigMenuItem } from "../argo-config-menu";

const extension = { name: "argocd-test-extension" } as any;

const makeObject = (labels: Record<string, string>, kind?: string, name = "test") => ({
  kind,
  metadata: {
    name,
    namespace: "argocd",
    labels,
  },
  getName: () => name,
  getNs: () => "argocd",
});

describe("ArgoConfigMenuItem", () => {
  it("renders only for labeled resources", () => {
    const { rerender } = render(<ArgoConfigMenuItem object={makeObject({}) as any} extension={extension} />);

    expect(screen.queryByTestId("MenuItem")).not.toBeInTheDocument();

    rerender(
      <ArgoConfigMenuItem
        object={makeObject({ "argocd.argoproj.io/secret-type": "repository" }, "Secret") as any}
        extension={extension}
      />,
    );

    expect(screen.getByText("Edit ArgoCD Config")).toBeInTheDocument();
  });

  it("renders for whitelisted argocd configmap names only", () => {
    const { rerender } = render(
      <ArgoConfigMenuItem
        object={makeObject({ "app.kubernetes.io/part-of": "argocd" }, "ConfigMap", "custom-argocd-cm") as any}
        extension={extension}
      />,
    );

    expect(screen.queryByTestId("MenuItem")).not.toBeInTheDocument();

    rerender(
      <ArgoConfigMenuItem
        object={makeObject({ "app.kubernetes.io/part-of": "argocd" }, "ConfigMap", "argocd-cm") as any}
        extension={extension}
      />,
    );

    expect(screen.getByText("Edit ArgoCD Config")).toBeInTheDocument();
  });

  it("does not render for notifications secret without Argo secret label", () => {
    render(
      <ArgoConfigMenuItem
        object={
          {
            ...makeObject({}),
            metadata: {
              name: "argocd-notifications-secret",
              namespace: "argocd",
              labels: {},
            },
          } as any
        }
        extension={extension}
      />,
    );

    expect(screen.queryByTestId("MenuItem")).not.toBeInTheDocument();
  });

  it("does not render Argo-specific action in toolbar mode", () => {
    render(
      <ArgoConfigMenuItem
        object={makeObject({ "argocd.argoproj.io/secret-type": "repository" }, "Secret") as any}
        extension={extension}
        toolbar
      />,
    );

    expect(screen.queryByTestId("MenuItem")).not.toBeInTheDocument();
  });

  it("does not render when kind and label type mismatch", () => {
    render(
      <ArgoConfigMenuItem
        object={makeObject({ "argocd.argoproj.io/secret-type": "repository" }, "ConfigMap") as any}
        extension={extension}
      />,
    );

    expect(screen.queryByTestId("MenuItem")).not.toBeInTheDocument();
  });

  it("renders a distinct Argo config edit action", () => {
    render(
      <ArgoConfigMenuItem
        object={makeObject({ "argocd.argoproj.io/secret-type": "repository" }, "Secret") as any}
        extension={extension}
      />,
    );

    expect(screen.getByText("Edit ArgoCD Config")).toBeInTheDocument();
  });
});
