import type { ArgoCronWorkflow, ArgoWorkflow, ArgoWorkflowStore } from "./index";

type MergePatch = Record<string, unknown>;
type WorkflowAction = "retry" | "resubmit";
type WorkflowSpecRecord = Record<string, unknown>;

interface WorkflowParameter {
  name: string;
  value?: string;
  [key: string]: unknown;
}

export interface ResubmitWorkflowParameterOverride {
  name: string;
  value: string;
}

export interface ResubmitWorkflowOptions {
  parameters?: ResubmitWorkflowParameterOverride[];
}

const resubmittableWorkflowPhases = new Set(["Succeeded", "Failed", "Error"]);

function formatWorkflowName(workflow: ArgoWorkflow): string {
  return workflow.getName?.() ?? workflow.metadata?.name ?? "workflow";
}

function sanitizeWorkflowName(value: string): string {
  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");

  return sanitized || "workflow";
}

function getWorkflowNamespace(workflow: ArgoWorkflow): string {
  return workflow.getNs?.() ?? workflow.metadata?.namespace ?? "";
}

function normalizeStringMap(
  value: Partial<Record<string, string>> | Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = Object.fromEntries(Object.entries(value).filter(([, entry]) => typeof entry === "string")) as Record<
    string,
    string
  >;

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function applyResubmitParameterOverrides(
  spec: WorkflowSpecRecord,
  options: ResubmitWorkflowOptions | undefined,
): WorkflowSpecRecord {
  const overrides = options?.parameters ?? [];

  if (overrides.length === 0) {
    return { ...spec };
  }

  const overrideMap = new Map(overrides.map((item) => [item.name, item.value]));
  const argumentsRecord =
    spec.arguments && typeof spec.arguments === "object" ? (spec.arguments as Record<string, unknown>) : {};
  const existingParameters = Array.isArray(argumentsRecord.parameters)
    ? (argumentsRecord.parameters as WorkflowParameter[])
    : [];
  const mergedParameters: WorkflowParameter[] = [];
  const seenOverrideNames = new Set<string>();

  for (const parameter of existingParameters) {
    if (!parameter || typeof parameter !== "object" || typeof parameter.name !== "string") {
      continue;
    }

    if (overrideMap.has(parameter.name)) {
      mergedParameters.push({
        ...parameter,
        value: overrideMap.get(parameter.name),
      });
      seenOverrideNames.add(parameter.name);
      continue;
    }

    mergedParameters.push({ ...parameter });
  }

  for (const override of overrides) {
    if (seenOverrideNames.has(override.name)) {
      continue;
    }

    mergedParameters.push({
      name: override.name,
      value: override.value,
    });
    seenOverrideNames.add(override.name);
  }

  return {
    ...spec,
    arguments: {
      ...argumentsRecord,
      parameters: mergedParameters,
    },
  };
}

function sanitizeResubmittedWorkflowSpec(spec: WorkflowSpecRecord): WorkflowSpecRecord {
  const nextSpec = { ...spec };

  // Runtime shutdown flags from terminated workflows must not be propagated to a new submission.
  delete nextSpec.shutdown;

  return nextSpec;
}

function buildResubmittedWorkflow(workflow: ArgoWorkflow, options?: ResubmitWorkflowOptions): {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
  };
  spec: Record<string, unknown>;
} {
  const baseName = sanitizeWorkflowName(formatWorkflowName(workflow));
  const suffix = Date.now().toString(36);
  const maxBaseLength = Math.max(1, 63 - suffix.length - 1);
  const nextName = `${baseName.slice(0, maxBaseLength)}-${suffix}`;
  const labels = {
    ...(normalizeStringMap(workflow.metadata?.labels) ?? {}),
    "workflows.argoproj.io/completed": "false",
  };
  const annotations = normalizeStringMap(workflow.metadata?.annotations);

  return {
    apiVersion: "argoproj.io/v1alpha1",
    kind: "Workflow",
    metadata: {
      name: nextName,
      namespace: getWorkflowNamespace(workflow),
      labels: Object.keys(labels).length > 0 ? labels : undefined,
      annotations,
    },
    spec: applyResubmitParameterOverrides(
      sanitizeResubmittedWorkflowSpec((workflow.spec ?? {}) as WorkflowSpecRecord),
      options,
    ),
  };
}

function getWorkflowBaseUrl(workflowStore: ArgoWorkflowStore, workflow: ArgoWorkflow): string {
  const api = workflowStore.api as unknown as {
    formatUrlForNotListing: (desc: { namespace?: string; name: string }) => string;
  };

  return api.formatUrlForNotListing({
    namespace: getWorkflowNamespace(workflow),
    name: formatWorkflowName(workflow),
  });
}

