import { ANALYSIS_PHASE_INCONCLUSIVE } from "../../k8s/rollouts/canary-step";
import {
  abortRollout,
  buildPromotePatches,
  buildRolloutAbortMergePatch,
  buildRolloutRetryMergePatch,
  PROMOTE_ERRORS,
  requestRolloutPromotion,
  retryRollout,
  validatePromoteOptions,
} from "../argo-rollout-endpoints";

const rolloutApiUrl = "/apis/argoproj.io/v1alpha1/namespaces/ns/rollouts/demo";

function mockRollout(partial: Record<string, unknown> = {}) {
  return {
    getNs: () => "ns",
    getName: () => "demo",
    ...partial,
  } as any;
}

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

  it("abortRollout patches rollout /status with merge patch content type", async () => {
    const requestPatch = jest.fn().mockResolvedValue({});
    const patch = jest.fn().mockResolvedValueOnce(undefined);
    const store = {
      patch,
      api: {
        formatUrlForNotListing: () => rolloutApiUrl,
        request: { patch: requestPatch },
      },
    } as any;
    const rollout = mockRollout();

    await abortRollout(store, rollout);

    expect(requestPatch).toHaveBeenCalledWith(
      `${rolloutApiUrl}/status`,
      { data: buildRolloutAbortMergePatch() },
      expect.objectContaining({
        headers: { "content-type": "application/merge-patch+json" },
      }),
    );
    expect(patch).not.toHaveBeenCalled();
  });

  it("retryRollout patches rollout /status with merge patch content type", async () => {
    const requestPatch = jest.fn().mockResolvedValue({});
    const patch = jest.fn().mockResolvedValueOnce(undefined);
    const store = {
      patch,
      api: {
        formatUrlForNotListing: () => rolloutApiUrl,
        request: { patch: requestPatch },
      },
    } as any;
    const rollout = mockRollout();

    await retryRollout(store, rollout);

    expect(requestPatch).toHaveBeenCalledWith(
      `${rolloutApiUrl}/status`,
      { data: buildRolloutRetryMergePatch() },
      expect.objectContaining({
        headers: { "content-type": "application/merge-patch+json" },
      }),
    );
    expect(patch).not.toHaveBeenCalled();
  });

  it("abortRollout propagates non-404 /status errors", async () => {
    const error = new Error("boom");
    const store = {
      patch: jest.fn(),
      api: {
        formatUrlForNotListing: () => rolloutApiUrl,
        request: { patch: jest.fn().mockRejectedValueOnce(error) },
      },
    } as any;
    const rollout = mockRollout();

    await expect(abortRollout(store, rollout)).rejects.toThrow("boom");
  });

  it("retryRollout propagates non-404 /status errors", async () => {
    const error = new Error("boom");
    const store = {
      patch: jest.fn(),
      api: {
        formatUrlForNotListing: () => rolloutApiUrl,
        request: { patch: jest.fn().mockRejectedValueOnce(error) },
      },
    } as any;
    const rollout = mockRollout();

    await expect(retryRollout(store, rollout)).rejects.toThrow("boom");
  });

  it("abortRollout falls back to store.patch on 404 /status", async () => {
    const patch = jest.fn().mockResolvedValue(undefined);
    const store = {
      patch,
      api: {
        formatUrlForNotListing: () => rolloutApiUrl,
        request: { patch: jest.fn().mockRejectedValueOnce({ code: 404 }) },
      },
    } as any;
    const rollout = mockRollout();

    await abortRollout(store, rollout);

    expect(patch).toHaveBeenCalledWith(rollout, buildRolloutAbortMergePatch(), "merge");
  });

  it("retryRollout falls back to store.patch on missing request.patch", async () => {
    const patch = jest.fn().mockResolvedValue(undefined);
    const store = {
      patch,
      api: {
        formatUrlForNotListing: () => rolloutApiUrl,
      },
    } as any;
    const rollout = mockRollout();

    await retryRollout(store, rollout);

    expect(patch).toHaveBeenCalledWith(rollout, buildRolloutRetryMergePatch(), "merge");
  });
});

describe("validatePromoteOptions", () => {
  const bg = mockRollout({ spec: { strategy: { blueGreen: {} } } });
  const canaryNoSteps = mockRollout({ spec: { strategy: { canary: { steps: [] } } } });
  const canarySteps = mockRollout({ spec: { strategy: { canary: { steps: [{ pause: {} }] } } } });

  it("rejects both skip flags", () => {
    expect(() => validatePromoteOptions(canarySteps, { skipCurrentStep: true, skipAllSteps: true })).toThrow(
      PROMOTE_ERRORS.bothSkipFlags,
    );
  });

  it("rejects skip with BlueGreen", () => {
    expect(() => validatePromoteOptions(bg, { skipCurrentStep: true })).toThrow(PROMOTE_ERRORS.skipWithBlueGreen);
  });

  it("rejects skip without canary steps", () => {
    expect(() => validatePromoteOptions(canaryNoSteps, { skipCurrentStep: true })).toThrow(
      PROMOTE_ERRORS.skipNoCanarySteps,
    );
  });

  it("rejects full combined with skip", () => {
    expect(() => validatePromoteOptions(canarySteps, { full: true, skipCurrentStep: true })).toThrow(
      PROMOTE_ERRORS.fullWithSkipFlags,
    );
  });
});

