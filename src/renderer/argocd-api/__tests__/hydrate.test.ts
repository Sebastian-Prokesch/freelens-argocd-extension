import { createKubeLikeObject, normalizeArgoCdApiItem } from "../hydrate";

class FakeApplication {
  metadata?: { name?: string; namespace?: string; selfLink?: string; uid?: string };
  spec?: unknown;
}

describe("argocd-api hydrate", () => {
  it("normalizes API items and synthesizes selfLink/uid for Freelens KubeObject", () => {
    expect(
      normalizeArgoCdApiItem(
        {
          name: "demo",
          metadata: { namespace: "argocd" },
          spec: { project: "default" },
        },
        "Application",
      ),
    ).toEqual({
      apiVersion: "argoproj.io/v1alpha1",
      kind: "Application",
      name: "demo",
      metadata: {
        namespace: "argocd",
        name: "demo",
        selfLink: "/apis/argoproj.io/v1alpha1/namespaces/argocd/applications/demo",
        uid: "argocd-api:Application:argocd:demo",
        resourceVersion: "0",
      },
      spec: { project: "default" },
    });
  });

  it("defaults missing namespace to argocd for AppProjects", () => {
    const normalized = normalizeArgoCdApiItem(
      {
        metadata: { name: "default" },
        spec: { description: "Default project" },
      },
      "AppProject",
    );

    expect(normalized.metadata).toEqual(
      expect.objectContaining({
        name: "default",
        namespace: "argocd",
        selfLink: "/apis/argoproj.io/v1alpha1/namespaces/argocd/appprojects/default",
      }),
    );
  });

  it("adds kube-like helpers when the constructor does not provide them", () => {
    const normalized = normalizeArgoCdApiItem(
      {
        metadata: { name: "demo", namespace: "argocd", creationTimestamp: "2026-01-01T00:00:00Z" },
        spec: { project: "default" },
      },
      "Application",
    );
    const object = createKubeLikeObject(FakeApplication, normalized) as FakeApplication & {
      getName: () => string;
      getNs: () => string;
      getCreationTimestamp: () => string;
      getSearchFields: () => string[];
      getId: () => string;
      selfLink: string;
    };

    expect(object.getName()).toBe("demo");
    expect(object.getNs()).toBe("argocd");
    expect(object.getCreationTimestamp()).toBe("2026-01-01T00:00:00Z");
    expect(object.getSearchFields()).toEqual(["demo", "argocd"]);
    expect(object.getId()).toBe("argocd-api:Application:argocd:demo");
    expect(object.selfLink).toBe("/apis/argoproj.io/v1alpha1/namespaces/argocd/applications/demo");
    expect(object.spec).toEqual({ project: "default" });
  });
});
