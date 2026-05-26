import { getMutationErrorMessage } from "../mutation-errors";

describe("getMutationErrorMessage", () => {
  it("returns error message for Error instances", () => {
    expect(getMutationErrorMessage(new Error("boom"), "fallback")).toBe("boom");
  });

  it("returns fallback for non-Error values", () => {
    expect(getMutationErrorMessage({ code: 403 }, "fallback")).toBe("fallback");
  });

  it("returns fallback for undefined", () => {
    expect(getMutationErrorMessage(undefined, "fallback")).toBe("fallback");
  });
});
