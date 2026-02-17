import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ArgoApplicationsTabContent } from "../argo-applications-page";

const mockItems = [
  {
    getName: () => "demo-app",
    getNs: () => "argocd",
    getCreationTimestamp: () => "2025-01-01T00:00:00.000Z",
    getSearchFields: () => ["demo-app", "argocd"],
    spec: { project: "default" },
    status: { sync: { status: "Synced" }, health: { status: "Healthy" } },
  },
];

const mockStore = {
  items: mockItems,
  api: {
    formatUrlForNotListing: ({ namespace, name }: { namespace: string; name: string }) =>
      `/apis/argoproj.io/v1alpha1/namespaces/${namespace}/applications/${name}`,
  },
};

jest.mock("../../k8s/argocd", () => ({
  ArgoApplication: {
    crd: {
      plural: "applications",
      title: "Argo Applications",
    },
  },
  getArgoApplicationStore: () => mockStore,
}));

describe("ArgoApplicationsTabContent", () => {
  it("links application name to application details", () => {
    render(
      <MemoryRouter>
        <ArgoApplicationsTabContent />
      </MemoryRouter>,
    );

    const nameLink = screen.getByRole("link", { name: "demo-app" });

    expect(nameLink).toHaveAttribute("href", "/apis/argoproj.io/v1alpha1/namespaces/argocd/applications/demo-app");
  });

  it("links namespace to namespace details", () => {
    render(
      <MemoryRouter>
        <ArgoApplicationsTabContent />
      </MemoryRouter>,
    );

    const namespaceLink = screen.getByRole("link", { name: "argocd" });

    expect(namespaceLink).toHaveAttribute("href", "/api/v1/namespaces/argocd");
  });
});
