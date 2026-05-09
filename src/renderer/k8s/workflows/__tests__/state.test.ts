import {
  getArgoWorkflowDuration,
  getArgoWorkflowProgress,
  getArgoWorkflowStatusReason,
  getCronWorkflowActiveCount,
  getCronWorkflowConcurrencyPolicy,
  getCronWorkflowLastScheduled,
  getCronWorkflowNextScheduled,
  getCronWorkflowSchedules,
  getCronWorkflowSuspendLabel,
  getWorkflowPhase,
  getWorkflowPodReferences,
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

  it("extracts workflow pod references from status nodes", () => {
    const workflow = {
      status: {
        nodes: {
          podNodeA: {
            id: "podNodeA",
            displayName: "step-a",
            podName: "workflow-pod-a",
            phase: "Succeeded",
          },
          podNodeB: {
            id: "podNodeB",
            displayName: "step-b",
            podName: "workflow-pod-b",
            phase: "Running",
          },
          virtualNode: {
            id: "virtualNode",
            displayName: "workflow",
            phase: "Running",
          },
        },
      },
    } as any;

    expect(getWorkflowPodReferences(workflow)).toEqual([
      {
        nodeId: "podNodeA",
        nodeName: "step-a",
        podName: "workflow-pod-a",
        phase: "Succeeded",
      },
      {
        nodeId: "podNodeB",
        nodeName: "step-b",
        podName: "workflow-pod-b",
        phase: "Running",
      },
    ]);
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
        concurrencyPolicy: "Forbid",
      },
      status: {
        lastScheduledTime: "2026-01-01T00:05:00.000Z",
        active: [{ name: "wf-a" }, { name: "wf-b" }],
      },
    } as any;

    expect(getCronWorkflowSchedules(cronWorkflow)).toBe("*/5 * * * *, 0 1 * * *");
    expect(getCronWorkflowSuspendLabel(cronWorkflow)).toBe("Yes");
    expect(getCronWorkflowConcurrencyPolicy(cronWorkflow)).toBe("Forbid");
    expect(getCronWorkflowLastScheduled(cronWorkflow)).toBe("2026-01-01T00:05:00.000Z");
    expect(getCronWorkflowActiveCount(cronWorkflow)).toBe(2);
  });

  it("computes the next scheduled cron run", () => {
    const cronWorkflow = {
      spec: {
        schedules: ["*/15 * * * *"],
      },
    } as any;

    const nextScheduled = getCronWorkflowNextScheduled(cronWorkflow, new Date("2026-01-01T00:05:00.000Z"));
    expect(nextScheduled).toBe("2026-01-01T00:15:00.000Z");
  });

  it("returns N/A for invalid cron expressions", () => {
    const cronWorkflow = {
      spec: {
        schedules: ["not a cron expression"],
      },
    } as any;

    expect(getCronWorkflowNextScheduled(cronWorkflow, new Date("2026-01-01T00:05:00.000Z"))).toBe("N/A");
  });
});
