import { filterEventsForResource, matchesResourceEvent } from "../resource-events-section";

describe("ResourceEventsSection filtering", () => {
  const baseEvent = {
    involvedObject: {
      uid: "abc-123",
      name: "demo-app",
      namespace: "argocd",
      kind: "Application",
      apiVersion: "argoproj.io/v1alpha1",
    },
  } as any;

  it("prefers UID-based matching when uid exists", () => {
    expect(matchesResourceEvent({ uid: "abc-123" }, baseEvent)).toBe(true);
    expect(matchesResourceEvent({ uid: "different", name: "demo-app" }, baseEvent)).toBe(false);
  });

  it("falls back to name/namespace/kind/apiVersion matching when uid is absent", () => {
    expect(
      matchesResourceEvent(
        {
          name: "demo-app",
          namespace: "argocd",
          kind: "Application",
          apiVersion: "argoproj.io/v1alpha1",
        },
        baseEvent,
      ),
    ).toBe(true);
    expect(matchesResourceEvent({ name: "other-app", namespace: "argocd" }, baseEvent)).toBe(false);
  });

  it("filters events by the provided resource reference", () => {
    const events = [
      baseEvent,
      {
        involvedObject: {
          uid: "xyz-999",
          name: "other",
          namespace: "argocd",
          kind: "Application",
          apiVersion: "argoproj.io/v1alpha1",
        },
      },
    ] as any[];

    const result = filterEventsForResource({ uid: "abc-123" }, events);
    expect(result).toHaveLength(1);
    expect(result[0]?.involvedObject?.name).toBe("demo-app");
  });
});
