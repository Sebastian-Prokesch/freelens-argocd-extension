import type { ArgoAppProject } from "./appproject";

export const getAppProjectDestinationCount = (project: ArgoAppProject): number => {
  const destinations = (project.spec as any)?.destinations;

  return Array.isArray(destinations) ? destinations.length : 0;
};

export const getAppProjectSyncWindowCount = (project: ArgoAppProject): number => {
  const syncWindows = (project.spec as any)?.syncWindows;

  return Array.isArray(syncWindows) ? syncWindows.length : 0;
};
