import {
  abortRollout,
  buildRolloutAbortMergePatch,
  buildRolloutRetryMergePatch,
  retryRollout,
} from "../argo-rollout-endpoints";

describe("argo-rollout-endpoints", () => {
  it("buildRolloutAbortMergePatch returns abort payload", () => {
    expect(buildRolloutAbortMergePatch()).toEqual({
      status: {
        abort: true,
      },
    });
  });

  it("buildRolloutRetryMergePatch returns retry payload", () => {
    expect(buildRolloutRetryMergePatch()).toEqual({
      status: {
        abort: false,
      },
    });
  });

  it("abortRollout patches rollout with merge strategy", async () => {
    const patch = jest.fn().mockResolvedValueOnce(undefined);
    const store = { patch } as any;
    const rollout = { getName: () => "demo-rollout" } as any;

    await abortRollout(store, rollout);

    expect(patch).toHaveBeenCalledWith(rollout, buildRolloutAbortMergePatch(), "merge");
  });

  it("retryRollout patches rollout with merge strategy", async () => {
    const patch = jest.fn().mockResolvedValueOnce(undefined);
    const store = { patch } as any;
    const rollout = { getName: () => "demo-rollout" } as any;

    await retryRollout(store, rollout);

    expect(patch).toHaveBeenCalledWith(rollout, buildRolloutRetryMergePatch(), "merge");
  });

  it("abortRollout propagates patch errors", async () => {
    const error = new Error("boom");
    const store = { patch: jest.fn().mockRejectedValueOnce(error) } as any;
    const rollout = { getName: () => "demo-rollout" } as any;

    await expect(abortRollout(store, rollout)).rejects.toThrow("boom");
  });

  it("retryRollout propagates patch errors", async () => {
    const error = new Error("boom");
    const store = { patch: jest.fn().mockRejectedValueOnce(error) } as any;
    const rollout = { getName: () => "demo-rollout" } as any;

    await expect(retryRollout(store, rollout)).rejects.toThrow("boom");
  });
});