describe("buildPromotePatches", () => {
  it("skipCurrentStep increments currentStepIndex", () => {
    const ro = mockRollout({
      spec: { strategy: { canary: { steps: [{ pause: {} }, { pause: {} }] } } },
      status: { currentStepIndex: 0 },
    });
    expect(buildPromotePatches(ro, { skipCurrentStep: true })).toEqual({
      specPatch: undefined,
      statusPatch: { status: { currentStepIndex: 1 } },
      unifiedPatch: { status: { currentStepIndex: 1 } },
    });
  });

  it("skipAllSteps sets index to steps length", () => {
    const ro = mockRollout({
      spec: { strategy: { canary: { steps: [{ pause: {} }, { pause: {} }] } } },
      status: {},
    });
    expect(buildPromotePatches(ro, { skipAllSteps: true })).toEqual({
      specPatch: undefined,
      statusPatch: { status: { currentStepIndex: 2 } },
      unifiedPatch: { status: { currentStepIndex: 2 } },
    });
  });

  it("full with spec paused sets specPatch and status promoteFull when hashes differ", () => {
    const ro = mockRollout({
      spec: { paused: true, strategy: { canary: { steps: [] } } },
      status: { currentPodHash: "a", stableRS: "b" },
    });
    expect(buildPromotePatches(ro, { full: true })).toEqual({
      specPatch: { spec: { paused: false } },
      statusPatch: { status: { promoteFull: true } },
      unifiedPatch: { spec: { paused: false }, status: { promoteFull: true } },
    });
  });

  it("full still sets statusPatch promoteFull when stable equals current hash", () => {
    const ro = mockRollout({
      spec: { paused: false, strategy: { canary: { steps: [] } } },
      status: { currentPodHash: "same", stableRS: "same" },
    });
    expect(buildPromotePatches(ro, { full: true })).toEqual({
      specPatch: undefined,
      statusPatch: { status: { promoteFull: true } },
      unifiedPatch: { spec: { paused: false }, status: { promoteFull: true } },
    });
  });

  it("default clears pauseConditions when pauseConditions present", () => {
    const ro = mockRollout({
      spec: { paused: false, strategy: { blueGreen: {} } },
      status: { pauseConditions: [{ reason: "BlueGreenPause" }] },
    });
    expect(buildPromotePatches(ro, {})).toEqual({
      specPatch: undefined,
      statusPatch: { status: { pauseConditions: null } },
      unifiedPatch: { spec: { paused: false }, status: { pauseConditions: null } },
    });
  });

  it("default inconclusive sets controllerPause patch with incremented step", () => {
    const ro = mockRollout({
      spec: { strategy: { canary: { steps: [{ pause: {} }, { pause: {} }] } } },
      status: {
        currentStepIndex: 0,
        pauseConditions: [{ reason: "CanaryPauseStep" }],
        controllerPause: true,
        canary: {
          currentStepAnalysisRunStatus: { status: ANALYSIS_PHASE_INCONCLUSIVE },
        },
      },
    });
    expect(buildPromotePatches(ro, {})).toEqual({
      specPatch: undefined,
      statusPatch: {
        status: {
          pauseConditions: null,
          controllerPause: false,
          currentStepIndex: 1,
        },
      },
      unifiedPatch: {
        spec: { paused: false },
        status: {
          pauseConditions: null,
          controllerPause: false,
          currentStepIndex: 1,
        },
      },
    });
  });

  it("default canary without pause increments step and overwrites unifiedPatch", () => {
    const ro = mockRollout({
      spec: { paused: false, strategy: { canary: { steps: [{ pause: {} }, { pause: {} }] } } },
      status: { currentStepIndex: 0, pauseConditions: [] },
    });
    expect(buildPromotePatches(ro, {})).toEqual({
      specPatch: undefined,
      statusPatch: {
        status: { pauseConditions: null, currentStepIndex: 1 },
      },
      unifiedPatch: {
        spec: { paused: false },
        status: { pauseConditions: null, currentStepIndex: 1 },
      },
    });
  });
});

