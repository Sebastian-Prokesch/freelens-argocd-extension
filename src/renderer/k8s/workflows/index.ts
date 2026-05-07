import { Renderer } from "@freelensapp/extensions";

import type { IClusterWorkflowTemplate } from "@kubernetes-models/argo-workflows/argoproj.io/v1alpha1/ClusterWorkflowTemplate";
import type { ICronWorkflow } from "@kubernetes-models/argo-workflows/argoproj.io/v1alpha1/CronWorkflow";
import type { IWorkflow } from "@kubernetes-models/argo-workflows/argoproj.io/v1alpha1/Workflow";
import type { IWorkflowTemplate } from "@kubernetes-models/argo-workflows/argoproj.io/v1alpha1/WorkflowTemplate";

import type { ArgoApplicationKubeObjectCRD } from "../types";

export type WorkflowSpec = IWorkflow["spec"];
export type WorkflowStatus = IWorkflow["status"];
export type CronWorkflowSpec = ICronWorkflow["spec"];
export type CronWorkflowStatus = ICronWorkflow["status"];
export type WorkflowTemplateSpec = IWorkflowTemplate["spec"];
export type ClusterWorkflowTemplateSpec = IClusterWorkflowTemplate["spec"];

export class ArgoWorkflow extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  WorkflowStatus,
  WorkflowSpec
> {
  static readonly kind = "Workflow";
  static readonly namespaced = true;
  static readonly apiBase = "/apis/argoproj.io/v1alpha1/workflows";

  static readonly crd: ArgoApplicationKubeObjectCRD = {
    apiVersions: ["argoproj.io/v1alpha1"],
    plural: "workflows",
    singular: "workflow",
    shortNames: ["wf"],
    title: "Workflows",
  };
}

export class ArgoCronWorkflow extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  CronWorkflowStatus,
  CronWorkflowSpec
> {
  static readonly kind = "CronWorkflow";
  static readonly namespaced = true;
  static readonly apiBase = "/apis/argoproj.io/v1alpha1/cronworkflows";

  static readonly crd: ArgoApplicationKubeObjectCRD = {
    apiVersions: ["argoproj.io/v1alpha1"],
    plural: "cronworkflows",
    singular: "cronworkflow",
    shortNames: ["cwf"],
    title: "CronWorkflows",
  };
}

export class ArgoWorkflowTemplate extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  Record<string, never>,
  WorkflowTemplateSpec
> {
  static readonly kind = "WorkflowTemplate";
  static readonly namespaced = true;
  static readonly apiBase = "/apis/argoproj.io/v1alpha1/workflowtemplates";

  static readonly crd: ArgoApplicationKubeObjectCRD = {
    apiVersions: ["argoproj.io/v1alpha1"],
    plural: "workflowtemplates",
    singular: "workflowtemplate",
    shortNames: ["wftmpl"],
    title: "WorkflowTemplates",
  };
}

export class ArgoClusterWorkflowTemplate extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  Record<string, never>,
  ClusterWorkflowTemplateSpec
> {
  static readonly kind = "ClusterWorkflowTemplate";
  static readonly namespaced = false;
  static readonly apiBase = "/apis/argoproj.io/v1alpha1/clusterworkflowtemplates";

  static readonly crd: ArgoApplicationKubeObjectCRD = {
    apiVersions: ["argoproj.io/v1alpha1"],
    plural: "clusterworkflowtemplates",
    singular: "clusterworkflowtemplate",
    shortNames: ["cwftmpl"],
    title: "ClusterWorkflowTemplates",
  };
}

export class ArgoWorkflowApi extends Renderer.K8sApi.KubeApi<ArgoWorkflow> {}
export class ArgoCronWorkflowApi extends Renderer.K8sApi.KubeApi<ArgoCronWorkflow> {}
export class ArgoWorkflowTemplateApi extends Renderer.K8sApi.KubeApi<ArgoWorkflowTemplate> {}
export class ArgoClusterWorkflowTemplateApi extends Renderer.K8sApi.KubeApi<ArgoClusterWorkflowTemplate> {}

export class ArgoWorkflowStore extends Renderer.K8sApi.KubeObjectStore<ArgoWorkflow, ArgoWorkflowApi> {}
export class ArgoCronWorkflowStore extends Renderer.K8sApi.KubeObjectStore<ArgoCronWorkflow, ArgoCronWorkflowApi> {}
export class ArgoWorkflowTemplateStore extends Renderer.K8sApi.KubeObjectStore<
  ArgoWorkflowTemplate,
  ArgoWorkflowTemplateApi
> {}
export class ArgoClusterWorkflowTemplateStore extends Renderer.K8sApi.KubeObjectStore<
  ArgoClusterWorkflowTemplate,
  ArgoClusterWorkflowTemplateApi
> {}

let _argoWorkflowStore: ArgoWorkflowStore | undefined;
let _argoCronWorkflowStore: ArgoCronWorkflowStore | undefined;
let _argoWorkflowTemplateStore: ArgoWorkflowTemplateStore | undefined;
let _argoClusterWorkflowTemplateStore: ArgoClusterWorkflowTemplateStore | undefined;

export * from "./actions";
export * from "./state";

export function getArgoWorkflowStore(): ArgoWorkflowStore {
  if (!_argoWorkflowStore) {
    const api = new ArgoWorkflowApi({ objectConstructor: ArgoWorkflow });
    _argoWorkflowStore = new ArgoWorkflowStore(api);
    Renderer.K8sApi.apiManager.registerStore(_argoWorkflowStore);
  }
  return _argoWorkflowStore;
}

export function getArgoCronWorkflowStore(): ArgoCronWorkflowStore {
  if (!_argoCronWorkflowStore) {
    const api = new ArgoCronWorkflowApi({ objectConstructor: ArgoCronWorkflow });
    _argoCronWorkflowStore = new ArgoCronWorkflowStore(api);
    Renderer.K8sApi.apiManager.registerStore(_argoCronWorkflowStore);
  }
  return _argoCronWorkflowStore;
}

export function getArgoWorkflowTemplateStore(): ArgoWorkflowTemplateStore {
  if (!_argoWorkflowTemplateStore) {
    const api = new ArgoWorkflowTemplateApi({ objectConstructor: ArgoWorkflowTemplate });
    _argoWorkflowTemplateStore = new ArgoWorkflowTemplateStore(api);
    Renderer.K8sApi.apiManager.registerStore(_argoWorkflowTemplateStore);
  }
  return _argoWorkflowTemplateStore;
}

export function getArgoClusterWorkflowTemplateStore(): ArgoClusterWorkflowTemplateStore {
  if (!_argoClusterWorkflowTemplateStore) {
    const api = new ArgoClusterWorkflowTemplateApi({ objectConstructor: ArgoClusterWorkflowTemplate });
    _argoClusterWorkflowTemplateStore = new ArgoClusterWorkflowTemplateStore(api);
    Renderer.K8sApi.apiManager.registerStore(_argoClusterWorkflowTemplateStore);
  }
  return _argoClusterWorkflowTemplateStore;
}
