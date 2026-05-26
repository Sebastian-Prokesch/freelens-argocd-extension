import type { ArgoSecretType, LabeledObject } from "../k8s/argocd";

type PatchStrategy = "merge" | "json";

export interface ConfigMapMutationStore {
  create: (params: { name: string; namespace: string }, data: Record<string, unknown>) => Promise<unknown>;
  patch: (object: unknown, data: Record<string, unknown>, strategy: PatchStrategy) => Promise<unknown>;
}

export interface SecretMutationStore {
  create: (params: { name: string; namespace: string }, data: Record<string, unknown>) => Promise<unknown>;
  patch: (
    object: unknown,
    data: Array<{ op: "add"; path: string; value: unknown }>,
    strategy: PatchStrategy,
  ) => Promise<unknown>;
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

const getSecretName = (secret: LabeledObject) => secret.metadata?.name ?? secret.getName();
const getSecretNamespace = (secret: LabeledObject) => secret.metadata?.namespace ?? secret.getNs();

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

export function buildConfigMapUpdatePatch(input: ConfigMapConfigInput): Record<string, unknown> {
  return {
    metadata: {
      labels: input.labels,
    },
    data: input.data,
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
  await store.patch(configMap as unknown, buildConfigMapUpdatePatch(input), "merge");
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

export function buildArgoSecretUpdatePatch(
  secret: LabeledObject,
  secretType: ArgoSecretType,
  stringData: Record<string, string>,
): Array<{ op: "add"; path: string; value: unknown }> {
  return [
    {
      op: "add",
      path: "/metadata/name",
      value: getSecretName(secret),
    },
    {
      op: "add",
      path: "/metadata/namespace",
      value: getSecretNamespace(secret),
    },
    {
      op: "add",
      path: "/metadata/labels",
      value: {
        ...(secret.metadata?.labels ?? {}),
        "argocd.argoproj.io/secret-type": secretType,
      },
    },
    {
      // Clear previous key material to avoid stale credentials after auth-method changes.
      op: "add",
      path: "/data",
      value: {},
    },
    {
      op: "add",
      path: "/stringData",
      value: stringData,
    },
  ];
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
  input: SecretConfigInput,
): Promise<void> {
  await store.patch(secret as unknown, buildArgoSecretUpdatePatch(secret, input.secretType, input.stringData), "json");
}
