import { Renderer } from "@freelensapp/extensions";
import { act, render, screen, waitFor } from "@testing-library/react";

// We only need enough of these classes to satisfy `ArgoOverviewTabContent`'s effect.
const applicationStoreMock = {
  items: [],
  contextItems: [],
  loadAll: jest.fn(async () => {}),
  subscribe: jest.fn(() => () => {}),
};

const appProjectStoreMock = {
  items: [],
  contextItems: [],
  loadAll: jest.fn(async () => {}),
  subscribe: jest.fn(() => () => {}),
};

jest.mock("../../k8s/argocd", () => {
  return {
    getArgoApplicationStore: () => applicationStoreMock,
    getArgoAppProjectStore: () => appProjectStoreMock,
  };
});

import { ArgoOverviewTabContent } from "../argo-overview-page";

describe("ArgoOverviewTabContent", () => {
  const createDeferred = () => {
    let resolve: () => void;
    const promise = new Promise<void>((res) => {
      resolve = res;
    });
    return { promise, resolve: resolve! };
  };

  const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

  beforeEach(() => {
    const namespaceStore = Renderer.K8sApi.namespaceStore as any;

    namespaceStore.items = [{ getName: () => "argocd" }];
    namespaceStore.loadAll = jest.fn(async () => {});
    namespaceStore.subscribe = jest.fn(() => () => {});

    applicationStoreMock.loadAll.mockImplementation(async () => {});
    applicationStoreMock.subscribe.mockImplementation(() => () => {});
    appProjectStoreMock.loadAll.mockImplementation(async () => {});
    appProjectStoreMock.subscribe.mockImplementation(() => () => {});
  });

  afterAll(() => {
    consoleLogSpy.mockRestore();
  });

  it("renders header, namespace filter, charts, and events", async () => {
    render(<ArgoOverviewTabContent />);

    await waitFor(() => expect(screen.getByText("ArgoCD Overview")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId("NamespaceSelectFilter")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId("Events")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("Health Summary")).toBeInTheDocument());

    // Both charts should be present and show their empty state
    await waitFor(() => expect(screen.getAllByText("No applications").length).toBeGreaterThan(0));
  });

  it("does not subscribe stores after unmount while namespace loading is pending", async () => {
    const namespaceStore = Renderer.K8sApi.namespaceStore as any;
    const deferredNamespaces = createDeferred();

    namespaceStore.loadAll = jest.fn(() => deferredNamespaces.promise);
    namespaceStore.subscribe = jest.fn(() => () => {});
    applicationStoreMock.subscribe.mockImplementation(() => () => {});
    appProjectStoreMock.subscribe.mockImplementation(() => () => {});

    const { unmount } = render(<ArgoOverviewTabContent />);
    unmount();

    await act(async () => {
      deferredNamespaces.resolve();
      await deferredNamespaces.promise;
    });

    expect(namespaceStore.subscribe).not.toHaveBeenCalled();
    expect(applicationStoreMock.subscribe).not.toHaveBeenCalled();
    expect(appProjectStoreMock.subscribe).not.toHaveBeenCalled();
  });
});
