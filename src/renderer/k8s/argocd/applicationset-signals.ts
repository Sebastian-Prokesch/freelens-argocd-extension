import type { ArgoApplicationSet } from "./applicationset";

interface ConditionLike {
  type?: string;
  status?: string;
}

interface GeneratedApplicationEntry {
  name: string;
  namespace: string;
}

const isDefinedString = (value: unknown): value is string => typeof value === "string" && value.length > 0;

const toApplicationKey = (namespace: string, name: string): string => `${namespace}/${name}`;

const parseApplicationReference = (
  rawValue: unknown,
): {
  namespace?: string;
  name?: string;
} => {
  if (!isDefinedString(rawValue)) {
    return {};
  }

  const [first, second] = rawValue.split("/", 2);
  if (first && second) {
    return {
      namespace: first,
      name: second,
    };
  }

  return {
    name: rawValue,
  };
};

export const getConditionBooleanStatus = (
  conditions: ConditionLike[] | undefined,
  type: string,
): boolean | undefined => {
  const condition = (conditions ?? []).find((item) => item?.type === type);
  if (!condition) {
    return undefined;
  }

  if (condition.status === "True") {
    return true;
  }

  if (condition.status === "False") {
    return false;
  }

  return undefined;
};

const getGeneratedApplications = (applicationSet: ArgoApplicationSet): GeneratedApplicationEntry[] => {
  const status = (applicationSet.status as any) ?? {};
  const defaultNamespace = applicationSet.getNs?.() ?? applicationSet.metadata?.namespace ?? "default";
  const fromResources = (status.resources ?? []).map((item: any) => ({
    name: item?.name,
    namespace: item?.namespace,
  }));
  const fromStatus = (status.applicationStatus ?? []).map((item: any) => {
    const reference = parseApplicationReference(item?.application);

    return {
      name: reference.name,
      namespace: item?.namespace ?? reference.namespace,
    };
  });

  const deduped = new Map<string, GeneratedApplicationEntry>();

  for (const candidate of [...fromResources, ...fromStatus]) {
    if (!isDefinedString(candidate?.name)) {
      continue;
    }

    const namespace = isDefinedString(candidate?.namespace) ? candidate.namespace : defaultNamespace;
    deduped.set(toApplicationKey(namespace, candidate.name), {
      name: candidate.name,
      namespace,
    });
  }

  return [...deduped.values()];
};

export const getGeneratedApplicationCount = (applicationSet: ArgoApplicationSet): number => {
  return getGeneratedApplications(applicationSet).length;
};

export const getApplicationSetResourcesUpToDate = (applicationSet: ArgoApplicationSet): boolean | undefined => {
  const conditions = ((applicationSet.status as any)?.conditions ?? []) as ConditionLike[];

  return (
    getConditionBooleanStatus(conditions, "ResourcesUpToDate") ??
    getConditionBooleanStatus(conditions, "ApplicationSetUpToDate")
  );
};

export const getApplicationSetHasError = (applicationSet: ArgoApplicationSet): boolean | undefined => {
  const conditions = ((applicationSet.status as any)?.conditions ?? []) as ConditionLike[];

  return getConditionBooleanStatus(conditions, "ErrorOccurred");
};
