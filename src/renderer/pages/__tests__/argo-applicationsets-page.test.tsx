import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ArgoApplicationSetsTabContent } from "../argo-applicationsets-page";

const mockItems = [
  {
    getName: () => "demo-appset",
    getNs: () => "argocd",
    getCreationTimestamp: () => "2025-01-01T00:00:00.000Z",
    getSearchFields: () => ["demo-appset", "argocd"],
    status: {},
  },
];

const mockStore = {
  items: mockItems,
  api: {
    formatUrlForNotListing: ({ namespace, name }: { namespace: string; name: string }) =>
      `/apis/argoproj.io/v1alpha1/namespaces/${namespace}/applicationsets/${name}`,
  },
};

jest.mock("../../k8s/argocd", () => ({
  ArgoApplicationSet: {
    crd: {
      plural: "applicationsets",
      title: "Argo ApplicationSets",
    },
  },
  getArgoApplicationSetStore: () => mockStore,
}));

describe("ArgoApplicationSetsTabContent", () => {
  it("links applicationset name to details", () => {
    render(
      <MemoryRouter>
        <ArgoApplicationSetsTabContent />
      </MemoryRouter>,
    );

    const nameLink = screen.getByRole("link", { name: "demo-appset" });

    expect(nameLink).toHaveAttribute(
      "href",
      "/apis/argoproj.io/v1alpha1/namespaces/argocd/applicationsets/demo-appset",
    );
  });

  it("renders namespace and age columns without app counters", () => {
    render(
      <MemoryRouter>
        <ArgoApplicationSetsTabContent />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "argocd" })).toHaveAttribute("href", "/api/v1/namespaces/argocd");
    expect(screen.queryByText("Planned Applications")).not.toBeInTheDocument();
    expect(screen.queryByText("Created Applications")).not.toBeInTheDocument();
  });
});
