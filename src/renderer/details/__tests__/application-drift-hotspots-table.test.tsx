import { fireEvent, render, screen } from "@testing-library/react";
import { ApplicationDriftHotspotsTable } from "../application-drift-hotspots-table";

describe("ApplicationDriftHotspotsTable", () => {
  const resources = [
    { name: "out", kind: "Deployment", status: "OutOfSync", health: { status: "Healthy" } },
    { name: "unhealthy", kind: "Service", status: "Synced", health: { status: "Degraded" } },
  ];

  it("omits Actions column when onViewDiff is not provided", () => {
    render(<ApplicationDriftHotspotsTable resources={resources} />);

    expect(screen.queryByText("Actions")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "View diff" })).not.toBeInTheDocument();
  });

  it("shows View diff only for OutOfSync hotspots when onViewDiff is provided", () => {
    const onViewDiff = jest.fn();

    render(<ApplicationDriftHotspotsTable resources={resources} onViewDiff={onViewDiff} />);

    expect(screen.getByText("Actions")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "View diff" })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "View diff" }));

    expect(onViewDiff).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "out",
        kind: "Deployment",
        syncStatus: "OutOfSync",
      }),
    );
  });
});
