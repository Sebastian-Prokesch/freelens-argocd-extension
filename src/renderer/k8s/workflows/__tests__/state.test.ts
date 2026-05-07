import {
  getArgoWorkflowDuration,
  getArgoWorkflowProgress,
  getArgoWorkflowStatusReason,
  getCronWorkflowActiveCount,
  getCronWorkflowLastScheduled,
  getCronWorkflowSchedules,
  getCronWorkflowSuspendLabel,
  getWorkflowPhase,
} from "../state";

describe("workflow state helpers", () => {
  it("returns suspended phase when spec.suspend is true", () => {
    expect(getWorkflowPhase({ spec: { suspend: true }, status: { phase: "Running" } } as any)).toBe("Suspended");
  });

  it("returns workflow progress and reason fields", () => {
    const workflow = {
      status: {
        phase: "Running",
        progress: "2/5",
        message: "waiting for pod",
      },
    } as any;

    expect(getArgoWorkflowProgress(workflow)).toBe("2/5");
    expect(getArgoWorkflowStatusReason(workflow)).toBe("waiting for pod");
  });

  it("returns complete progress for terminal phases without progress", () => {
    expect(getArgoWorkflowProgress({ status: { phase: "Succeeded" } } as any)).toBe("Complete");
  });

  it("formats workflow duration from started and finished timestamps", () => {
    const workflow = {
      status: {
        startedAt: "2026-01-01T00:00:00.000Z",
        finishedAt: "2026-01-01T00:01:30.000Z",
      },
    } as any;

    expect(getArgoWorkflowDuration(workflow)).toBe("1m 30s");
  });

  it("returns cron workflow helpers from status/spec", () => {
    const cronWorkflow = {
      spec: {
        schedules: ["*/5 * * * *", "0 1 * * *"],
        suspend: true,
      },
      status: {
        lastScheduledTime: "2026-01-01T00:05:00.000Z",
        active: [{ name: "wf-a" }, { name: "wf-b" }],
      },
    } as any;

    expect(getCronWorkflowSchedules(cronWorkflow)).toBe("*/5 * * * *, 0 1 * * *");
    expect(getCronWorkflowSuspendLabel(cronWorkflow)).toBe("Yes");
    expect(getCronWorkflowLastScheduled(cronWorkflow)).toBe("2026-01-01T00:05:00.000Z");
    expect(getCronWorkflowActiveCount(cronWorkflow)).toBe(2);
  });
});
