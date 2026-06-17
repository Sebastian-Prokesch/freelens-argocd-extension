import {
  ARGO_APPLICATION_REFRESH_ANNOTATION,
  buildApplicationRefreshMergePatch,
  buildApplicationSyncMergePatch,
  buildApplicationTerminateJsonPatch,
  hardRefreshApplication,
  refreshApplication,
  requestApplicationRefresh,
  syncApplication,
  terminateApplicationOperation,
} from "../argo-application-endpoints";

describe("argo-application-endpoints", () => {
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
});
