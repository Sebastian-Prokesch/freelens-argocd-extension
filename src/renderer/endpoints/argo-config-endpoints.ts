import type { ArgoSecretType, LabeledObject } from "../k8s/argocd";

type PatchStrategy = "merge" | "json";

export type SecretPatchOperation = { op: "add"; path: string; value: unknown } | { op: "remove"; path: string };

export interface ConfigMapMutationStore {
  create: (params: { name: string; namespace: string }, data: Record<string, unknown>) => Promise<unknown>;
  patch: (object: unknown, data: Record<string, unknown>, strategy: PatchStrategy) => Promise<unknown>;
}

export interface SecretMutationStore {
  create: (params: { name: string; namespace: string }, data: Record<string, unknown>) => Promise<unknown>;
  patch: (object: unknown, data: SecretPatchOperation[], strategy: PatchStrategy) => Promise<unknown>;
}

export interface ConfigMapConfigInput {
  name: string;
  namespace: string;
  labels: Record<string, string>;
  data: Record<string, string>;
}

export interface SecretConfigInput {
  name: string;
  namespace: string;
  secretType: ArgoSecretType;
  stringData: Record<string, string>;
}

/**
 * Edit intent for an existing Argo Secret. Keys not mentioned in `set` or
 * `remove` are left untouched so unknown keys and unchanged credentials survive.
 */
export interface SecretEditIntent {
  set: Record<string, string>;
  remove: string[];
}

export interface SecretUpdateInput {
  secretType: ArgoSecretType;
  intent: SecretEditIntent;
}

/** RFC 6901 JSON pointer escaping for map keys. */
const escapeJsonPointerSegment = (key: string): string => key.replace(/~/g, "~0").replace(/\//g, "~1");

export function buildConfigMapCreateResource(input: ConfigMapConfigInput): Record<string, unknown> {
  return {
    apiVersion: "v1",
    kind: "ConfigMap",
    metadata: {
      name: input.name,
      namespace: input.namespace,
      labels: input.labels,
    },
    data: input.data,
  };
}

export function buildConfigMapUpdatePatch(
  configMap: LabeledObject,
  input: ConfigMapConfigInput,
): Record<string, unknown> {
  const data: Record<string, string | null> = { ...input.data };

  // JSON merge patch only removes keys explicitly set to null.
  for (const key of Object.keys(configMap.data ?? {})) {
    if (!(key in input.data)) {
      data[key] = null;
    }
  }

  return {
    metadata: {
      labels: input.labels,
    },
    data,
  };
}

export async function createConfigMapConfig(store: ConfigMapMutationStore, input: ConfigMapConfigInput): Promise<void> {
  await store.create(
    {
      name: input.name,
      namespace: input.namespace,
    },
    buildConfigMapCreateResource(input),
  );
}

export async function updateConfigMapConfig(
  store: ConfigMapMutationStore,
  configMap: LabeledObject,
  input: ConfigMapConfigInput,
): Promise<void> {
  await store.patch(configMap as unknown, buildConfigMapUpdatePatch(configMap, input), "merge");
}

export function buildArgoSecretCreateResource(input: SecretConfigInput): Record<string, unknown> {
  return {
    apiVersion: "v1",
    kind: "Secret",
    metadata: {
      name: input.name,
      namespace: input.namespace,
      labels: {
        "argocd.argoproj.io/secret-type": input.secretType,
      },
    },
    type: "Opaque",
    stringData: input.stringData,
  };
}

/**
 * Builds a targeted JSON patch for an Argo Secret edit. Only keys named in the
 * intent are touched; the previous full `/data` + `/stringData` replacement
 * wiped credentials and unknown keys on partial edits (RF-0033).
 */
export function buildArgoSecretUpdatePatch(
  secret: LabeledObject,
  secretType: ArgoSecretType,
  intent: SecretEditIntent,
): SecretPatchOperation[] {
  const ops: SecretPatchOperation[] = [
    {
      op: "add",
      path: "/metadata/labels",
      value: {
        ...(secret.metadata?.labels ?? {}),
        "argocd.argoproj.io/secret-type": secretType,
      },
    },
  ];

  const setKeys = Object.keys(intent.set);
  const removeKeys = intent.remove.filter((key) => !setKeys.includes(key));

  for (const key of removeKeys) {
    if (secret.data && key in secret.data) {
      ops.push({ op: "remove", path: `/data/${escapeJsonPointerSegment(key)}` });
    }
    if (secret.stringData && key in secret.stringData) {
      ops.push({ op: "remove", path: `/stringData/${escapeJsonPointerSegment(key)}` });
    }
  }

  for (const key of setKeys) {
    // Drop the stale base64 entry so the stringData value wins for this key only.
    if (secret.data && key in secret.data) {
      ops.push({ op: "remove", path: `/data/${escapeJsonPointerSegment(key)}` });
    }
  }

  if (setKeys.length > 0) {
    ops.push({ op: "add", path: "/stringData", value: intent.set });
  }

  return ops;
}

export async function createArgoSecretConfig(store: SecretMutationStore, input: SecretConfigInput): Promise<void> {
  await store.create(
    {
      name: input.name,
      namespace: input.namespace,
    },
    buildArgoSecretCreateResource(input),
  );
}

export async function updateArgoSecretConfig(
  store: SecretMutationStore,
  secret: LabeledObject,
  input: SecretUpdateInput,
): Promise<void> {
  await store.patch(secret as unknown, buildArgoSecretUpdatePatch(secret, input.secretType, input.intent), "json");
}