describe("requestRolloutPromotion", () => {
  it("sends merge patch body under JsonApi { data } for /status", async () => {
    const requestPatch = jest.fn().mockResolvedValue({});
    const patch = jest.fn().mockResolvedValue(undefined);
    const store = {
      patch,
      api: {
        formatUrlForNotListing: () => rolloutApiUrl,
        request: { patch: requestPatch },
      },
    };

    const ro = mockRollout({
      spec: { paused: false, strategy: { blueGreen: {} } },
      status: { pauseConditions: [{ reason: "BlueGreenPause" }] },
    });

    await requestRolloutPromotion(store as any, ro, {});

    expect(requestPatch).toHaveBeenCalledWith(
      `${rolloutApiUrl}/status`,
      { data: { status: { pauseConditions: null } } },
      expect.objectContaining({
        headers: { "content-type": "application/merge-patch+json" },
      }),
    );
    expect(patch).not.toHaveBeenCalled();
  });

  it("applies unifiedPatch on main resource when status returns 404", async () => {
    const requestPatch = jest.fn().mockRejectedValue({ code: 404 });
    const patch = jest.fn().mockResolvedValue(undefined);
    const store = {
      patch,
      api: {
        formatUrlForNotListing: () => rolloutApiUrl,
        request: { patch: requestPatch },
      },
    };

    const ro = mockRollout({
      spec: { paused: false, strategy: { blueGreen: {} } },
      status: { pauseConditions: [{ reason: "BlueGreenPause" }] },
    });

    await requestRolloutPromotion(store as any, ro, {});

    expect(patch).toHaveBeenCalledWith(ro, { spec: { paused: false }, status: { pauseConditions: null } }, "merge");
  });

  it("applies inconclusive unifiedPatch on main resource when /status returns 404", async () => {
    const requestPatch = jest.fn().mockRejectedValue({ code: 404 });
    const patch = jest.fn().mockResolvedValue(undefined);
    const store = {
      patch,
      api: {
        formatUrlForNotListing: () => rolloutApiUrl,
        request: { patch: requestPatch },
      },
    };

    const ro = mockRollout({
      spec: { paused: false, strategy: { canary: { steps: [{ pause: {} }, { pause: {} }] } } },
      status: {
        currentStepIndex: 0,
        pauseConditions: [{ reason: "CanaryPauseStep" }],
        controllerPause: true,
        canary: {
          currentStepAnalysisRunStatus: { status: ANALYSIS_PHASE_INCONCLUSIVE },
        },
      },
    });

    await requestRolloutPromotion(store as any, ro, {});

    expect(patch).toHaveBeenCalledWith(
      ro,
      {
        spec: { paused: false },
        status: {
          pauseConditions: null,
          controllerPause: false,
          currentStepIndex: 1,
        },
      },
      "merge",
    );
  });

  it("propagates non-404 errors from status patch", async () => {
    const requestPatch = jest.fn().mockRejectedValue({ code: 403 });
    const store = {
      patch: jest.fn(),
      api: {
        formatUrlForNotListing: () => rolloutApiUrl,
        request: { patch: requestPatch },
      },
    };

    const ro = mockRollout({
      spec: { paused: false, strategy: { blueGreen: {} } },
      status: { pauseConditions: [{ reason: "BlueGreenPause" }] },
    });

    await expect(requestRolloutPromotion(store as any, ro, {})).rejects.toMatchObject({ code: 403 });
  });

  it("runs spec patch after successful status when spec.paused", async () => {
    const requestPatch = jest.fn().mockResolvedValue({});
    const patch = jest.fn().mockResolvedValue(undefined);
    const store = {
      patch,
      api: {
        formatUrlForNotListing: () => rolloutApiUrl,
        request: { patch: requestPatch },
      },
    };

    const ro = mockRollout({
      spec: { paused: true, strategy: { blueGreen: {} } },
      status: { pauseConditions: [{ reason: "BlueGreenPause" }] },
    });

    await requestRolloutPromotion(store as any, ro, {});

    expect(patch).toHaveBeenCalledWith(ro, { spec: { paused: false } }, "merge");
  });

  it("uses unified patch when request.patch is missing", async () => {
    const patch = jest.fn().mockResolvedValue(undefined);
    const store = {
      patch,
      api: {
        formatUrlForNotListing: () => rolloutApiUrl,
      },
    };

    const ro = mockRollout({
      spec: { paused: false, strategy: { blueGreen: {} } },
      status: { pauseConditions: [{ reason: "BlueGreenPause" }] },
    });

    await requestRolloutPromotion(store as any, ro, {});

    expect(patch).toHaveBeenCalledWith(ro, { spec: { paused: false }, status: { pauseConditions: null } }, "merge");
  });

  it("full promote sends promoteFull on /status when hashes match and spec not paused", async () => {
    const requestPatch = jest.fn().mockResolvedValue({});
    const patch = jest.fn().mockResolvedValue(undefined);
    const store = {
      patch,
      api: {
        formatUrlForNotListing: () => rolloutApiUrl,
        request: { patch: requestPatch },
      },
    };

    const ro = mockRollout({
      spec: { paused: false, strategy: { canary: { steps: [] } } },
      status: { currentPodHash: "same", stableRS: "same" },
    });

    await requestRolloutPromotion(store as any, ro, { full: true });

    expect(requestPatch).toHaveBeenCalledWith(
      `${rolloutApiUrl}/status`,
      { data: { status: { promoteFull: true } } },
      expect.objectContaining({
        headers: { "content-type": "application/merge-patch+json" },
      }),
    );
    expect(patch).not.toHaveBeenCalled();
  });
});
