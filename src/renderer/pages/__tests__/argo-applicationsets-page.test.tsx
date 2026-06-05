import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ArgoApplicationSetsTabContent } from "../argo-applicationsets-page";

const mockItems = [
  {
    getName: () => "demo-appset",
    getNs: () => "argocd",
    getCreationTimestamp: () => "2025-01-01T00:00:00.000Z",
    getSearchFields: () => ["demo-appset", "argocd"],
    status: {
      resources: [{ name: "guestbook" }, { name: "payments" }],
      conditions: [
        { type: "ResourcesUpToDate", status: "True" },
        { type: "ErrorOccurred", status: "False" },
      ],
    },
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
  getGeneratedApplicationCount: (object: any) => (object?.status?.resources ?? []).length,
  getApplicationSetResourcesUpToDate: (object: any) => {
    const condition = (object?.status?.conditions ?? []).find((item: any) => item?.type === "ResourcesUpToDate");
    if (!condition) {
      return undefined;
    }

    if (condition.status === "True") {
      return true;
    }

    if (condition.status === "False") {
      return false;
    }

    return undefined;
  },
  getApplicationSetHasError: (object: any) => {
    const condition = (object?.status?.conditions ?? []).find((item: any) => item?.type === "ErrorOccurred");
    if (!condition) {
      return undefined;
    }

    if (condition.status === "True") {
      return true;
    }

    if (condition.status === "False") {
      return false;
    }

    return undefined;
  },
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

  it("renders applicationset signal columns", () => {
    render(
      <MemoryRouter>
        <ArgoApplicationSetsTabContent />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "argocd" })).toHaveAttribute("href", "/api/v1/namespaces/argocd");
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("renders fallback values for missing applicationset status signals", () => {
    const item = mockItems[0] as any;
    const originalStatus = item.status;
    item.status = {};

    render(
      <MemoryRouter>
        <ArgoApplicationSetsTabContent />
      </MemoryRouter>,
    );

    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getAllByText("N/A").length).toBeGreaterThanOrEqual(2);
    item.status = originalStatus;
  });
});
