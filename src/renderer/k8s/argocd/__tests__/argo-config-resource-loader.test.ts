import {
  ARGOCD_CONFIGMAP_LABEL_SELECTOR,
  ARGOCD_NOTIFICATIONS_SECRET_FIELD_SELECTOR,
  ARGOCD_TYPED_SECRET_LABEL_SELECTOR,
  getNamespacesForArgoConfigQuery,
  loadArgoConfigMaps,
  loadArgoConfigSecrets,
} from "../argo-config-resource-loader";

describe("argo-config-resource-loader", () => {
  it("getNamespacesForArgoConfigQuery prefers context namespaces", () => {
    const store = {
      contextNamespaces: ["a", "b"],
      items: [{ getName: () => "ignored" }],
    };

    expect(getNamespacesForArgoConfigQuery(store)).toEqual(["a", "b"]);
  });

  it("getNamespacesForArgoConfigQuery falls back to all namespace items", () => {
    const store = {
      contextNamespaces: [],
      items: [{ getName: () => "ns-one" }, { getName: () => "ns-two" }],
    };

    expect(getNamespacesForArgoConfigQuery(store)).toEqual(["ns-one", "ns-two"]);
  });

  it("loadArgoConfigSecrets requests typed and notifications lists per namespace", async () => {
    const list = jest.fn(async ({ namespace }: { namespace: string }, query?: Record<string, string>) => {
      if (namespace === "one" && query?.labelSelector === ARGOCD_TYPED_SECRET_LABEL_SELECTOR) {
        return [{ getNs: () => "one", getName: () => "r1", getId: () => "uid-r1" }];
      }

      if (namespace === "one" && query?.fieldSelector === ARGOCD_NOTIFICATIONS_SECRET_FIELD_SELECTOR) {
        return [{ getNs: () => "one", getName: () => "argocd-notifications-secret", getId: () => "uid-n1" }];
      }

      if (namespace === "two" && query?.labelSelector === ARGOCD_TYPED_SECRET_LABEL_SELECTOR) {
        return [{ getNs: () => "two", getName: () => "r2", getId: () => "uid-r2" }];
      }

      if (namespace === "two" && query?.fieldSelector === ARGOCD_NOTIFICATIONS_SECRET_FIELD_SELECTOR) {
        return [];
      }

      return [];
    });

    const secrets = await loadArgoConfigSecrets(["one", "two"], { list });

    expect(list).toHaveBeenCalledTimes(4);
    expect(secrets).toHaveLength(3);
    expect(list.mock.calls.filter((c) => c[1]?.labelSelector === ARGOCD_TYPED_SECRET_LABEL_SELECTOR)).toHaveLength(2);
    expect(
      list.mock.calls.filter((c) => c[1]?.fieldSelector === ARGOCD_NOTIFICATIONS_SECRET_FIELD_SELECTOR),
    ).toHaveLength(2);
  });

  it("loadArgoConfigMaps requests part-of label per namespace", async () => {
    const list = jest.fn(async ({ namespace }: { namespace: string }, query?: Record<string, string>) => {
      expect(query?.labelSelector).toBe(ARGOCD_CONFIGMAP_LABEL_SELECTOR);
      return [{ getNs: () => namespace, getName: () => `cm-${namespace}`, getId: () => `id-${namespace}` }];
    });

    const maps = await loadArgoConfigMaps(["a", "b"], { list });

    expect(list).toHaveBeenCalledTimes(2);
    expect(maps).toHaveLength(2);
  });

  it("dedupes duplicate objects returned from overlapping queries", async () => {
    const same = { getNs: () => "ns", getName: () => "dup", getId: () => "same-uid" };
    const list = jest.fn(async (_opts: { namespace: string }, query?: Record<string, string>) => {
      if (query?.labelSelector) {
        return [same];
      }

      return [same];
    });

    const secrets = await loadArgoConfigSecrets(["ns"], { list });
    expect(secrets).toHaveLength(1);
  });
});
