/**
 * Thin Kubernetes `/status` merge-patch transport over Freelens KubeApi internals.
 *
 * See ADR-0003 (`.cursor/refactoring/decisions/adr-0003-kubernetes-patch-transport.md`).
 */

export interface KubeObjectRef {
  getName(): string;
  getNs(): string | undefined;
}

export interface KubePatchStore {
  api?: unknown;
}

type KubeApiPatchInternals = {
  formatUrlForNotListing?: (desc: { namespace?: string; name: string }) => string;
  request?: {
    patch: (url: string, params: { data: unknown }, init?: { headers?: Record<string, string> }) => Promise<unknown>;
  };
};

const MERGE_PATCH_CONTENT_TYPE = "application/merge-patch+json";

export function isKubeNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const o = error as Record<string, unknown>;
  if (o.code === 404) {
    return true;
  }
  const response = o.response as { status?: number } | undefined;
  if (response?.status === 404) {
    return true;
  }
  if (typeof o.reason === "string" && o.reason === "NotFound") {
    return true;
  }
  const cause = o.cause as Record<string, unknown> | undefined;
  if (cause?.code === 404) {
    return true;
  }
  return false;
}

/**
 * Merge-patch the object's `/status` subresource via Freelens KubeApi.
 *
 * @returns `true` if the `/status` patch succeeded.
 * @returns `false` if status transport is unavailable (missing api helpers or empty name).
 * @throws on real request failures, including 404 — callers decide fallback policy.
 */
export async function patchStatusSubresource(
  store: KubePatchStore,
  object: KubeObjectRef,
  data: unknown,
): Promise<boolean> {
  const api = (store.api ?? {}) as KubeApiPatchInternals;

  if (!api.formatUrlForNotListing || !api.request?.patch) {
    return false;
  }

  const name = typeof object.getName === "function" ? object.getName() : "";
  if (!name) {
    return false;
  }

  const namespace = typeof object.getNs === "function" ? (object.getNs() ?? "") : "";

  const baseUrl = api.formatUrlForNotListing({
    namespace,
    name,
  });

  await api.request.patch(
    `${baseUrl}/status`,
    { data },
    {
      headers: {
        "content-type": MERGE_PATCH_CONTENT_TYPE,
      },
    },
  );

  return true;
}
