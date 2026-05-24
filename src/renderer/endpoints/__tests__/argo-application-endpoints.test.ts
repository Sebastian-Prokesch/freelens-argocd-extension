import {
  buildApplicationSyncMergePatch,
  buildApplicationTerminateJsonPatch,
  syncApplication,
  terminateApplicationOperation,
} from "../argo-application-endpoints";

describe("argo-application-endpoints", () => {
  it("buildApplicationSyncMergePatch returns sync operation payload", () => {
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

  it("buildApplicationTerminateJsonPatch returns remove operation patch", () => {
    expect(buildApplicationTerminateJsonPatch()).toEqual([{ op: "remove", path: "/operation" }]);
  });

  it("syncApplication patches application using merge strategy", async () => {
    const patch = jest.fn().mockResolvedValueOnce(undefined);
    const store = { patch } as any;
    const application = { getName: () => "demo-app" } as any;

    await syncApplication(store, application);

    expect(patch).toHaveBeenCalledWith(application, buildApplicationSyncMergePatch(), "merge");
  });

  it("terminateApplicationOperation patches application using json strategy", async () => {
    const patch = jest.fn().mockResolvedValueOnce(undefined);
    const store = { patch } as any;
    const application = { getName: () => "demo-app" } as any;

    await terminateApplicationOperation(store, application);

    expect(patch).toHaveBeenCalledWith(application, buildApplicationTerminateJsonPatch(), "json");
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
});
