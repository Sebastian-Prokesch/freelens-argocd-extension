import { Renderer } from "@freelensapp/extensions";
import { render, screen } from "@testing-library/react";
import { ArgoApplicationSyncStatusChart } from "../argo-application-sync-status-chart";

describe("ArgoApplicationSyncStatusChart", () => {
  const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

  afterAll(() => {
    consoleLogSpy.mockRestore();
  });

  it("renders empty state when no applications exist", () => {
    render(<ArgoApplicationSyncStatusChart applications={[]} />);

    expect(screen.getByText("No ArgoCD applications found")).toBeInTheDocument();
  });

  it("groups applications by sync status and passes labels/dataset to PieChart", () => {
    const apps: any[] = [
      { status: { sync: { status: "Synced" } } },
      { status: { sync: { status: "Synced" } } },
      { status: { sync: { status: "OutOfSync" } } },
      { status: { sync: { status: "Unknown" } } },
    ];

    render(<ArgoApplicationSyncStatusChart applications={apps as any} />);

    const pieChart = (Renderer.Component as any).PieChart as jest.Mock;
    expect(pieChart).toHaveBeenCalled();

    const callArgs = pieChart.mock.calls[0]?.[0];
    expect(callArgs.data.labels).toEqual(expect.arrayContaining(["Synced: 2", "OutOfSync: 1", "Unknown: 1"]));
    expect(callArgs.data.datasets[0].data).toEqual(expect.arrayContaining([2, 1, 1]));
  });
});
