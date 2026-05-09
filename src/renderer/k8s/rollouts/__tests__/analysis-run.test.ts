import {
  getAnalysisRunConditionSummary,
  getAnalysisRunMeasurementCount,
  getAnalysisRunMetricCount,
  getAnalysisRunPhase,
} from "../analysis-run";

describe("analysis run helpers", () => {
  it("returns Unknown when phase is missing", () => {
    const run = { status: {} } as any;

    expect(getAnalysisRunPhase(run)).toBe("Unknown");
  });

  it("counts metrics and measurements", () => {
    const run = {
      status: {
        metricResults: [
          {
            name: "error-rate",
            measurements: [{}, {}],
          },
          {
            name: "latency",
            measurements: [{}],
          },
        ],
      },
    } as any;

    expect(getAnalysisRunMetricCount(run)).toBe(2);
    expect(getAnalysisRunMeasurementCount(run)).toBe(3);
  });

  it("summarizes latest condition reason", () => {
    const run = {
      status: {
        conditions: [{ reason: "Started" }, { reason: "Successful" }],
      },
    } as any;

    expect(getAnalysisRunConditionSummary(run)).toBe("Successful");
  });
});
