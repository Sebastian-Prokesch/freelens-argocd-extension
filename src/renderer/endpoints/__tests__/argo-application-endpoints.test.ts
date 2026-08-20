import {
  ARGO_APPLICATION_REFRESH_ANNOTATION,
  buildApplicationDisableAutomatedJsonPatch,
  buildApplicationEnableAutomatedMergePatch,
  buildApplicationRefreshMergePatch,
  buildApplicationRollbackMergePatch,
  buildApplicationSpecWithAutomatedSync,
  buildApplicationSyncMergePatch,
  buildApplicationTerminateJsonPatch,
  getApplicationAutomatedSyncPolicy,
  hardRefreshApplication,
  hasRollbackSourceMetadata,
  refreshApplication,
  requestApplicationRefresh,
  rollbackApplication,
  setApplicationAutomatedSync,
  syncApplication,
  terminateApplicationOperation,
} from "../argo-application-endpoints";
import { getArgoCdApiClient, isArgoCdApiMode } from "../../argocd-api";

jest.mock("../../argocd-api", () => ({
  isArgoCdApiMode: jest.fn(() => false),
  getArgoCdApiClient: jest.fn(),
}));

const isArgoCdApiModeMock = isArgoCdApiMode as jest.MockedFunction<typeof isArgoCdApiMode>;
const getArgoCdApiClientMock = getArgoCdApiClient as jest.MockedFunction<typeof getArgoCdApiClient>;

