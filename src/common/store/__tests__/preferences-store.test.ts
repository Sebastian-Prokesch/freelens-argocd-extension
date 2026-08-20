import { ArgoPreferencesStore } from "../preferences-store";

describe("ArgoPreferencesStore", () => {
  it("defaults to cluster mode with an empty connection list", () => {
    const store = new ArgoPreferencesStore();

    expect(store.toJSON()).toEqual({
      connectionMode: "cluster",
      apiConnections: [],
      activeApiConnectionId: "",
      apiServerUrl: "",
      apiToken: "",
      insecureSkipTlsVerify: false,
      customCaPem: "",
    });
  });

  it("migrates legacy single-connection settings into apiConnections", () => {
    const store = new ArgoPreferencesStore();
    store.fromStore({
      connectionMode: "api",
      apiServerUrl: "https://argocd.example.com",
      apiToken: "secret",
      insecureSkipTlsVerify: true,
      customCaPem: "-----BEGIN CERTIFICATE-----\nABC\n-----END CERTIFICATE-----",
    });

    expect(store.connectionMode).toBe("api");
    expect(store.apiConnections).toHaveLength(1);
    const migrated = store.apiConnections[0];
    expect(migrated).toMatchObject({
      name: "Default",
      apiServerUrl: "https://argocd.example.com",
      apiToken: "secret",
      insecureSkipTlsVerify: true,
      httpsProxy: "",
    });
    expect(store.activeApiConnectionId).toBe(migrated?.id);
    expect(store.getActiveApiConnection()?.apiServerUrl).toBe("https://argocd.example.com");
    expect(store.toJSON().apiServerUrl).toBe("https://argocd.example.com");
    expect(store.toJSON().apiConnections).toHaveLength(1);
  });

  it("loads multiple connections and selects by click semantics", () => {
    const store = new ArgoPreferencesStore();
    store.fromStore({
      connectionMode: "api",
      activeApiConnectionId: "staging",
      apiConnections: [
        {
          id: "prod",
          name: "prod",
          apiServerUrl: "https://argocd.prod.example.com",
          apiToken: "prod-token",
          insecureSkipTlsVerify: false,
          customCaPem: "",
          httpsProxy: "http://proxy.example.com:8080",
        },
        {
          id: "staging",
          name: "staging",
          apiServerUrl: "https://argocd.staging.example.com",
          apiToken: "staging-token",
          insecureSkipTlsVerify: false,
          customCaPem: "",
          httpsProxy: "",
        },
      ],
    });

    expect(store.apiConnections).toHaveLength(2);
    expect(store.activeApiConnectionId).toBe("staging");
    expect(store.getActiveApiConnection()?.name).toBe("staging");

    store.selectApiConnection("prod");
    expect(store.getActiveApiConnection()?.name).toBe("prod");
    expect(store.getActiveApiConnection()?.httpsProxy).toBe("http://proxy.example.com:8080");
    expect(store.toJSON().apiServerUrl).toBe("https://argocd.prod.example.com");
    expect(store.toJSON().apiToken).toBe("prod-token");

    store.removeApiConnection("prod");
    expect(store.apiConnections).toHaveLength(1);
    expect(store.activeApiConnectionId).toBe("staging");
  });

  it("parses apiConnections when persisted as a JSON string", () => {
    const store = new ArgoPreferencesStore();
    store.fromStore({
      connectionMode: "api",
      activeApiConnectionId: "c1",
      apiConnections: JSON.stringify([
        {
          id: "c1",
          name: "prod",
          apiServerUrl: "https://argocd.example.com",
          apiToken: "token",
          insecureSkipTlsVerify: false,
          customCaPem: "",
          httpsProxy: "",
        },
      ]) as any,
    });

    expect(store.apiConnections).toHaveLength(1);
    expect(store.getActiveApiConnection()?.name).toBe("prod");
  });

  it("ignores legacy enabled field and invalid connection modes", () => {
    const store = new ArgoPreferencesStore();
    store.fromStore({ enabled: true } as any);

    expect(store.connectionMode).toBe("cluster");
  });
});
