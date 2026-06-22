import {
  getInitialSyncOptionValues,
  getRevisionPlaceholder,
  hasMultipleSources,
  showsReplaceWarning,
} from "../application-sync-options";

describe("application-sync-options", () => {
  it("pre-fills known sync options from policy values", () => {
    expect(getInitialSyncOptionValues(["CreateNamespace=true", "PruneLast=true", "Unknown=true"])).toEqual([
      "CreateNamespace=true",
      "PruneLast=true",
    ]);
  });

  it("detects multi-source applications", () => {
    expect(
      hasMultipleSources({
        spec: {
          sources: [{ repoURL: "https://example.com/a.git" }],
        },
      } as any),
    ).toBe(true);

    expect(
      hasMultipleSources({
        spec: {
          source: { repoURL: "https://example.com/a.git" },
        },
      } as any),
    ).toBe(false);
  });

  it("returns revision placeholder for single-source apps", () => {
    expect(
      getRevisionPlaceholder({
        spec: {
          source: { targetRevision: "main" },
        },
      } as any),
    ).toBe("main");
  });

  it("shows replace warning when Replace sync option is selected", () => {
    expect(showsReplaceWarning(["Replace=true"])).toBe(true);
    expect(showsReplaceWarning(["CreateNamespace=true"])).toBe(false);
  });
});
