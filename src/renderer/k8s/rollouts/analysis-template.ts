import { Renderer } from "@freelensapp/extensions";

import type { ArgoApplicationKubeObjectCRD } from "../types";

export interface ArgoAnalysisTemplateArg {
  name?: string;
  value?: string;
  valueFrom?: Record<string, unknown>;
}

export interface ArgoAnalysisTemplateMetric {
  name?: string;
  interval?: string;
  initialDelay?: string;
  count?: number;
  failureLimit?: number;
  inconclusiveLimit?: number;
  consecutiveErrorLimit?: number;
  successCondition?: string;
  failureCondition?: string;
  provider?: Record<string, unknown>;
  dryRun?: { metricName?: string }[];
}

export interface AnalysisTemplateSpec {
  args?: ArgoAnalysisTemplateArg[];
  metrics?: ArgoAnalysisTemplateMetric[];
}

export type AnalysisTemplateStatus = Record<string, never>;

export class ArgoAnalysisTemplate extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  AnalysisTemplateStatus,
  AnalysisTemplateSpec
> {
  static readonly kind = "AnalysisTemplate";
  static readonly namespaced = true;
  static readonly apiBase = "/apis/argoproj.io/v1alpha1/analysistemplates";

  static readonly crd: ArgoApplicationKubeObjectCRD = {
    apiVersions: ["argoproj.io/v1alpha1"],
    plural: "analysistemplates",
    singular: "analysistemplate",
    shortNames: ["at"],
    title: "AnalysisTemplates",
  };
}

export class ArgoAnalysisTemplateApi extends Renderer.K8sApi.KubeApi<ArgoAnalysisTemplate> {}
export class ArgoAnalysisTemplateStore extends Renderer.K8sApi.KubeObjectStore<
  ArgoAnalysisTemplate,
  ArgoAnalysisTemplateApi
> {}

let _argoAnalysisTemplateStore: ArgoAnalysisTemplateStore | undefined;

export function getArgoAnalysisTemplateStore(): ArgoAnalysisTemplateStore {
  if (!_argoAnalysisTemplateStore) {
    const api = new ArgoAnalysisTemplateApi({ objectConstructor: ArgoAnalysisTemplate });
    _argoAnalysisTemplateStore = new ArgoAnalysisTemplateStore(api);
    Renderer.K8sApi.apiManager.registerStore(_argoAnalysisTemplateStore);
  }

  return _argoAnalysisTemplateStore;
}
