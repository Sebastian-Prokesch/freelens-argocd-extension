import { Renderer } from "@freelensapp/extensions";
import { render, screen } from "@testing-library/react";
import { ArgoApplicationStatusChart } from "../argo-application-status-chart";

describe("ArgoApplicationStatusChart", () => {
  const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

  afterAll(() => {
    consoleLogSpy.mockRestore();
  });

  it("renders empty state when no applications exist", () => {
    render(<ArgoApplicationStatusChart applications={[]} />);

    expect(screen.getByText("No ArgoCD applications found")).toBeInTheDocument();
  });

  it("groups applications by health status and passes labels/dataset to PieChart", () => {
    const apps: any[] = [
      { status: { health: { status: "Healthy" } } },
      { status: { health: { status: "Healthy" } } },
      { status: { health: { status: "Degraded" } } },
      { status: { health: { status: "Unknown" } } },
    ];

    render(<ArgoApplicationStatusChart applications={apps as any} />);

    // our Jest mock renders a stub, but we assert the props sent to PieChart
    const pieChart = (Renderer.Component as any).PieChart as jest.Mock;
    expect(pieChart).toHaveBeenCalled();

    const callArgs = pieChart.mock.calls[0]?.[0];
    expect(callArgs.data.labels).toEqual(expect.arrayContaining(["Healthy: 2", "Degraded: 1", "Unknown: 1"]));
    expect(callArgs.data.datasets[0].data).toEqual(expect.arrayContaining([2, 1, 1]));
  });
});
