import { Renderer } from "@freelensapp/extensions";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ArgoConfigTabContent } from "../argo-config-page";

const makeObject = (
  name: string,
  namespace: string,
  labels: Record<string, string>,
  extra: Record<string, any> = {},
) => ({
  metadata: {
    name,
    namespace,
    labels,
  },
  data: undefined,
  stringData: undefined,
  getName: () => name,
  getNs: () => namespace,
  getCreationTimestamp: () => "2026-05-12T00:00:00.000Z",
  getSearchFields: () => [name, namespace],
  ...extra,
});

describe("ArgoConfigTabContent", () => {
  const createDeferred = () => {
    let resolve: () => void;
    const promise = new Promise<void>((res) => {
      resolve = res;
    });
    return { promise, resolve: resolve! };
  };

  beforeEach(() => {
    const namespaceStore = Renderer.K8sApi.namespaceStore as any;
    const secretsStore = Renderer.K8sApi.secretsStore as any;
    const configMapStore = Renderer.K8sApi.configMapStore as any;

    namespaceStore.items = [{ getName: () => "argocd" }];
    namespaceStore.loadAll = jest.fn(async () => {});
    namespaceStore.subscribe = jest.fn(() => () => {});

    secretsStore.loadAll = jest.fn(async () => {});
    secretsStore.subscribe = jest.fn(() => () => {});
    secretsStore.contextItems = [
      makeObject(
        "repo-secret",
        "argocd",
        { "argocd.argoproj.io/secret-type": "repository" },
        {
          stringData: {
            type: "git",
            url: "https://github.com/example/project.git",
            username: "example-user",
          },
        },
      ),
      makeObject("argocd-notifications-secret", "argocd", {}, { data: { "slack-token": "ZXhhbXBsZQ==" } }),
    ];

    configMapStore.loadAll = jest.fn(async () => {});
    configMapStore.subscribe = jest.fn(() => () => {});
    configMapStore.contextItems = [
      makeObject(
        "argocd-notifications-cm",
        "argocd",
        { "app.kubernetes.io/part-of": "argocd" },
        {
          data: {
            "trigger.on-sync-succeeded": "value",
            "template.app-sync": "value",
            subscriptions: "- recipients: [slack]",
          },
        },
      ),
    ];
  });

  it("renders config tabs and loads rows", async () => {
    render(<ArgoConfigTabContent />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Repositories" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clusters" })).toBeInTheDocument();
    expect(screen.getAllByTestId("KubeObjectListLayoutRow").length).toBeGreaterThan(0);
  });

  it("renders notifications resources in notifications tab", async () => {
    render(<ArgoConfigTabContent />);

    await waitFor(() => expect(screen.getByText("repo-secret")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));

    await waitFor(() => expect(screen.getAllByText("argocd-notifications-cm").length).toBeGreaterThan(0));
    expect(screen.getAllByText("argocd-notifications-secret").length).toBeGreaterThan(0);
    expect(screen.getByText("ConfigMap")).toBeInTheDocument();
    expect(screen.getByText("Secret")).toBeInTheDocument();
  });

  it("does not subscribe stores after unmount while loadAll is pending", async () => {
    const namespaceStore = Renderer.K8sApi.namespaceStore as any;
    const secretsStore = Renderer.K8sApi.secretsStore as any;
    const configMapStore = Renderer.K8sApi.configMapStore as any;
    const deferredNamespaces = createDeferred();

    namespaceStore.loadAll = jest.fn(() => deferredNamespaces.promise);
    namespaceStore.subscribe = jest.fn(() => () => {});
    secretsStore.subscribe = jest.fn(() => () => {});
    configMapStore.subscribe = jest.fn(() => () => {});

    const { unmount } = render(<ArgoConfigTabContent />);
    unmount();

    await act(async () => {
      deferredNamespaces.resolve();
      await deferredNamespaces.promise;
    });

    expect(namespaceStore.subscribe).not.toHaveBeenCalled();
    expect(secretsStore.subscribe).not.toHaveBeenCalled();
    expect(configMapStore.subscribe).not.toHaveBeenCalled();
  });
});
