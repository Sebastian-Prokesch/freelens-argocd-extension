import { render, screen, waitFor } from "@testing-library/react";

// We only need enough of these classes to satisfy `ArgoOverviewTabContent`'s effect.
jest.mock("../../k8s/argocd", () => {
  const makeStore = () => ({
    items: [],
    contextItems: [],
    loadAll: async () => {},
    subscribe: () => () => {},
  });

  return {
    getArgoApplicationStore: () => makeStore(),
    getArgoAppProjectStore: () => makeStore(),
  };
});

import { ArgoOverviewTabContent } from "../argo-overview-page";

describe("ArgoOverviewTabContent", () => {
  const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

  afterAll(() => {
    consoleLogSpy.mockRestore();
  });

  it("renders header, namespace filter, charts, and events", async () => {
    render(<ArgoOverviewTabContent />);

    await waitFor(() => expect(screen.getByText("ArgoCD Overview")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId("NamespaceSelectFilter")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId("Events")).toBeInTheDocument());

    // Both charts should be present and show their empty state
    await waitFor(() => expect(screen.getAllByText("No ArgoCD applications found").length).toBeGreaterThan(0));
  });
});
