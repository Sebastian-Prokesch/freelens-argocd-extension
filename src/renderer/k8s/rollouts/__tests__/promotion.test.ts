import { ANALYSIS_PHASE_INCONCLUSIVE, getCurrentCanaryStep, isInconclusiveCanaryAnalysis } from "../canary-step";

function mockRollout(partial: Record<string, unknown> = {}) {
  return {
    getNs: () => "ns",
    getName: () => "demo",
    ...partial,
  } as any;
}

describe("getCurrentCanaryStep", () => {
  it("returns undefined when no canary steps", () => {
    const ro = mockRollout({
      spec: { strategy: { canary: { steps: [] } } },
      status: {},
    });
    expect(getCurrentCanaryStep(ro)).toEqual({ step: undefined, index: undefined });
  });

  it("returns step at index 0 when currentStepIndex absent", () => {
    const ro = mockRollout({
      spec: { strategy: { canary: { steps: [{ pause: {} }, { pause: {} }] } } },
      status: {},
    });
    expect(getCurrentCanaryStep(ro)).toMatchObject({ index: 0, step: { pause: {} } });
  });

  it("returns undefined step when index past end", () => {
    const ro = mockRollout({
      spec: { strategy: { canary: { steps: [{ pause: {} }] } } },
      status: { currentStepIndex: 1 },
    });
    expect(getCurrentCanaryStep(ro)).toEqual({ step: undefined, index: 1 });
  });
});

describe("isInconclusiveCanaryAnalysis", () => {
  it("is true when analysis status is Inconclusive", () => {
    const ro = mockRollout({
      spec: { strategy: { canary: { steps: [{}] } } },
      status: {
        canary: {
          currentStepAnalysisRunStatus: { status: ANALYSIS_PHASE_INCONCLUSIVE },
        },
      },
    });
    expect(isInconclusiveCanaryAnalysis(ro)).toBe(true);
  });

  it("is false without canary strategy", () => {
    expect(isInconclusiveCanaryAnalysis(mockRollout({ spec: { strategy: { blueGreen: {} } } }))).toBe(false);
  });
});
