import type { ArgoApplication, ArgoApplicationStore } from "../k8s/argocd/applications";

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

export async function syncApplication(store: ArgoApplicationStore, application: ArgoApplication): Promise<void> {
  await store.patch(application, buildApplicationSyncMergePatch(), "merge");
}

export async function terminateApplicationOperation(
  store: ArgoApplicationStore,
  application: ArgoApplication,
): Promise<void> {
  await store.patch(application, buildApplicationTerminateJsonPatch(), "json");
}
