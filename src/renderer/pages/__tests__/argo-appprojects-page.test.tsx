import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ArgoAppProjectsTabContent } from "../argo-appprojects-page";

const mockItems = [
  {
    getName: () => "default",
    getNs: () => "argocd",
    getCreationTimestamp: () => "2025-01-01T00:00:00.000Z",
    getSearchFields: () => ["default", "argocd"],
    spec: { description: "Default project" },
  },
  {
    getName: () => "empty",
    getNs: () => "argocd",
    getCreationTimestamp: () => "2025-01-02T00:00:00.000Z",
    getSearchFields: () => ["empty", "argocd"],
    spec: {},
  },
];

const mockStore = {
  items: mockItems,
  api: {
    formatUrlForNotListing: ({ namespace, name }: { namespace: string; name: string }) =>
      `/apis/argoproj.io/v1alpha1/namespaces/${namespace}/appprojects/${name}`,
  },
};

jest.mock("../../k8s/argocd", () => ({
  ArgoAppProject: {
    crd: {
      plural: "appprojects",
      title: "Argo AppProjects",
    },
  },
  getArgoAppProjectStore: () => mockStore,
}));

describe("ArgoAppProjectsTabContent", () => {
  it("links appproject name to appproject details", () => {
    render(
      <MemoryRouter>
        <ArgoAppProjectsTabContent />
      </MemoryRouter>,
    );

    const nameLink = screen.getByRole("link", { name: "default" });

    expect(nameLink).toHaveAttribute("href", "/apis/argoproj.io/v1alpha1/namespaces/argocd/appprojects/default");
  });

  it("renders description fallback", () => {
    render(
      <MemoryRouter>
        <ArgoAppProjectsTabContent />
      </MemoryRouter>,
    );

    expect(screen.getByText("Default project")).toBeInTheDocument();
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });
});
