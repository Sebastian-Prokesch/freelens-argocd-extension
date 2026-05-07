import type { ArgoCronWorkflow, ArgoWorkflow } from "./index";

const terminalWorkflowPhases = new Set(["Succeeded", "Failed", "Error"]);

export function getWorkflowPhase(workflow: ArgoWorkflow): string {
  if (workflow.spec?.suspend === true) {
    return "Suspended";
  }
  return workflow.status?.phase ?? "Unknown";
}

export function getArgoWorkflowProgress(workflow: ArgoWorkflow): string {
  const progress = workflow.status?.progress;
  if (typeof progress === "string" && progress.length > 0) {
    return progress;
  }
  if (terminalWorkflowPhases.has(workflow.status?.phase ?? "")) {
    return "Complete";
  }
  return "N/A";
}

export function getArgoWorkflowStatusReason(workflow: ArgoWorkflow): string {
  return workflow.status?.message ?? workflow.status?.conditions?.[0]?.message ?? "N/A";
}

export function getArgoWorkflowDuration(workflow: ArgoWorkflow): string {
  const startedAt = workflow.status?.startedAt;
  const finishedAt = workflow.status?.finishedAt;

  if (!startedAt) {
    return "N/A";
  }

  const start = Date.parse(startedAt);
  const end = Date.parse(finishedAt ?? new Date().toISOString());

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return "N/A";
  }

  const elapsedMs = Math.max(end - start, 0);
  const elapsedSeconds = Math.floor(elapsedMs / 1000);

  if (elapsedSeconds < 60) {
    return `${elapsedSeconds}s`;
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const remainingSeconds = elapsedSeconds % 60;

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m ${remainingSeconds}s`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  const remainingMinutes = elapsedMinutes % 60;

  return `${elapsedHours}h ${remainingMinutes}m`;
}

export function getCronWorkflowSchedules(cronWorkflow: ArgoCronWorkflow): string {
  const schedules = cronWorkflow.spec?.schedules ?? [];
  if (schedules.length > 0) {
    return schedules.join(", ");
  }
  return "N/A";
}

export function getCronWorkflowSuspendLabel(cronWorkflow: ArgoCronWorkflow): string {
  return cronWorkflow.spec?.suspend ? "Yes" : "No";
}

export function getCronWorkflowLastScheduled(cronWorkflow: ArgoCronWorkflow): string {
  return cronWorkflow.status?.lastScheduledTime ?? "N/A";
}

export function getCronWorkflowActiveCount(cronWorkflow: ArgoCronWorkflow): number {
  return cronWorkflow.status?.active?.length ?? 0;
}
