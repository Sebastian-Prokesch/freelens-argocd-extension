import { render, screen } from "@testing-library/react";
import { getStatusTone, StatusBadge } from "../status-badge";

describe("StatusBadge", () => {
  it("maps known healthy states to positive tone", () => {
    expect(getStatusTone("Healthy")).toBe("positive");
    expect(getStatusTone("Synced")).toBe("positive");
    expect(getStatusTone("Running")).toBe("positive");
  });

  it("maps transitional states to warning tone", () => {
    expect(getStatusTone("Progressing")).toBe("warning");
    expect(getStatusTone("paused")).toBe("warning");
  });

  it("maps failing states to negative tone", () => {
    expect(getStatusTone("Degraded")).toBe("negative");
    expect(getStatusTone("OutOfSync")).toBe("negative");
    expect(getStatusTone("Failed")).toBe("negative");
  });

  it("falls back to neutral for empty and unknown states", () => {
    expect(getStatusTone(undefined)).toBe("neutral");
    expect(getStatusTone("custom-state")).toBe("neutral");
  });

  it("renders fallback label when no status is present", () => {
    render(<StatusBadge status={undefined} />);

    expect(screen.getByTestId("StatusBadge")).toHaveTextContent("Unknown");
    expect(screen.getByTestId("StatusBadge")).toHaveAttribute("data-tone", "neutral");
  });
});
