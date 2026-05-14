import {
  ARGOCD_NOTIFICATIONS_SECRET_NAME,
  ARGOCD_PART_OF_LABEL,
  ARGOCD_PART_OF_VALUE,
  ARGOCD_SECRET_TYPE_LABEL,
} from "./argo-config";

/** ArgoCD repository / repo-creds / cluster secrets always carry this label. */
export const ARGOCD_TYPED_SECRET_LABEL_SELECTOR = `${ARGOCD_SECRET_TYPE_LABEL} in (repository,repo-creds,cluster)`;

/** Notifications controller secret is identified by name (no Argo secret-type label). */
export const ARGOCD_NOTIFICATIONS_SECRET_FIELD_SELECTOR = `metadata.name=${ARGOCD_NOTIFICATIONS_SECRET_NAME}`;

/** ArgoCD-managed ConfigMaps use the standard part-of label. */
export const ARGOCD_CONFIGMAP_LABEL_SELECTOR = `${ARGOCD_PART_OF_LABEL}=${ARGOCD_PART_OF_VALUE}`;

export interface NamespaceListableStore {
  contextNamespaces: string[];
  items: { getName: () => string }[];
}

export function getNamespacesForArgoConfigQuery(namespaceStore: NamespaceListableStore): string[] {
  const fromContext = namespaceStore.contextNamespaces;

  if (fromContext.length > 0) {
    return [...fromContext];
  }

  return namespaceStore.items.map((ns) => ns.getName());
}

export interface ListableKubeApi<T> {
  list(options: { namespace: string }, query?: { labelSelector?: string; fieldSelector?: string }): Promise<T[] | null>;
}

const dedupeByObjectId = <
  T extends { getId?: () => string; metadata?: { uid?: string }; getNs: () => string; getName: () => string },
>(
  items: T[],
): T[] => {
  const seen = new Set<string>();
  const out: T[] = [];

  for (const item of items) {
    const id = item.getId?.() ?? item.metadata?.uid ?? `${item.getNs()}/${item.getName()}`;

    if (seen.has(id)) {
      continue;
    }

    seen.add(id);
    out.push(item);
  }

  return out;
};

/**
 * Lists ArgoCD-related Secrets using server-side selectors (per namespace), avoiding a cluster-wide
 * unfiltered Secret list.
 */
export async function loadArgoConfigSecrets<
  T extends { getId?: () => string; metadata?: { uid?: string }; getNs: () => string; getName: () => string },
>(namespaces: string[], secretApi: ListableKubeApi<T>): Promise<T[]> {
  const results = await Promise.all(
    namespaces.map(async (namespace) => {
      const [typed, notifications] = await Promise.all([
        secretApi.list({ namespace }, { labelSelector: ARGOCD_TYPED_SECRET_LABEL_SELECTOR }),
        secretApi.list({ namespace }, { fieldSelector: ARGOCD_NOTIFICATIONS_SECRET_FIELD_SELECTOR }),
      ]);

      return [...(typed ?? []), ...(notifications ?? [])];
    }),
  );

  return dedupeByObjectId(results.flat());
}

/**
 * Lists ArgoCD part-of ConfigMaps using a server-side label selector (per namespace).
 */
export async function loadArgoConfigMaps<
  T extends { getId?: () => string; metadata?: { uid?: string }; getNs: () => string; getName: () => string },
>(namespaces: string[], configMapApi: ListableKubeApi<T>): Promise<T[]> {
  const results = await Promise.all(
    namespaces.map(async (namespace) =>
      configMapApi.list({ namespace }, { labelSelector: ARGOCD_CONFIGMAP_LABEL_SELECTOR }),
    ),
  );

  return dedupeByObjectId(results.flat().filter(Boolean) as T[]);
}
