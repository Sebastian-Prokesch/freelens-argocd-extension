import { Renderer } from "@freelensapp/extensions";

import type { ArgoApplicationKubeObjectCRD } from "../types";

export interface ExperimentSpec {
  duration?: string;
  progressDeadlineSeconds?: number;
  replicas?: number;
  templates?: {
    name?: string;
    selector?: Record<string, unknown>;
    service?: Record<string, unknown>;
    specRef?: string;
    replicas?: number;
  }[];
  analyses?: {
    name?: string;
    templateName?: string;
    args?: { name?: string; value?: string; valueFrom?: Record<string, unknown> }[];
  }[];
}

export interface ExperimentStatusCondition {
  type?: string;
  status?: string;
  reason?: string;
  message?: string;
}

export interface ExperimentStatus {
  phase?: string;
  message?: string;
  availableAt?: string;
  scaleDownDeadline?: string;
  conditions?: ExperimentStatusCondition[];
}

export class ArgoExperiment extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  ExperimentStatus,
  ExperimentSpec
> {
  static readonly kind = "Experiment";
  static readonly namespaced = true;
  static readonly apiBase = "/apis/argoproj.io/v1alpha1/experiments";

  static readonly crd: ArgoApplicationKubeObjectCRD = {
    apiVersions: ["argoproj.io/v1alpha1"],
    plural: "experiments",
    singular: "experiment",
    shortNames: ["exp"],
    title: "Experiments",
  };
}

export class ArgoExperimentApi extends Renderer.K8sApi.KubeApi<ArgoExperiment> {}
export class ArgoExperimentStore extends Renderer.K8sApi.KubeObjectStore<ArgoExperiment, ArgoExperimentApi> {}

let _argoExperimentStore: ArgoExperimentStore | undefined;

export function getArgoExperimentStore(): ArgoExperimentStore {
  if (!_argoExperimentStore) {
    const api = new ArgoExperimentApi({ objectConstructor: ArgoExperiment });
    _argoExperimentStore = new ArgoExperimentStore(api);
    Renderer.K8sApi.apiManager.registerStore(_argoExperimentStore);
  }

  return _argoExperimentStore;
}

export function getExperimentPhase(experiment: ArgoExperiment): string {
  return experiment.status?.phase || "Unknown";
}

export function getExperimentTemplateCount(experiment: ArgoExperiment): number {
  return experiment.spec?.templates?.length ?? 0;
}

export function getExperimentAnalysisCount(experiment: ArgoExperiment): number {
  return experiment.spec?.analyses?.length ?? 0;
}
