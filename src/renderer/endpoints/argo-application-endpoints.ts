import type { ArgoApplication, ArgoApplicationStore } from "../k8s/argocd/applications";

export const ARGO_APPLICATION_REFRESH_ANNOTATION = "argocd.argoproj.io/refresh";

export type ApplicationRefreshMode = "normal" | "hard";

/**
 * Endpoint layer owns Argo mutation payloads and request execution.
 * K8s modules continue owning resource and store definitions.
 */
export function buildApplicationSyncMergePatch(): Record<string, unknown> {
  return {
    operation: {
      initiatedBy: {
        username: "LensApp",
      },
      sync: {
        syncStrategy: {
          hook: {},
        },
      },
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

export async function syncApplication(store: ArgoApplicationStore, application: ArgoApplication): Promise<void> {
  await store.patch(application, buildApplicationSyncMergePatch(), "merge");
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
