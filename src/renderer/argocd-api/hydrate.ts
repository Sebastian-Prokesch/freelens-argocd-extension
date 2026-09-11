const DEFAULT_API_VERSION = "argoproj.io/v1alpha1";
const DEFAULT_NAMESPACE = "argocd";

const kindToPlural: Record<string, string> = {
  Application: "applications",
  AppProject: "appprojects",
  ApplicationSet: "applicationsets",
};

function buildSyntheticSelfLink(options: {
  apiVersion: string;
  kind: string;
  namespace?: string;
  name: string;
}): string {
  const plural = kindToPlural[options.kind] ?? `${options.kind.toLowerCase()}s`;
  const namespace = options.namespace || DEFAULT_NAMESPACE;
  return `/apis/${options.apiVersion}/namespaces/${namespace}/${plural}/${options.name}`;
}

function buildSyntheticUid(namespace: string | undefined, name: string, kind: string): string {
  return `argocd-api:${kind}:${namespace || DEFAULT_NAMESPACE}:${name}`;
}

/**
 * Freelens KubeObject still requires metadata.selfLink (and often uid) even though
 * Kubernetes and Argo CD API responses no longer include selfLink.
 */
export function normalizeArgoCdApiItem(item: Record<string, unknown>, kind: string): Record<string, unknown> {
  const apiVersion =
    typeof item.apiVersion === "string" && item.apiVersion.length > 0 ? item.apiVersion : DEFAULT_API_VERSION;
  const resolvedKind = typeof item.kind === "string" && item.kind.length > 0 ? item.kind : kind;

  const metadata = {
    ...((item.metadata as Record<string, unknown> | undefined) ?? {}),
  };

  if (!metadata.name && typeof item.name === "string") {
    metadata.name = item.name;
  }

  if (!metadata.namespace || typeof metadata.namespace !== "string") {
    metadata.namespace = DEFAULT_NAMESPACE;
  }

  const name = typeof metadata.name === "string" ? metadata.name : "";
  const namespace = typeof metadata.namespace === "string" ? metadata.namespace : DEFAULT_NAMESPACE;

  if (typeof metadata.selfLink !== "string" || metadata.selfLink.length === 0) {
    metadata.selfLink = buildSyntheticSelfLink({
      apiVersion,
      kind: resolvedKind,
      namespace,
      name,
    });
  }

  if (typeof metadata.uid !== "string" || metadata.uid.length === 0) {
    metadata.uid = buildSyntheticUid(namespace, name, resolvedKind);
  }

  if (typeof metadata.resourceVersion !== "string" || metadata.resourceVersion.length === 0) {
    metadata.resourceVersion = "0";
  }

  return {
    ...item,
    apiVersion,
    kind: resolvedKind,
    metadata,
  };
}

export function createKubeLikeObject<T extends object>(Ctor: new (data?: any) => T, data: Record<string, unknown>): T {
  const object = new Ctor(data);
  Object.assign(object, data);

  const metadata = (data.metadata ?? {}) as {
    name?: string;
    namespace?: string;
    creationTimestamp?: string;
    selfLink?: string;
    uid?: string;
  };
  const target = object as T & {
    getName?: () => string;
    getNs?: () => string | undefined;
    getCreationTimestamp?: () => string;
    getSearchFields?: () => string[];
    getId?: () => string;
    selfLink?: string;
    metadata?: typeof metadata;
  };

  if (!target.metadata) {
    target.metadata = metadata;
  }

  if (typeof target.getName !== "function") {
    target.getName = () => metadata.name ?? "";
  }
  if (typeof target.getNs !== "function") {
    target.getNs = () => metadata.namespace;
  }
  if (typeof target.getCreationTimestamp !== "function") {
    target.getCreationTimestamp = () => metadata.creationTimestamp ?? "";
  }
  if (typeof target.getSearchFields !== "function") {
    target.getSearchFields = () => [metadata.name ?? "", metadata.namespace ?? ""].filter(Boolean);
  }
  if (typeof target.getId !== "function") {
    target.getId = () => metadata.uid ?? metadata.selfLink ?? metadata.name ?? "";
  }
  if (typeof target.selfLink !== "string" && typeof metadata.selfLink === "string") {
    target.selfLink = metadata.selfLink;
  }

  return object;
}
