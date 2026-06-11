import type { ApplicationStatus } from "./applications";

export interface ApplicationResourceDiagnostic {
  name: string;
  kind: string;
  namespace?: string;
  syncStatus?: string;
  healthStatus?: string;
}

export interface ApplicationHealthSummary {
  appSyncStatus?: string;
  appHealthStatus?: string;
  totalResources: number;
  outOfSyncCount: number;
  unhealthyCount: number;
}

export interface OperationTimeline {
  phase?: string;
  message?: string;
  startedAt?: string;
  finishedAt?: string;
  inProgress: boolean;
}

export interface ApplicationOperationState {
  phase?: string;
  message?: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface RankDriftHotspotsOptions {
  limit?: number;
}

export interface RankDriftHotspotsResult {
  hotspots: ApplicationResourceDiagnostic[];
  totalDriftCount: number;
  hasMore: boolean;
}

const DEFAULT_HOTSPOT_LIMIT = 5;

const HEALTHY_HEALTH_STATUSES = new Set(["Healthy", "Progressing"]);

const UNHEALTHY_HEALTH_STATUSES = new Set(["Degraded", "Missing", "Suspended", "Unknown", "Failed", "Error"]);

const normalizeResource = (resource: unknown): ApplicationResourceDiagnostic | undefined => {
  if (!resource || typeof resource !== "object") {
    return undefined;
  }

  const entry = resource as {
    name?: string;
    kind?: string;
    namespace?: string;
    status?: string;
    health?: { status?: string };
  };

  if (!entry.name && !entry.kind) {
    return undefined;
  }

  return {
    name: entry.name ?? "Unknown",
    kind: entry.kind ?? "Unknown",
    namespace: entry.namespace,
    syncStatus: entry.status,
    healthStatus: entry.health?.status,
  };
};

export const isUnhealthyHealthStatus = (healthStatus?: string): boolean => {
  if (!healthStatus) {
    return false;
  }

  if (HEALTHY_HEALTH_STATUSES.has(healthStatus)) {
    return false;
  }

  if (UNHEALTHY_HEALTH_STATUSES.has(healthStatus)) {
    return true;
  }

  return healthStatus !== "Healthy" && healthStatus !== "Progressing";
};

export const isOutOfSyncStatus = (syncStatus?: string): boolean => syncStatus === "OutOfSync";

export const getDriftHotspotRank = (resource: ApplicationResourceDiagnostic): number | undefined => {
  const syncStatus = resource.syncStatus;
  const unhealthy = isUnhealthyHealthStatus(resource.healthStatus);
  const synced = syncStatus === "Synced";
  const nonSynced = Boolean(syncStatus && syncStatus !== "Synced");

  if (synced && !unhealthy) {
    return undefined;
  }

  if (nonSynced && unhealthy) {
    return 1;
  }

  if (isOutOfSyncStatus(syncStatus) || nonSynced) {
    return 2;
  }

  if (synced && unhealthy) {
    return 3;
  }

  if (!syncStatus) {
    return 4;
  }

  return 5;
};

const compareHotspots = (left: ApplicationResourceDiagnostic, right: ApplicationResourceDiagnostic): number => {
  const leftRank = getDriftHotspotRank(left) ?? Number.MAX_SAFE_INTEGER;
  const rightRank = getDriftHotspotRank(right) ?? Number.MAX_SAFE_INTEGER;

  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  const kindCompare = left.kind.localeCompare(right.kind);
  if (kindCompare !== 0) {
    return kindCompare;
  }

  return left.name.localeCompare(right.name);
};

export const sortDriftHotspots = (
  resources: unknown[] | undefined | null,
): ApplicationResourceDiagnostic[] => {
  return (resources ?? [])
    .map(normalizeResource)
    .filter((resource): resource is ApplicationResourceDiagnostic => resource !== undefined)
    .filter((resource) => getDriftHotspotRank(resource) !== undefined)
    .sort(compareHotspots);
};

export const rankDriftHotspots = (
  resources: unknown[] | undefined | null,
  options: RankDriftHotspotsOptions = {},
): RankDriftHotspotsResult => {
  const limit = options.limit ?? DEFAULT_HOTSPOT_LIMIT;
  const driftResources = sortDriftHotspots(resources);

  return {
    hotspots: driftResources.slice(0, limit),
    totalDriftCount: driftResources.length,
    hasMore: driftResources.length > limit,
  };
};

export const summarizeApplicationHealth = (status: ApplicationStatus | undefined): ApplicationHealthSummary => {
  const resources = Array.isArray(status?.resources) ? status.resources : [];

  let outOfSyncCount = 0;
  let unhealthyCount = 0;

  for (const resource of resources) {
    const normalized = normalizeResource(resource);
    if (!normalized) {
      continue;
    }

    if (isOutOfSyncStatus(normalized.syncStatus) || (normalized.syncStatus && normalized.syncStatus !== "Synced")) {
      outOfSyncCount += 1;
    }

    if (isUnhealthyHealthStatus(normalized.healthStatus)) {
      unhealthyCount += 1;
    }
  }

  return {
    appSyncStatus: status?.sync?.status,
    appHealthStatus: status?.health?.status,
    totalResources: resources.length,
    outOfSyncCount,
    unhealthyCount,
  };
};

export const buildOperationTimeline = (
  operationState: ApplicationOperationState | undefined,
): OperationTimeline | undefined => {
  if (!operationState) {
    return undefined;
  }

  const phase = operationState.phase;
  const message = operationState.message;
  const startedAt = operationState.startedAt;
  const finishedAt = operationState.finishedAt;

  if (!phase && !message && !startedAt && !finishedAt) {
    return undefined;
  }

  return {
    phase,
    message,
    startedAt,
    finishedAt,
    inProgress: Boolean(startedAt && !finishedAt),
  };
};
