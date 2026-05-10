import type { ArgoCronWorkflow, ArgoWorkflow } from "./index";

const terminalWorkflowPhases = new Set(["Succeeded", "Failed", "Error"]);
const dayNameToNumber: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};
const cronDateFormatterCache = new Map<string, Intl.DateTimeFormat>();
const maxCronLookaheadMinutes = 366 * 24 * 60;

interface CronField {
  matcher: (value: number) => boolean;
  isWildcard: boolean;
}

interface ParsedCronSchedule {
  minute: CronField;
  hour: CronField;
  dayOfMonth: CronField;
  month: CronField;
  dayOfWeek: CronField;
}

interface DateParts {
  minute: number;
  hour: number;
  dayOfMonth: number;
  month: number;
  dayOfWeek: number;
}

interface WorkflowNodeStatus {
  id?: string;
  displayName?: string;
  name?: string;
  podName?: string;
  phase?: string;
}

interface WorkflowTemplateLikeSpec {
  arguments?: {
    parameters?: unknown[];
    artifacts?: unknown[];
  };
}

export interface WorkflowPodReference {
  nodeId: string;
  nodeName: string;
  podName: string;
  phase: string;
}

function getCronDateFormatter(timezone: string): Intl.DateTimeFormat {
  const existing = cronDateFormatterCache.get(timezone);

  if (existing) {
    return existing;
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  cronDateFormatterCache.set(timezone, formatter);

  return formatter;
}

function getDateParts(date: Date, timezone?: string): DateParts | null {
  if (!timezone) {
    return {
      minute: date.getMinutes(),
      hour: date.getHours(),
      dayOfMonth: date.getDate(),
      month: date.getMonth() + 1,
      dayOfWeek: date.getDay(),
    };
  }

  try {
    const formatter = getCronDateFormatter(timezone);
    const rawParts = formatter.formatToParts(date);

    const parts: Record<string, string | undefined> = {};
    for (const part of rawParts) {
      parts[part.type] = part.value;
    }

    const weekday = parts.weekday ? dayNameToNumber[parts.weekday] : undefined;
    const month = parts.month ? Number.parseInt(parts.month, 10) : Number.NaN;
    const dayOfMonth = parts.day ? Number.parseInt(parts.day, 10) : Number.NaN;
    const hour = parts.hour ? Number.parseInt(parts.hour, 10) : Number.NaN;
    const minute = parts.minute ? Number.parseInt(parts.minute, 10) : Number.NaN;

    if (
      weekday === undefined ||
      Number.isNaN(month) ||
      Number.isNaN(dayOfMonth) ||
      Number.isNaN(hour) ||
      Number.isNaN(minute)
    ) {
      return null;
    }

    return {
      minute,
      hour,
      dayOfMonth,
      month,
      dayOfWeek: weekday,
    };
  } catch {
    return null;
  }
}

function parseCronToken(token: string, min: number, max: number, dayOfWeek = false): number[] | null {
  const value = token.trim();

  if (!value) {
    return null;
  }

  const [rawBaseToken, stepToken] = value.split("/");
  const baseToken = rawBaseToken ?? "";
  const step = stepToken ? Number.parseInt(stepToken, 10) : 1;

  if (!baseToken || !Number.isInteger(step) || step <= 0) {
    return null;
  }

  const mapValue = (candidate: number): number => {
    if (dayOfWeek && candidate === 7) {
      return 0;
    }
    return candidate;
  };

  const parseNumeric = (raw: string): number | null => {
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isInteger(parsed)) {
      return null;
    }

    const mapped = mapValue(parsed);
    if (mapped < min || mapped > max) {
      return null;
    }

    return mapped;
  };

  const values = new Set<number>();

  if (baseToken === "*") {
    for (let current = min; current <= max; current += step) {
      values.add(mapValue(current));
    }
    return [...values];
  }

  if (baseToken.includes("-")) {
    const [startToken, endToken] = baseToken.split("-");
    const start = parseNumeric(startToken ?? "");
    const end = parseNumeric(endToken ?? "");

    if (start === null || end === null || start > end) {
      return null;
    }

    for (let current = start; current <= end; current += step) {
      values.add(mapValue(current));
    }

    return [...values];
  }

  const parsed = parseNumeric(baseToken);
  if (parsed === null) {
    return null;
  }

  values.add(parsed);
  return [...values];
}

function parseCronField(fieldValue: string, min: number, max: number, dayOfWeek = false): CronField | null {
  const field = fieldValue.trim();

  if (!field) {
    return null;
  }

  const tokens = field.split(",");
  const allowed = new Set<number>();

  for (const token of tokens) {
    const values = parseCronToken(token, min, max, dayOfWeek);
    if (!values) {
      return null;
    }
    for (const value of values) {
      allowed.add(value);
    }
  }

  if (allowed.size === 0) {
    return null;
  }

  return {
    matcher: (value: number) => allowed.has(value),
    isWildcard: field === "*",
  };
}

function parseCronSchedule(schedule: string): ParsedCronSchedule | null {
  const rawParts = schedule.trim().split(/\s+/).filter(Boolean);
  const parts = rawParts.length === 6 ? rawParts.slice(1) : rawParts;

  if (parts.length !== 5) {
    return null;
  }

  const minute = parseCronField(parts[0] ?? "", 0, 59);
  const hour = parseCronField(parts[1] ?? "", 0, 23);
  const dayOfMonth = parseCronField(parts[2] ?? "", 1, 31);
  const month = parseCronField(parts[3] ?? "", 1, 12);
  const dayOfWeek = parseCronField(parts[4] ?? "", 0, 6, true);

  if (!minute || !hour || !dayOfMonth || !month || !dayOfWeek) {
    return null;
  }

  return {
    minute,
    hour,
    dayOfMonth,
    month,
    dayOfWeek,
  };
}

