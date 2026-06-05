import { Renderer } from "@freelensapp/extensions";
import { act, render, screen, waitFor } from "@testing-library/react";

// We only need enough of these classes to satisfy `ArgoOverviewTabContent`'s effect.
const applicationStoreMock = {
  items: [],
  contextItems: [] as any[],
  loadAll: jest.fn(async () => {}),
  subscribe: jest.fn(() => () => {}),
};

const appProjectStoreMock = {
  items: [],
  contextItems: [] as any[],
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
    applicationStoreMock.contextItems = [];
    appProjectStoreMock.loadAll.mockImplementation(async () => {});
    appProjectStoreMock.subscribe.mockImplementation(() => () => {});
    appProjectStoreMock.contextItems = [];
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
    expect(screen.getByTestId("overview-status-total-applications")).toHaveTextContent("0");
    expect(screen.getByTestId("overview-status-total-projects")).toHaveTextContent("0");
  });

  it("renders overview status card values for loaded application and project data", async () => {
    applicationStoreMock.contextItems = [
      { status: { sync: { status: "OutOfSync" }, health: { status: "Degraded" } } },
      { status: { sync: { status: "Synced" }, health: { status: "Progressing" } } },
      { status: { sync: { status: "OutOfSync" }, health: { status: "Healthy" } } },
    ];
    appProjectStoreMock.contextItems = [{}, {}];

    render(<ArgoOverviewTabContent />);

    await waitFor(() => expect(screen.getByTestId("overview-status-total-applications")).toHaveTextContent("3"));
    expect(screen.getByTestId("overview-status-out-of-sync")).toHaveTextContent("2");
    expect(screen.getByTestId("overview-status-degraded")).toHaveTextContent("1");
    expect(screen.getByTestId("overview-status-progressing")).toHaveTextContent("1");
    expect(screen.getByTestId("overview-status-total-projects")).toHaveTextContent("2");
  });

  it("renders loading placeholders in overview status cards while data is loading", () => {
    const namespaceStore = Renderer.K8sApi.namespaceStore as any;
    const deferredNamespaces = createDeferred();
    namespaceStore.loadAll = jest.fn(() => deferredNamespaces.promise);

    render(<ArgoOverviewTabContent />);

    expect(screen.getByTestId("overview-status-total-applications")).toHaveTextContent("...");
    expect(screen.getByTestId("overview-status-out-of-sync")).toHaveTextContent("...");
    expect(screen.getByTestId("overview-status-total-projects")).toHaveTextContent("...");
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