export function canSuspendWorkflow(workflow: ArgoWorkflow): boolean {
  return workflow.spec?.suspend !== true && workflow.status?.phase === "Running";
}

export function canResumeWorkflow(workflow: ArgoWorkflow): boolean {
  return workflow.spec?.suspend === true;
}

export function canTerminateWorkflow(workflow: ArgoWorkflow): boolean {
  const phase = workflow.status?.phase ?? "";
  return phase === "Running" || phase === "Pending";
}

export function canRetryWorkflow(workflow: ArgoWorkflow): boolean {
  const phase = workflow.status?.phase ?? "";
  return phase === "Failed" || phase === "Error";
}

export function canResubmitWorkflow(workflow: ArgoWorkflow): boolean {
  if (workflow.spec?.suspend === true) {
    return false;
  }

  const phase = workflow.status?.phase ?? "";
  return resubmittableWorkflowPhases.has(phase);
}

export function getSuspendWorkflowPatch(): MergePatch {
  return {
    spec: {
      suspend: true,
    },
  };
}

export function getResumeWorkflowPatch(): MergePatch {
  return {
    spec: {
      suspend: false,
    },
  };
}

export function getTerminateWorkflowPatch(): MergePatch {
  return {
    spec: {
      shutdown: "Terminate",
    },
  };
}

export function canSuspendCronWorkflow(cronWorkflow: ArgoCronWorkflow): boolean {
  return cronWorkflow.spec?.suspend !== true;
}

export function canResumeCronWorkflow(cronWorkflow: ArgoCronWorkflow): boolean {
  return cronWorkflow.spec?.suspend === true;
}

export function getSuspendCronWorkflowPatch(): MergePatch {
  return {
    spec: {
      suspend: true,
    },
  };
}

export function getResumeCronWorkflowPatch(): MergePatch {
  return {
    spec: {
      suspend: false,
    },
  };
}

function isMethodNotSupportedError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    code?: unknown;
    status?: unknown;
    response?: { status?: unknown };
  };
  const statusCode = candidate.code ?? candidate.status ?? candidate.response?.status;

  return statusCode === 404 || statusCode === 405;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.length > 0) {
    return error;
  }

  if (!error || typeof error !== "object") {
    return fallback;
  }

  const candidate = error as {
    message?: unknown;
    reason?: unknown;
    response?: { data?: { message?: unknown }; statusText?: unknown };
  };

  if (typeof candidate.message === "string" && candidate.message.length > 0) {
    return candidate.message;
  }

  if (typeof candidate.reason === "string" && candidate.reason.length > 0) {
    return candidate.reason;
  }

  if (typeof candidate.response?.data?.message === "string" && candidate.response.data.message.length > 0) {
    return candidate.response.data.message;
  }

  if (typeof candidate.response?.statusText === "string" && candidate.response.statusText.length > 0) {
    return candidate.response.statusText;
  }

  return fallback;
}

export async function requestWorkflowAction(
  workflowStore: ArgoWorkflowStore,
  workflow: ArgoWorkflow,
  action: WorkflowAction,
  options?: ResubmitWorkflowOptions,
): Promise<void> {
  if (action === "resubmit" && typeof (workflowStore as { create?: unknown }).create === "function") {
    const workflowToCreate = buildResubmittedWorkflow(workflow, options);
    const storeWithCreate = workflowStore as unknown as {
      create: (resource: { namespace?: string; name: string }, data: unknown) => Promise<unknown>;
    };

    await storeWithCreate.create(
      {
        namespace: workflowToCreate.metadata.namespace,
        name: workflowToCreate.metadata.name,
      },
      workflowToCreate,
    );
    return;
  }

  const api = workflowStore.api as unknown as {
    request?: {
      put?: (url: string, params?: { data?: unknown }) => Promise<unknown>;
      post?: (url: string, params?: { data?: unknown }) => Promise<unknown>;
    };
  };

  if (!api.request?.put && !api.request?.post) {
    throw new Error(`Workflow ${action} is not supported by this cluster API client.`);
  }

  const baseUrl = getWorkflowBaseUrl(workflowStore, workflow);
  const requestUrl = `${baseUrl}/${action}`;
  const requestBody =
    action === "resubmit" && options?.parameters && options.parameters.length > 0
      ? {
          data: {
            parameters: options.parameters.map((item) => `${item.name}=${item.value}`),
          },
        }
      : { data: {} };

  if (api.request?.put) {
    try {
      await api.request.put(requestUrl, requestBody);
      return;
    } catch (error) {
      if (!api.request?.post || !isMethodNotSupportedError(error)) {
        throw error;
      }
    }
  }

  await api.request?.post?.(requestUrl, requestBody);
}
