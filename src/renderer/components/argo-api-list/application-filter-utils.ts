export function uniqueSortedValues(values: Array<string | undefined | null>): string[] {
  const unique = new Set<string>();
  for (const value of values) {
    const normalized = (value ?? "").trim();
    if (normalized) unique.add(normalized);
  }
  return Array.from(unique).sort((a, b) => a.localeCompare(b));
}

export function matchesSelectedFacet(selected: string[], value: string): boolean {
  return selected.length === 0 || selected.includes(value);
}

export function getApplicationProject(app: { spec?: { project?: string } }): string {
  return app.spec?.project?.trim() || "N/A";
}

export function getApplicationSyncStatus(app: {
  status?: { sync?: { status?: string } };
}): string {
  return app.status?.sync?.status?.trim() || "Unknown";
}

export function getApplicationHealthStatus(app: {
  status?: { health?: { status?: string } };
}): string {
  return app.status?.health?.status?.trim() || "Unknown";
}
