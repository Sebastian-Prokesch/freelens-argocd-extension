import { getAppProjectDestinationCount, getAppProjectSyncWindowCount } from "../appproject-signals";

describe("appproject signals", () => {
  it("returns destination and sync window counts", () => {
    const project = {
      spec: {
        destinations: [{ namespace: "*" }, { namespace: "prod" }],
        syncWindows: [{ kind: "allow" }],
      },
    } as any;

    expect(getAppProjectDestinationCount(project)).toBe(2);
    expect(getAppProjectSyncWindowCount(project)).toBe(1);
  });

  it("returns 0 for missing or non-array signal fields", () => {
    const missingSpecProject = {} as any;
    const invalidFieldsProject = {
      spec: {
        destinations: "all",
        syncWindows: { kind: "allow" },
      },
    } as any;

    expect(getAppProjectDestinationCount(missingSpecProject)).toBe(0);
    expect(getAppProjectSyncWindowCount(missingSpecProject)).toBe(0);
    expect(getAppProjectDestinationCount(invalidFieldsProject)).toBe(0);
    expect(getAppProjectSyncWindowCount(invalidFieldsProject)).toBe(0);
  });
});
