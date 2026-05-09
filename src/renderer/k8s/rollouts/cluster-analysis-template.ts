import { Renderer } from "@freelensapp/extensions";

import type { ArgoApplicationKubeObjectCRD } from "../types";
import type { AnalysisTemplateSpec } from "./analysis-template";

export type ClusterAnalysisTemplateSpec = AnalysisTemplateSpec;
export type ClusterAnalysisTemplateStatus = Record<string, never>;

export class ArgoClusterAnalysisTemplate extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  ClusterAnalysisTemplateStatus,
  ClusterAnalysisTemplateSpec
> {
  static readonly kind = "ClusterAnalysisTemplate";
  static readonly namespaced = false;
  static readonly apiBase = "/apis/argoproj.io/v1alpha1/clusteranalysistemplates";

  static readonly crd: ArgoApplicationKubeObjectCRD = {
    apiVersions: ["argoproj.io/v1alpha1"],
    plural: "clusteranalysistemplates",
    singular: "clusteranalysistemplate",
    shortNames: ["cat"],
    title: "ClusterAnalysisTemplates",
  };
}

export class ArgoClusterAnalysisTemplateApi extends Renderer.K8sApi.KubeApi<ArgoClusterAnalysisTemplate> {}
export class ArgoClusterAnalysisTemplateStore extends Renderer.K8sApi.KubeObjectStore<
  ArgoClusterAnalysisTemplate,
  ArgoClusterAnalysisTemplateApi
> {}

let _argoClusterAnalysisTemplateStore: ArgoClusterAnalysisTemplateStore | undefined;

export function getArgoClusterAnalysisTemplateStore(): ArgoClusterAnalysisTemplateStore {
  if (!_argoClusterAnalysisTemplateStore) {
    const api = new ArgoClusterAnalysisTemplateApi({ objectConstructor: ArgoClusterAnalysisTemplate });
    _argoClusterAnalysisTemplateStore = new ArgoClusterAnalysisTemplateStore(api);
    Renderer.K8sApi.apiManager.registerStore(_argoClusterAnalysisTemplateStore);
  }

  return _argoClusterAnalysisTemplateStore;
}
