import {
  getApplicationSetHasError,
  getApplicationSetResourcesUpToDate,
  getConditionBooleanStatus,
  getGeneratedApplicationCount,
} from "../applicationset-signals";

describe("applicationset signals", () => {
  it("returns condition boolean status and handles missing condition", () => {
    const conditions = [
      { type: "Ready", status: "True" },
      { type: "ErrorOccurred", status: "False" },
    ];

    expect(getConditionBooleanStatus(conditions, "Ready")).toBe(true);
    expect(getConditionBooleanStatus(conditions, "ErrorOccurred")).toBe(false);
    expect(getConditionBooleanStatus(conditions, "Missing")).toBeUndefined();
  });

  it("counts generated applications across resources and status with dedupe", () => {
    const object = {
      getNs: () => "argocd",
      metadata: { namespace: "argocd" },
      status: {
        resources: [
          { name: "guestbook", namespace: "team-a" },
          { name: "guestbook", namespace: "team-a" },
          { name: "payments" },
        ],
        applicationStatus: [
          { application: "guestbook", namespace: "team-a" },
          { application: "team-b/payments" },
          { application: "payments" },
        ],
      },
    } as any;

    expect(getGeneratedApplicationCount(object)).toBe(3);
  });

  it("returns 0 generated applications when status is missing", () => {
    const object = {
      getNs: () => "argocd",
      metadata: { namespace: "argocd" },
    } as any;

    expect(getGeneratedApplicationCount(object)).toBe(0);
  });

  it("derives resources up-to-date from either supported condition name", () => {
    const resourcesUpToDateObject = {
      status: {
        conditions: [{ type: "ResourcesUpToDate", status: "True" }],
      },
    } as any;
    const legacyUpToDateObject = {
      status: {
        conditions: [{ type: "ApplicationSetUpToDate", status: "False" }],
      },
    } as any;
    const missingConditionObject = {
      status: {
        conditions: [{ type: "Ready", status: "True" }],
      },
    } as any;

    expect(getApplicationSetResourcesUpToDate(resourcesUpToDateObject)).toBe(true);
    expect(getApplicationSetResourcesUpToDate(legacyUpToDateObject)).toBe(false);
    expect(getApplicationSetResourcesUpToDate(missingConditionObject)).toBeUndefined();
  });

  it("derives error flag from ErrorOccurred condition", () => {
    const errorObject = {
      status: {
        conditions: [{ type: "ErrorOccurred", status: "True" }],
      },
    } as any;
    const nonErrorObject = {
      status: {
        conditions: [{ type: "ErrorOccurred", status: "False" }],
      },
    } as any;
    const missingConditionObject = {
      status: {},
    } as any;

    expect(getApplicationSetHasError(errorObject)).toBe(true);
    expect(getApplicationSetHasError(nonErrorObject)).toBe(false);
    expect(getApplicationSetHasError(missingConditionObject)).toBeUndefined();
  });
});