describe("argo-application-endpoints", () => {
  beforeEach(() => {
    isArgoCdApiModeMock.mockReturnValue(false);
    getArgoCdApiClientMock.mockReset();
  });
  it("buildApplicationSyncMergePatch returns default sync operation payload", () => {
    expect(buildApplicationSyncMergePatch()).toEqual({
      operation: {
        initiatedBy: {
          username: "LensApp",
        },
        sync: {
          syncStrategy: {
            hook: {},
          },
        },
      },
    });
  });

  it("buildApplicationSyncMergePatch maps advanced sync options", () => {
    expect(
      buildApplicationSyncMergePatch({
        prune: true,
        dryRun: true,
        force: true,
        syncStrategy: "apply",
        revision: "abc123",
        syncOptions: ["CreateNamespace=true", "Validate=false"],
      }),
    ).toEqual({
      operation: {
        initiatedBy: {
          username: "LensApp",
        },
        sync: {
          prune: true,
          dryRun: true,
          revision: "abc123",
          syncOptions: ["CreateNamespace=true", "Validate=false"],
          syncStrategy: {
            apply: {
              force: true,
            },
          },
        },
      },
    });
  });

  it("buildApplicationSyncMergePatch omits empty revision and syncOptions", () => {
    expect(
      buildApplicationSyncMergePatch({
        revision: "   ",
        syncOptions: [],
      }).operation,
    ).toEqual({
      initiatedBy: {
        username: "LensApp",
      },
      sync: {
        syncStrategy: {
          hook: {},
        },
      },
    });
  });

  it("buildApplicationTerminateJsonPatch returns remove operation patch", () => {
    expect(buildApplicationTerminateJsonPatch()).toEqual([{ op: "remove", path: "/operation" }]);
  });

  it("buildApplicationRefreshMergePatch returns normal refresh annotation payload", () => {
    expect(buildApplicationRefreshMergePatch("normal")).toEqual({
      metadata: {
        annotations: {
          [ARGO_APPLICATION_REFRESH_ANNOTATION]: "normal",
        },
      },
    });
  });

  it("buildApplicationRefreshMergePatch returns hard refresh annotation payload", () => {
    expect(buildApplicationRefreshMergePatch("hard")).toEqual({
      metadata: {
        annotations: {
          [ARGO_APPLICATION_REFRESH_ANNOTATION]: "hard",
        },
      },
    });
  });

  it("syncApplication patches application using merge strategy", async () => {
    const patch = jest.fn().mockResolvedValueOnce(undefined);
    const store = { patch } as any;
    const application = { getName: () => "demo-app" } as any;

    await syncApplication(store, application);

    expect(patch).toHaveBeenCalledWith(application, buildApplicationSyncMergePatch(), "merge");
  });

  it("syncApplication passes selected options to patch payload", async () => {
    const patch = jest.fn().mockResolvedValueOnce(undefined);
    const store = { patch } as any;
    const application = { getName: () => "demo-app" } as any;
    const options = {
      prune: true,
      syncStrategy: "apply" as const,
      syncOptions: ["PruneLast=true"],
    };

    await syncApplication(store, application, options);

    expect(patch).toHaveBeenCalledWith(application, buildApplicationSyncMergePatch(options), "merge");
  });

  it("terminateApplicationOperation patches application using json strategy", async () => {
    const patch = jest.fn().mockResolvedValueOnce(undefined);
    const store = { patch } as any;
    const application = { getName: () => "demo-app" } as any;

    await terminateApplicationOperation(store, application);

    expect(patch).toHaveBeenCalledWith(application, buildApplicationTerminateJsonPatch(), "json");
  });

  it("requestApplicationRefresh patches application using merge strategy for chosen mode", async () => {
    const patch = jest.fn().mockResolvedValueOnce(undefined);
    const store = { patch } as any;
    const application = { getName: () => "demo-app" } as any;

    await requestApplicationRefresh(store, application, "normal");

    expect(patch).toHaveBeenCalledWith(application, buildApplicationRefreshMergePatch("normal"), "merge");
  });

  it("refreshApplication patches with normal refresh annotation", async () => {
    const patch = jest.fn().mockResolvedValueOnce(undefined);
    const store = { patch } as any;
    const application = { getName: () => "demo-app" } as any;

    await refreshApplication(store, application);

    expect(patch).toHaveBeenCalledWith(application, buildApplicationRefreshMergePatch("normal"), "merge");
  });

  it("hardRefreshApplication patches with hard refresh annotation", async () => {
    const patch = jest.fn().mockResolvedValueOnce(undefined);
    const store = { patch } as any;
    const application = { getName: () => "demo-app" } as any;

    await hardRefreshApplication(store, application);

    expect(patch).toHaveBeenCalledWith(application, buildApplicationRefreshMergePatch("hard"), "merge");
  });

  it("syncApplication propagates patch errors", async () => {
    const error = new Error("boom");
    const store = { patch: jest.fn().mockRejectedValueOnce(error) } as any;
    const application = { getName: () => "demo-app" } as any;

    await expect(syncApplication(store, application)).rejects.toThrow("boom");
  });

  it("terminateApplicationOperation propagates patch errors", async () => {
    const error = new Error("boom");
    const store = { patch: jest.fn().mockRejectedValueOnce(error) } as any;
    const application = { getName: () => "demo-app" } as any;

    await expect(terminateApplicationOperation(store, application)).rejects.toThrow("boom");
  });

  it("requestApplicationRefresh propagates patch errors", async () => {
    const error = new Error("boom");
    const store = { patch: jest.fn().mockRejectedValueOnce(error) } as any;
    const application = { getName: () => "demo-app" } as any;

    await expect(requestApplicationRefresh(store, application, "hard")).rejects.toThrow("boom");
  });

  it("hasRollbackSourceMetadata returns true when source metadata is present", () => {
    expect(
      hasRollbackSourceMetadata({
        revision: "abc123",
        source: { repoURL: "https://github.com/org/repo.git" },
      }),
    ).toBe(true);
    expect(
      hasRollbackSourceMetadata({
        revisions: ["abc123", "def456"],
        sources: [{ repoURL: "https://github.com/org/repo.git" }, { repoURL: "https://github.com/org/other.git" }],
      }),
    ).toBe(true);
  });

  it("hasRollbackSourceMetadata returns false for legacy entries without source metadata", () => {
    expect(hasRollbackSourceMetadata({ revision: "abc123" })).toBe(false);
    expect(hasRollbackSourceMetadata({ revision: "abc123", source: {} })).toBe(false);
    expect(hasRollbackSourceMetadata({ revision: "abc123", sources: [] })).toBe(false);
  });

  it("buildApplicationRollbackMergePatch maps single-source history entry", () => {
    expect(
      buildApplicationRollbackMergePatch({
        id: 3,
        revision: "abc123",
        source: { repoURL: "https://github.com/org/repo.git", path: "apps/demo" },
      }),
    ).toEqual({
      operation: {
        initiatedBy: {
          username: "LensApp",
        },
        sync: {
          revision: "abc123",
          source: { repoURL: "https://github.com/org/repo.git", path: "apps/demo" },
          syncStrategy: {
            apply: {},
          },
        },
      },
    });
  });

  it("buildApplicationRollbackMergePatch maps multi-source history entry", () => {
    expect(
      buildApplicationRollbackMergePatch({
        id: 4,
        revisions: ["abc123", "def456"],
        sources: [{ repoURL: "https://github.com/org/repo.git" }, { repoURL: "https://github.com/org/other.git" }],
      }),
    ).toEqual({
      operation: {
        initiatedBy: {
          username: "LensApp",
        },
        sync: {
          revisions: ["abc123", "def456"],
          sources: [{ repoURL: "https://github.com/org/repo.git" }, { repoURL: "https://github.com/org/other.git" }],
          syncStrategy: {
            apply: {},
          },
        },
      },
    });
  });

  it("buildApplicationRollbackMergePatch propagates syncOptions", () => {
    expect(
      buildApplicationRollbackMergePatch(
        {
          revision: "abc123",
          source: { repoURL: "https://github.com/org/repo.git" },
        },
        ["CreateNamespace=true", "PruneLast=true"],
      ),
    ).toEqual({
      operation: {
        initiatedBy: {
          username: "LensApp",
        },
        sync: {
          revision: "abc123",
          source: { repoURL: "https://github.com/org/repo.git" },
          syncOptions: ["CreateNamespace=true", "PruneLast=true"],
          syncStrategy: {
            apply: {},
          },
        },
      },
    });
  });

  it("rollbackApplication patches application using merge strategy", async () => {
    const patch = jest.fn().mockResolvedValueOnce(undefined);
    const store = { patch } as any;
    const application = {
      getName: () => "demo-app",
      spec: {
        syncPolicy: {
          syncOptions: ["Validate=false"],
        },
      },
    } as any;
    const entry = {
      id: 2,
      revision: "abc123",
      source: { repoURL: "https://github.com/org/repo.git" },
    };

    await rollbackApplication(store, application, entry);

    expect(patch).toHaveBeenCalledWith(
      application,
      buildApplicationRollbackMergePatch(entry, ["Validate=false"]),
      "merge",
    );
  });

  it("rollbackApplication propagates patch errors", async () => {
    const error = new Error("boom");
    const store = { patch: jest.fn().mockRejectedValueOnce(error) } as any;
    const application = { getName: () => "demo-app", spec: {} } as any;

    await expect(
      rollbackApplication(store, application, {
        revision: "abc123",
        source: { repoURL: "https://github.com/org/repo.git" },
      }),
    ).rejects.toThrow("boom");
  });

  it("routes application mutations through Argo CD API when API mode is enabled", async () => {
    const syncApplicationApi = jest.fn().mockResolvedValue(undefined);
    const refreshApplicationApi = jest.fn().mockResolvedValue(undefined);
    const terminateApplicationOperationApi = jest.fn().mockResolvedValue(undefined);
    const rollbackApplicationApi = jest.fn().mockResolvedValue(undefined);
    const updateApplicationSpecApi = jest.fn().mockResolvedValue({ metadata: { name: "demo-app" } });
    const patch = jest.fn();

    isArgoCdApiModeMock.mockReturnValue(true);
    getArgoCdApiClientMock.mockReturnValue({
      syncApplication: syncApplicationApi,
      refreshApplication: refreshApplicationApi,
      terminateApplicationOperation: terminateApplicationOperationApi,
      rollbackApplication: rollbackApplicationApi,
      updateApplicationSpec: updateApplicationSpecApi,
    } as any);

    const store = { patch } as any;
    const application = {
      getName: () => "demo-app",
      getNs: () => "argocd",
      spec: { syncPolicy: { syncOptions: ["Validate=false"] } },
    } as any;
    const entry = {
      id: 2,
      revision: "abc123",
      source: { repoURL: "https://github.com/org/repo.git" },
    };

    await syncApplication(store, application, { prune: true });
    await refreshApplication(store, application);
    await hardRefreshApplication(store, application);
    await terminateApplicationOperation(store, application);
    await rollbackApplication(store, application, entry);
    await setApplicationAutomatedSync(store, application, { prune: true, selfHeal: true });

    expect(syncApplicationApi).toHaveBeenCalledWith(application, { prune: true });
    expect(refreshApplicationApi).toHaveBeenCalledWith(application, "normal");
    expect(refreshApplicationApi).toHaveBeenCalledWith(application, "hard");
    expect(terminateApplicationOperationApi).toHaveBeenCalledWith(application);
    expect(rollbackApplicationApi).toHaveBeenCalledWith(application, entry);
    expect(updateApplicationSpecApi).toHaveBeenCalledWith(
      application,
      buildApplicationSpecWithAutomatedSync(application, { prune: true, selfHeal: true }),
    );
    expect(patch).not.toHaveBeenCalled();
  });

  it("builds and applies automated sync policy patches in cluster mode", async () => {
    const application = {
      getName: () => "demo-app",
      spec: {
        project: "default",
        syncPolicy: {
          syncOptions: ["CreateNamespace=true"],
          automated: { prune: true },
        },
      },
    } as any;

    expect(getApplicationAutomatedSyncPolicy(application)).toEqual({
      prune: true,
      selfHeal: false,
      allowEmpty: false,
    });
    expect(buildApplicationEnableAutomatedMergePatch({ prune: true, selfHeal: true })).toEqual({
      spec: {
        syncPolicy: {
          automated: {
            prune: true,
            selfHeal: true,
            allowEmpty: false,
          },
        },
      },
    });
    expect(buildApplicationDisableAutomatedJsonPatch()).toEqual([
      { op: "remove", path: "/spec/syncPolicy/automated" },
    ]);
    expect(buildApplicationSpecWithAutomatedSync(application, null)).toEqual({
      project: "default",
      syncPolicy: {
        syncOptions: ["CreateNamespace=true"],
      },
    });

    const patch = jest.fn().mockResolvedValue(undefined);
    const store = { patch } as any;

    await setApplicationAutomatedSync(store, application, null);
    expect(patch).toHaveBeenCalledWith(application, buildApplicationDisableAutomatedJsonPatch(), "json");

    patch.mockClear();
    await setApplicationAutomatedSync(store, application, { prune: false, selfHeal: true, allowEmpty: true });
    expect(patch).toHaveBeenCalledWith(
      application,
      buildApplicationEnableAutomatedMergePatch({ prune: false, selfHeal: true, allowEmpty: true }),
      "merge",
    );
  });
});
