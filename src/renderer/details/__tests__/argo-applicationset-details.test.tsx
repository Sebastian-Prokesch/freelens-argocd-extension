import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ArgoApplicationSetDetails } from "../argo-applicationset-details";

const extension = { name: "argocd-test-extension" } as any;

const formatUrlForNotListing = ({ namespace, name }: { namespace: string; name: string }) =>
  `/apis/argoproj.io/v1alpha1/namespaces/${namespace}/applications/${name}`;

jest.mock("../../k8s/argocd", () => ({
  getArgoApplicationStore: () => ({
    api: {
      formatUrlForNotListing,
    },
  }),
}));

describe("ArgoApplicationSetDetails", () => {
  it("renders generated applications as links", () => {
    render(
      <MemoryRouter>
        <ArgoApplicationSetDetails
          extension={extension}
          object={
            {
              getNs: () => "argocd",
              spec: {},
              status: {
                resources: [{ name: "guestbook" }],
                applicationStatus: [{ application: "guestbook" }, { application: "payments" }],
                conditions: [],
              },
            } as any
          }
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "guestbook" })).toHaveAttribute(
      "href",
      "/apis/argoproj.io/v1alpha1/namespaces/argocd/applications/guestbook",
    );
    expect(screen.getByRole("link", { name: "payments" })).toHaveAttribute(
      "href",
      "/apis/argoproj.io/v1alpha1/namespaces/argocd/applications/payments",
    );
    expect(screen.getByText("Sync Status")).toBeInTheDocument();
    expect(screen.getByText("Health Status")).toBeInTheDocument();
  });

  it("uses generated application namespace in links", () => {
    render(
      <MemoryRouter>
        <ArgoApplicationSetDetails
          extension={extension}
          object={
            {
              getNs: () => "argocd",
              spec: {},
              status: {
                resources: [{ name: "guestbook", namespace: "team-a" }],
                applicationStatus: [{ application: "team-b/payments" }],
                conditions: [],
              },
            } as any
          }
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "guestbook" })).toHaveAttribute(
      "href",
      "/apis/argoproj.io/v1alpha1/namespaces/team-a/applications/guestbook",
    );
    expect(screen.getByRole("link", { name: "payments" })).toHaveAttribute(
      "href",
      "/apis/argoproj.io/v1alpha1/namespaces/team-b/applications/payments",
    );
  });

  it("derives up-to-date from specific condition types and hides error row when false", () => {
    render(
      <MemoryRouter>
        <ArgoApplicationSetDetails
          extension={extension}
          object={
            {
              getNs: () => "argocd",
              spec: {},
              status: {
                resources: [{ name: "guestbook" }],
                conditions: [
                  { type: "ErrorOccurred", status: "False" },
                  { type: "ParametersGenerated", status: "True" },
                  { type: "ResourcesUpToDate", status: "True" },
                ],
              },
            } as any
          }
        />
      </MemoryRouter>,
    );

    const badgeValues = screen.getAllByTestId("BadgeBoolean").map((node) => node.textContent);
    expect(badgeValues).toEqual(expect.arrayContaining(["true"]));
    expect(screen.queryByText("Error Occurred")).not.toBeInTheDocument();
  });

  it("renders error message when ErrorOccurred is true", () => {
    render(
      <MemoryRouter>
        <ArgoApplicationSetDetails
          extension={extension}
          object={
            {
              getNs: () => "argocd",
              spec: {},
              status: {
                resources: [],
                conditions: [
                  {
                    type: "ErrorOccurred",
                    status: "True",
                    reason: "RenderTemplateParamsError",
                    message: "failed to execute go template for generator item #2",
                  },
                  { type: "ResourcesUpToDate", status: "False" },
                ],
              },
            } as any
          }
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Error Occurred")).toBeInTheDocument();
    expect(screen.getByText("Error Message")).toBeInTheDocument();
    expect(screen.getAllByText("failed to execute go template for generator item #2").length).toBeGreaterThan(0);
  });

  it("renders detailed conditions table entries", () => {
    render(
      <MemoryRouter>
        <ArgoApplicationSetDetails
          extension={extension}
          object={
            {
              getNs: () => "argocd",
              spec: {
                generators: [{ list: {} }],
              },
              status: {
                conditions: [{ type: "ResourcesUpToDate", status: "True", reason: "AllHealthy", message: "ok" }],
              },
            } as any
          }
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Generator Types")).toBeInTheDocument();
    expect(screen.getByText("list (1)")).toBeInTheDocument();
    expect(screen.getByText("ResourcesUpToDate")).toBeInTheDocument();
    expect(screen.getByText("AllHealthy")).toBeInTheDocument();
    expect(screen.getByText("ok")).toBeInTheDocument();
  });
});
