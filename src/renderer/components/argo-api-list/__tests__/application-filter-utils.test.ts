import {
  getApplicationHealthStatus,
  getApplicationProject,
  getApplicationSyncStatus,
  matchesSelectedFacet,
  uniqueSortedValues,
} from "../application-filter-utils";

describe("application-filter-utils", () => {
  const apps = [
    {
      spec: { project: "proj-a" },
      status: { sync: { status: "Synced" }, health: { status: "Healthy" } },
    },
    {
      spec: { project: "proj-b" },
      status: { sync: { status: "OutOfSync" }, health: { status: "Degraded" } },
    },
    {
      spec: { project: "proj-a" },
      status: { sync: { status: "Synced" }, health: { status: "Degraded" } },
    },
  ];

  it("builds unique sorted facet options", () => {
    expect(uniqueSortedValues(apps.map((app) => getApplicationProject(app)))).toEqual(["proj-a", "proj-b"]);
    expect(uniqueSortedValues(apps.map((app) => getApplicationSyncStatus(app)))).toEqual(["OutOfSync", "Synced"]);
    expect(uniqueSortedValues(apps.map((app) => getApplicationHealthStatus(app)))).toEqual(["Degraded", "Healthy"]);
  });

  it("treats empty selection as match-all", () => {
    expect(matchesSelectedFacet([], "Synced")).toBe(true);
    expect(matchesSelectedFacet(["Synced"], "Synced")).toBe(true);
    expect(matchesSelectedFacet(["Synced"], "OutOfSync")).toBe(false);
  });
});
