import type { ArgoApplication } from "../k8s/argocd/applications";

export type ApplicationSyncStrategy = "hook" | "apply";

export interface ApplicationSyncOptions {
  prune?: boolean;
  dryRun?: boolean;
  syncStrategy?: ApplicationSyncStrategy;
  force?: boolean;
  revision?: string;
  syncOptions?: string[];
}

export interface KnownApplicationSyncOption {
  label: string;
  value: string;
}

export const KNOWN_APPLICATION_SYNC_OPTIONS: KnownApplicationSyncOption[] = [
  { label: "Create namespace", value: "CreateNamespace=true" },
  { label: "Prune last", value: "PruneLast=true" },
  { label: "Skip validation", value: "Validate=false" },
  { label: "Apply out of sync only", value: "ApplyOutOfSyncOnly=true" },
  { label: "Replace resources", value: "Replace=true" },
  { label: "Server-side apply", value: "ServerSideApply=true" },
  { label: "Respect ignore differences", value: "RespectIgnoreDifferences=true" },
];

export const REPLACE_SYNC_OPTION = "Replace=true";

export const DEFAULT_APPLICATION_SYNC_OPTIONS: ApplicationSyncOptions = {
  syncStrategy: "hook",
};

export function getInitialSyncOptionValues(policySyncOptions?: string[]): string[] {
  const policySet = new Set(policySyncOptions ?? []);
  return KNOWN_APPLICATION_SYNC_OPTIONS.map((option) => option.value).filter((value) => policySet.has(value));
}

export function hasMultipleSources(application: ArgoApplication): boolean {
  const sources = application.spec?.sources;
  return Array.isArray(sources) && sources.length > 0;
}

export function getRevisionPlaceholder(application: ArgoApplication): string | undefined {
  return application.spec?.source?.targetRevision;
}

export function buildSelectedSyncOptions(selectedValues: string[]): string[] {
  return KNOWN_APPLICATION_SYNC_OPTIONS.map((option) => option.value).filter((value) =>
    selectedValues.includes(value),
  );
}

export function showsForceWarning(options: ApplicationSyncOptions): boolean {
  return options.force === true;
}

export function showsPruneWarning(options: ApplicationSyncOptions): boolean {
  return options.prune === true;
}

export function showsReplaceWarning(selectedSyncOptions: string[]): boolean {
  return selectedSyncOptions.includes(REPLACE_SYNC_OPTION);
}
