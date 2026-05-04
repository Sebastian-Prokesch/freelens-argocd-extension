import { getAbortMergePatch, getRetryMergePatch } from "../actions";

describe("rollout action patches", () => {
  it("builds abort patch payload", () => {
    expect(getAbortMergePatch({} as any)).toEqual({
      status: { abort: true },
    });
  });

  it("builds retry patch payload", () => {
    expect(getRetryMergePatch({} as any)).toEqual({
      status: { abort: false },
    });
  });
});
