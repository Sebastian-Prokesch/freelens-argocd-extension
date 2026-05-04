import {
  canAbortRollout,
  canRetryRollout,
  deriveRolloutState,
  getBlueGreenTrafficTooltip,
  getRolloutStateLabel,
  getRolloutStateReason,
} from "../state";

describe("rollout state helpers", () => {
  it("derives promotable paused state", () => {
    const rollout = {
      spec: { paused: false },
      status: {
        phase: "Paused",
        pauseConditions: [{ reason: "CanaryPauseStep" }],
      },
    } as any;

    expect(deriveRolloutState(rollout)).toBe("paused_promotable");
    expect(getRolloutStateLabel(rollout)).toBe("Paused (Promotable)");
  });

  it("derives blue-green paused state as promotable", () => {
    const rollout = {
      spec: { paused: false },
      status: {
        phase: "Paused",
        pauseConditions: [{ reason: "BlueGreenPause" }],
      },
    } as any;

    expect(deriveRolloutState(rollout)).toBe("paused_promotable");
  });

  it("derives analysis pending paused state", () => {
    const rollout = {
      spec: {},
      status: {
        phase: "Paused",
        pauseConditions: [{ reason: "PauseReasonAnalysisRunPending" }],
      },
    } as any;

    expect(deriveRolloutState(rollout)).toBe("paused_analysis_pending");
    expect(getRolloutStateReason(rollout)).toContain("Analysis is pending");
  });

  it("derives aborted from message and allows retry", () => {
    const rollout = {
      status: {
        phase: "Degraded",
        message: "Rollout aborted by operator",
      },
    } as any;

    expect(deriveRolloutState(rollout)).toBe("aborted");
    expect(canRetryRollout(rollout)).toBe(true);
  });

  it("allows abort when rollout is progressing", () => {
    const rollout = {
      status: { phase: "Progressing" },
    } as any;

    expect(canAbortRollout(rollout)).toBe(true);
    expect(canRetryRollout(rollout)).toBe(false);
  });

  it("returns empty blue-green traffic tooltip when strategy is not blue-green", () => {
    const rollout = {
      spec: { strategy: { canary: { steps: [] } } },
      status: {
        phase: "Healthy",
        blueGreen: { activeSelector: "x" },
      },
    } as any;

    expect(getBlueGreenTrafficTooltip(rollout)).toBe("");
  });

  it("formats blue-green traffic tooltip from status fields", () => {
    const rollout = {
      spec: { strategy: { blueGreen: {} } },
      status: {
        phase: "Paused",
        stableRS: "rs-stable",
        currentPodHash: "hash-curr",
        blueGreen: {
          activeSelector: "sel-active",
          previewSelector: "sel-preview",
        },
      },
    } as any;

    expect(getBlueGreenTrafficTooltip(rollout)).toBe(
      ["phase=Paused", "active=sel-active", "preview=sel-preview", "stable=rs-stable", "current=hash-curr"].join("\n"),
    );
  });
});
