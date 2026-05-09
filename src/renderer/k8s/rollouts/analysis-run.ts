import { Renderer } from "@freelensapp/extensions";

import type { ArgoApplicationKubeObjectCRD } from "../types";

export interface AnalysisRunSpec {
  args?: { name?: string; value?: string; valueFrom?: Record<string, unknown> }[];
  metrics?: { name?: string; count?: number; interval?: string; provider?: Record<string, unknown> }[];
  terminate?: boolean;
}

export interface AnalysisRunMeasurement {
  phase?: string;
  startedAt?: string;
  finishedAt?: string;
  value?: string;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface AnalysisRunMetricResult {
  name?: string;
  phase?: string;
  count?: number;
  successful?: number;
  failed?: number;
  inconclusive?: number;
  error?: number;
  consecutiveError?: number;
  measurements?: AnalysisRunMeasurement[];
}

export interface AnalysisRunCondition {
  type?: string;
  status?: string;
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
}

export interface AnalysisRunStatus {
  phase?: string;
  message?: string;
  startedAt?: string;
  finishedAt?: string;
  metricResults?: AnalysisRunMetricResult[];
  conditions?: AnalysisRunCondition[];
}

export class ArgoAnalysisRun extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  AnalysisRunStatus,
  AnalysisRunSpec
> {
  static readonly kind = "AnalysisRun";
  static readonly namespaced = true;
  static readonly apiBase = "/apis/argoproj.io/v1alpha1/analysisruns";

  static readonly crd: ArgoApplicationKubeObjectCRD = {
    apiVersions: ["argoproj.io/v1alpha1"],
    plural: "analysisruns",
    singular: "analysisrun",
    shortNames: ["ar"],
    title: "AnalysisRuns",
  };
}

export class ArgoAnalysisRunApi extends Renderer.K8sApi.KubeApi<ArgoAnalysisRun> {}
export class ArgoAnalysisRunStore extends Renderer.K8sApi.KubeObjectStore<ArgoAnalysisRun, ArgoAnalysisRunApi> {}

let _argoAnalysisRunStore: ArgoAnalysisRunStore | undefined;

export function getArgoAnalysisRunStore(): ArgoAnalysisRunStore {
  if (!_argoAnalysisRunStore) {
    const api = new ArgoAnalysisRunApi({ objectConstructor: ArgoAnalysisRun });
    _argoAnalysisRunStore = new ArgoAnalysisRunStore(api);
    Renderer.K8sApi.apiManager.registerStore(_argoAnalysisRunStore);
  }

  return _argoAnalysisRunStore;
}

export function getAnalysisRunPhase(run: ArgoAnalysisRun): string {
  return run.status?.phase || "Unknown";
}

export function getAnalysisRunMetricCount(run: ArgoAnalysisRun): number {
  return run.status?.metricResults?.length ?? 0;
}

export function getAnalysisRunMeasurementCount(run: ArgoAnalysisRun): number {
  return (
    run.status?.metricResults?.reduce((total, metricResult) => {
      return total + (metricResult.measurements?.length ?? 0);
    }, 0) ?? 0
  );
}

export function getAnalysisRunConditionSummary(run: ArgoAnalysisRun): string {
  const conditions = run.status?.conditions ?? [];

  if (conditions.length === 0) {
    return "None";
  }

  const latestCondition = conditions[conditions.length - 1];
  return latestCondition?.reason || latestCondition?.message || latestCondition?.type || "Unknown";
}
