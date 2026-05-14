import { Renderer } from "@freelensapp/extensions";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  ARGOCD_CONFIGMAP_LABEL_SELECTOR,
  ARGOCD_NOTIFICATIONS_SECRET_FIELD_SELECTOR,
  ARGOCD_TYPED_SECRET_LABEL_SELECTOR,
} from "../../k8s/argocd/argo-config-resource-loader";
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
  getId: () => `${namespace}/${name}`,
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

    const repoSecret = makeObject(
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
    );
    const notificationsSecret = makeObject(
      "argocd-notifications-secret",
      "argocd",
      {},
      {
        data: { "slack-token": "ZXhhbXBsZQ==" },
      },
    );
    const notificationsCm = makeObject(
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
    );

    namespaceStore.items = [{ getName: () => "argocd" }];
    namespaceStore.contextNamespaces = ["argocd"];
    namespaceStore.loadAll = jest.fn(async () => {});
    namespaceStore.subscribe = jest.fn(() => () => {});
    namespaceStore.onContextChange = jest.fn(() => () => {});

    secretsStore.loadAll = jest.fn(async () => {});
    secretsStore.subscribe = jest.fn(() => () => {});
    secretsStore.api = {
      list: jest.fn(async (_opts: { namespace: string }, query?: Record<string, string>) => {
        if (query?.labelSelector === ARGOCD_TYPED_SECRET_LABEL_SELECTOR) {
          return [repoSecret];
        }

        if (query?.fieldSelector === ARGOCD_NOTIFICATIONS_SECRET_FIELD_SELECTOR) {
          return [notificationsSecret];
        }

        return [];
      }),
    };

    configMapStore.loadAll = jest.fn(async () => {});
    configMapStore.subscribe = jest.fn(() => () => {});
    configMapStore.api = {
      list: jest.fn(async (_opts: { namespace: string }, query?: Record<string, string>) => {
        expect(query?.labelSelector).toBe(ARGOCD_CONFIGMAP_LABEL_SELECTOR);
        return [notificationsCm];
      }),
    };
  });

  it("renders config tabs and loads rows", async () => {
    render(<ArgoConfigTabContent />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Repositories" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clusters" })).toBeInTheDocument();
    expect(screen.getAllByTestId("KubeObjectListLayoutRow").length).toBeGreaterThan(0);
  });

  it("lists secrets with server-side selectors instead of unfiltered loadAll", async () => {
    const secretsStore = Renderer.K8sApi.secretsStore as any;
    render(<ArgoConfigTabContent />);

    await waitFor(() => expect(secretsStore.api.list).toHaveBeenCalled());
    expect(secretsStore.loadAll).not.toHaveBeenCalled();
    expect(secretsStore.subscribe).not.toHaveBeenCalled();
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
    namespaceStore.onContextChange = jest.fn(() => () => {});
    secretsStore.api = { list: jest.fn(async () => []) };
    configMapStore.api = { list: jest.fn(async () => []) };

    const { unmount } = render(<ArgoConfigTabContent />);
    unmount();

    await act(async () => {
      deferredNamespaces.resolve();
      await deferredNamespaces.promise;
    });

    expect(namespaceStore.subscribe).not.toHaveBeenCalled();
    expect(secretsStore.api.list).not.toHaveBeenCalled();
    expect(configMapStore.api.list).not.toHaveBeenCalled();
  });
});
