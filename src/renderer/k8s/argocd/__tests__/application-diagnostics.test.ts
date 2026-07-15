import {
  buildOperationTimeline,
  filterOutOfSyncResources,
  getDriftHotspotRank,
  groupDiffResourcesByNamespaceAndKind,
  isOutOfSyncStatus,
  isUnhealthyHealthStatus,
  rankDriftHotspots,
  sortDriftHotspots,
  summarizeApplicationHealth,
} from "../application-diagnostics";

describe("application diagnostics", () => {
  describe("isUnhealthyHealthStatus", () => {
    it("treats degraded and missing health as unhealthy", () => {
      expect(isUnhealthyHealthStatus("Degraded")).toBe(true);
      expect(isUnhealthyHealthStatus("Missing")).toBe(true);
    });

    it("treats healthy and progressing health as healthy", () => {
      expect(isUnhealthyHealthStatus("Healthy")).toBe(false);
      expect(isUnhealthyHealthStatus("Progressing")).toBe(false);
    });
  });

  describe("getDriftHotspotRank", () => {
    it("excludes synced healthy resources", () => {
      expect(
        getDriftHotspotRank({
          name: "web",
          kind: "Deployment",
          syncStatus: "Synced",
          healthStatus: "Healthy",
        }),
      ).toBeUndefined();
    });

    it("prioritizes non-synced unhealthy resources first", () => {
      expect(
        getDriftHotspotRank({
          name: "web",
          kind: "Deployment",
          syncStatus: "OutOfSync",
          healthStatus: "Degraded",
        }),
      ).toBe(1);
    });

    it("prioritizes out-of-sync before synced unhealthy", () => {
      const outOfSyncRank = getDriftHotspotRank({
        name: "web",
        kind: "Deployment",
        syncStatus: "OutOfSync",
        healthStatus: "Healthy",
      });
      const syncedUnhealthyRank = getDriftHotspotRank({
        name: "db",
        kind: "Service",
        syncStatus: "Synced",
        healthStatus: "Degraded",
      });

      expect(outOfSyncRank).toBe(2);
      expect(syncedUnhealthyRank).toBe(3);
      expect(outOfSyncRank).toBeLessThan(syncedUnhealthyRank ?? Number.MAX_SAFE_INTEGER);
    });
  });

  describe("rankDriftHotspots", () => {
    const resources = [
      { name: "healthy", kind: "Deployment", status: "Synced", health: { status: "Healthy" } },
      { name: "z-out", kind: "Deployment", status: "OutOfSync", health: { status: "Healthy" } },
      { name: "a-bad", kind: "Deployment", status: "OutOfSync", health: { status: "Degraded" } },
      { name: "svc", kind: "Service", status: "Synced", health: { status: "Missing" } },
      { name: "cfg", kind: "ConfigMap", status: "Unknown", health: { status: "Healthy" } },
      { name: "job", kind: "Job", status: "OutOfSync", health: { status: "Healthy" } },
      { name: "extra", kind: "Secret", status: "OutOfSync", health: { status: "Healthy" } },
    ];

    it("returns top-N hotspots ordered by rank then kind and name", () => {
      const result = rankDriftHotspots(resources, { limit: 5 });

      expect(result.totalDriftCount).toBe(6);
      expect(result.hasMore).toBe(true);
      expect(result.hotspots.map((item) => item.name)).toEqual(["a-bad", "cfg", "z-out", "job", "extra"]);
    });

    it("returns full sorted list from sortDriftHotspots", () => {
      expect(sortDriftHotspots(resources).map((item) => item.name)).toEqual([
        "a-bad",
        "cfg",
        "z-out",
        "job",
        "extra",
        "svc",
      ]);
    });

    it("returns empty hotspots when all resources are synced and healthy", () => {
      const result = rankDriftHotspots([
        { name: "web", kind: "Deployment", status: "Synced", health: { status: "Healthy" } },
      ]);

      expect(result.hotspots).toEqual([]);
      expect(result.totalDriftCount).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it("handles missing resources gracefully", () => {
      expect(rankDriftHotspots(undefined).hotspots).toEqual([]);
      expect(rankDriftHotspots([null, undefined]).hotspots).toEqual([]);
    });
  });

  describe("summarizeApplicationHealth", () => {
    it("counts out-of-sync and unhealthy resources", () => {
      const summary = summarizeApplicationHealth({
        sync: { status: "OutOfSync" },
        health: { status: "Degraded" },
        resources: [
          { name: "web", kind: "Deployment", status: "OutOfSync", health: { status: "Degraded" } },
          { name: "db", kind: "Service", status: "Synced", health: { status: "Healthy" } },
          { name: "cfg", kind: "ConfigMap", status: "Synced", health: { status: "Missing" } },
        ],
      } as any);

      expect(summary.appSyncStatus).toBe("OutOfSync");
      expect(summary.appHealthStatus).toBe("Degraded");
      expect(summary.totalResources).toBe(3);
      expect(summary.outOfSyncCount).toBe(1);
      expect(summary.unhealthyCount).toBe(2);
    });

    it("returns zero counts when status is missing", () => {
      expect(summarizeApplicationHealth(undefined)).toEqual({
        appSyncStatus: undefined,
        appHealthStatus: undefined,
        totalResources: 0,
        outOfSyncCount: 0,
        unhealthyCount: 0,
      });
    });
  });

  describe("buildOperationTimeline", () => {
    it("marks in-progress operations when finishedAt is missing", () => {
      expect(
        buildOperationTimeline({
          phase: "Running",
          message: "Sync in progress",
          startedAt: "2025-01-01T09:00:00.000Z",
        }),
      ).toEqual({
        phase: "Running",
        message: "Sync in progress",
        startedAt: "2025-01-01T09:00:00.000Z",
        finishedAt: undefined,
        inProgress: true,
      });
    });

    it("returns undefined for empty operation state", () => {
      expect(buildOperationTimeline(undefined)).toBeUndefined();
      expect(buildOperationTimeline({})).toBeUndefined();
    });
  });

  describe("isOutOfSyncStatus", () => {
    it("matches OutOfSync only", () => {
      expect(isOutOfSyncStatus("OutOfSync")).toBe(true);
      expect(isOutOfSyncStatus("Synced")).toBe(false);
    });
  });

  describe("filterOutOfSyncResources", () => {
    const resources = [
      { name: "synced", kind: "Deployment", status: "Synced", health: { status: "Healthy" } },
      { name: "out", kind: "Deployment", status: "OutOfSync", health: { status: "Healthy" } },
      { name: "unknown", kind: "Service", status: "Unknown", health: { status: "Healthy" } },
      { name: "synced-unhealthy", kind: "Service", status: "Synced", health: { status: "Degraded" } },
    ];

    it("returns only OutOfSync resources", () => {
      expect(filterOutOfSyncResources(resources).map((item) => item.name)).toEqual(["out"]);
    });

    it("handles missing resources gracefully", () => {
      expect(filterOutOfSyncResources(undefined)).toEqual([]);
      expect(filterOutOfSyncResources([null, undefined])).toEqual([]);
    });
  });

  describe("groupDiffResourcesByNamespaceAndKind", () => {
    const resources = [
      { name: "web-b", kind: "Deployment", namespace: "apps", status: "OutOfSync", health: { status: "Healthy" } },
      { name: "web-a", kind: "Deployment", namespace: "apps", status: "OutOfSync", health: { status: "Degraded" } },
      { name: "api", kind: "Service", namespace: "apps", status: "OutOfSync", health: { status: "Healthy" } },
      { name: "crb", kind: "ClusterRoleBinding", status: "OutOfSync", health: { status: "Healthy" } },
      { name: "synced", kind: "ConfigMap", namespace: "apps", status: "Synced", health: { status: "Healthy" } },
    ];

    it("groups OutOfSync resources by namespace then kind", () => {
      const groups = groupDiffResourcesByNamespaceAndKind(resources);

      expect(groups.map((group) => group.namespace)).toEqual(["(cluster)", "apps"]);
      expect(groups[1]?.kinds.map((kind) => kind.kind)).toEqual(["Deployment", "Service"]);
      expect(groups[1]?.kinds[0]?.resources.map((resource) => resource.name)).toEqual(["web-a", "web-b"]);
      expect(groups[0]?.kinds[0]?.resources.map((resource) => resource.name)).toEqual(["crb"]);
    });

    it("uses defaultNamespace when resource namespace is missing", () => {
      const groups = groupDiffResourcesByNamespaceAndKind(
        [{ name: "crb", kind: "ClusterRoleBinding", status: "OutOfSync", health: { status: "Healthy" } }],
        { defaultNamespace: "platform" },
      );

      expect(groups).toEqual([
        {
          namespace: "platform",
          kinds: [
            {
              kind: "ClusterRoleBinding",
              resources: [expect.objectContaining({ name: "crb" })],
            },
          ],
        },
      ]);
    });

    it("returns empty groups when no OutOfSync resources exist", () => {
      expect(
        groupDiffResourcesByNamespaceAndKind([
          { name: "web", kind: "Deployment", status: "Synced", health: { status: "Healthy" } },
        ]),
      ).toEqual([]);
    });
  });
});
