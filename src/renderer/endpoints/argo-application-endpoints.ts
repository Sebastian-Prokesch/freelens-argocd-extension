import type { ArgoApplication, ArgoApplicationStore } from "../k8s/argocd/applications";
import {
  type ApplicationSyncOptions,
  type ApplicationSyncStrategy,
  DEFAULT_APPLICATION_SYNC_OPTIONS,
} from "./application-sync-options";

export const ARGO_APPLICATION_REFRESH_ANNOTATION = "argocd.argoproj.io/refresh";

export type ApplicationRefreshMode = "normal" | "hard";

export type { ApplicationSyncOptions, ApplicationSyncStrategy };

/**
 * Endpoint layer owns Argo mutation payloads and request execution.
 * K8s modules continue owning resource and store definitions.
 */
export function buildApplicationSyncMergePatch(
  options: ApplicationSyncOptions = DEFAULT_APPLICATION_SYNC_OPTIONS,
): Record<string, unknown> {
  const syncStrategy: ApplicationSyncStrategy = options.syncStrategy ?? "hook";
  const strategyBody: Record<string, unknown> = options.force ? { force: true } : {};

  const sync: Record<string, unknown> = {
    syncStrategy: {
      [syncStrategy]: strategyBody,
    },
  };

  if (options.prune) {
    sync.prune = true;
  }

  if (options.dryRun) {
    sync.dryRun = true;
  }

  const revision = options.revision?.trim();
  if (revision) {
    sync.revision = revision;
  }

  if (options.syncOptions && options.syncOptions.length > 0) {
    sync.syncOptions = options.syncOptions;
  }

  return {
    operation: {
      initiatedBy: {
        username: "LensApp",
      },
      sync,
    },
  };
}

export interface JsonPatchOperation {
  op: "remove";
  path: "/operation";
}

export function buildApplicationTerminateJsonPatch(): JsonPatchOperation[] {
  return [{ op: "remove", path: "/operation" }];
}

export function buildApplicationRefreshMergePatch(mode: ApplicationRefreshMode): Record<string, unknown> {
  return {
    metadata: {
      annotations: {
        [ARGO_APPLICATION_REFRESH_ANNOTATION]: mode,
      },
    },
  };
}

export async function syncApplication(
  store: ArgoApplicationStore,
  application: ArgoApplication,
  options?: ApplicationSyncOptions,
): Promise<void> {
  await store.patch(application, buildApplicationSyncMergePatch(options), "merge");
}

export async function requestApplicationRefresh(
  store: ArgoApplicationStore,
  application: ArgoApplication,
  mode: ApplicationRefreshMode,
): Promise<void> {
  await store.patch(application, buildApplicationRefreshMergePatch(mode), "merge");
}

export async function refreshApplication(store: ArgoApplicationStore, application: ArgoApplication): Promise<void> {
  await requestApplicationRefresh(store, application, "normal");
}

export async function hardRefreshApplication(store: ArgoApplicationStore, application: ArgoApplication): Promise<void> {
  await requestApplicationRefresh(store, application, "hard");
}

export async function terminateApplicationOperation(
  store: ArgoApplicationStore,
  application: ArgoApplication,
): Promise<void> {
  await store.patch(application, buildApplicationTerminateJsonPatch(), "json");
}