function cronMatchesDateParts(schedule: ParsedCronSchedule, parts: DateParts): boolean {
  const dayOfMonthMatches = schedule.dayOfMonth.matcher(parts.dayOfMonth);
  const dayOfWeekMatches = schedule.dayOfWeek.matcher(parts.dayOfWeek);
  const dayMatches =
    schedule.dayOfMonth.isWildcard && schedule.dayOfWeek.isWildcard
      ? true
      : schedule.dayOfMonth.isWildcard
        ? dayOfWeekMatches
        : schedule.dayOfWeek.isWildcard
          ? dayOfMonthMatches
          : dayOfMonthMatches || dayOfWeekMatches;

  return (
    schedule.month.matcher(parts.month) &&
    dayMatches &&
    schedule.hour.matcher(parts.hour) &&
    schedule.minute.matcher(parts.minute)
  );
}

function getNextScheduleMatch(schedule: string, timezone: string | undefined, fromDate: Date): string {
  const parsedSchedule = parseCronSchedule(schedule);
  if (!parsedSchedule) {
    return "N/A";
  }

  const firstCandidate = new Date(fromDate);
  firstCandidate.setSeconds(0, 0);
  firstCandidate.setMinutes(firstCandidate.getMinutes() + 1);

  const firstCandidateTimestamp = firstCandidate.getTime();

  for (let offset = 0; offset < maxCronLookaheadMinutes; offset += 1) {
    const candidate = new Date(firstCandidateTimestamp + offset * 60_000);
    const candidateParts = getDateParts(candidate, timezone);

    if (!candidateParts) {
      return "N/A";
    }

    if (cronMatchesDateParts(parsedSchedule, candidateParts)) {
      return candidate.toISOString();
    }
  }

  return "N/A";
}

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

export function getWorkflowPodReferences(workflow: ArgoWorkflow): WorkflowPodReference[] {
  const nodes = workflow.status?.nodes;

  if (!nodes || typeof nodes !== "object") {
    return [];
  }

  const result: WorkflowPodReference[] = [];
  const seenPodNames = new Set<string>();

  for (const [nodeId, value] of Object.entries(nodes)) {
    if (!value || typeof value !== "object") {
      continue;
    }

    const node = value as WorkflowNodeStatus;

    if (!node.podName || node.podName.length === 0 || seenPodNames.has(node.podName)) {
      continue;
    }

    seenPodNames.add(node.podName);
    result.push({
      nodeId: node.id ?? nodeId,
      nodeName: node.displayName ?? node.name ?? node.podName,
      podName: node.podName,
      phase: node.phase ?? "Unknown",
    });
  }

  return result.sort((a, b) => a.nodeName.localeCompare(b.nodeName));
}

export function getCronWorkflowSchedules(cronWorkflow: ArgoCronWorkflow): string {
  const schedules = cronWorkflow.spec?.schedules ?? [];
  if (schedules.length > 0) {
    return schedules.join(", ");
  }
  const legacySchedule = (cronWorkflow.spec as { schedule?: string } | undefined)?.schedule;
  if (legacySchedule) {
    return legacySchedule;
  }
  return "N/A";
}

export function getCronWorkflowSuspendLabel(cronWorkflow: ArgoCronWorkflow): string {
  return cronWorkflow.spec?.suspend ? "Yes" : "No";
}

export function getCronWorkflowConcurrencyPolicy(cronWorkflow: ArgoCronWorkflow): string {
  return cronWorkflow.spec?.concurrencyPolicy ?? "N/A";
}

export function getCronWorkflowNextScheduled(cronWorkflow: ArgoCronWorkflow, fromDate = new Date()): string {
  const legacySchedule = (cronWorkflow.spec as { schedule?: string } | undefined)?.schedule;
  const schedules = [...(cronWorkflow.spec?.schedules ?? []), ...(legacySchedule ? [legacySchedule] : [])];

  if (schedules.length === 0) {
    return "N/A";
  }

  const timezone = cronWorkflow.spec?.timezone;
  const nextSchedules = schedules
    .map((schedule) => getNextScheduleMatch(schedule, timezone, fromDate))
    .filter((value) => value !== "N/A")
    .sort();

  return nextSchedules[0] ?? "N/A";
}

export function getCronWorkflowLastScheduled(cronWorkflow: ArgoCronWorkflow): string {
  return cronWorkflow.status?.lastScheduledTime ?? "N/A";
}

export function getCronWorkflowActiveCount(cronWorkflow: ArgoCronWorkflow): number {
  return cronWorkflow.status?.active?.length ?? 0;
}

export function getWorkflowArgumentsOverview(spec: WorkflowTemplateLikeSpec | undefined): string {
  const parameters = spec?.arguments?.parameters ?? [];
  const artifacts = spec?.arguments?.artifacts ?? [];

  const parts: string[] = [];
  if (parameters.length > 0) {
    parts.push(`Parameters: ${parameters.length}`);
  }
  if (artifacts.length > 0) {
    parts.push(`Artifacts: ${artifacts.length}`);
  }

  return parts.length > 0 ? parts.join(" | ") : "N/A";
}
