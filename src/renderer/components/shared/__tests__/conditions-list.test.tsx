import { render, screen, within } from "@testing-library/react";
import { ConditionsList } from "../conditions-list";

describe("ConditionsList", () => {
  it("renders empty text in table mode", () => {
    render(<ConditionsList conditions={[]} mode="table" emptyText="No conditions" />);

    expect(screen.getByText("No conditions")).toBeInTheDocument();
  });

  it("renders compact condition entries with status badge", () => {
    render(
      <ConditionsList
        mode="compact"
        conditions={[
          { type: "Ready", status: "True", reason: "AllGood" },
          { type: "Synced", status: "Unknown", message: "Waiting" },
        ]}
      />,
    );

    expect(screen.getByText("Ready")).toBeInTheDocument();
    const drawerContents = screen.getAllByTestId("DrawerItemContent");
    const firstDrawer = drawerContents[0];
    const secondDrawer = drawerContents[1];

    expect(firstDrawer).toBeDefined();
    expect(secondDrawer).toBeDefined();
    if (!firstDrawer || !secondDrawer) {
      throw new Error("Expected two DrawerItemContent elements.");
    }

    expect(within(firstDrawer).getByText(/AllGood/)).toBeInTheDocument();
    expect(screen.getByText("Synced")).toBeInTheDocument();
    expect(within(secondDrawer).getByText(/Waiting/)).toBeInTheDocument();
    expect(screen.getAllByTestId("StatusBadge").length).toBeGreaterThanOrEqual(2);
  });

  it("renders table mode with configurable columns", () => {
    render(
      <ConditionsList
        mode="table"
        conditions={[{ type: "Healthy", status: "True", message: "ok", lastTransitionTime: "2026-01-01T00:00:00Z" }]}
        showReason={false}
        showMessage={true}
        showLastTransitionTime={true}
      />,
    );

    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.queryByText("Reason")).not.toBeInTheDocument();
    expect(screen.getByText("Message")).toBeInTheDocument();
    expect(screen.getByText("Last Transition")).toBeInTheDocument();
    expect(screen.getByText("Healthy")).toBeInTheDocument();
    expect(screen.getByText("ok")).toBeInTheDocument();
  });
});
