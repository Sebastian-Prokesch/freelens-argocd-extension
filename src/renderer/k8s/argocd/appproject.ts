import { Renderer } from "@freelensapp/extensions";

import type { IAppProject } from "@kubernetes-models/argo-cd/argoproj.io/v1alpha1/AppProject";

import type { ArgoApplicationKubeObjectCRD } from "../types";

export type AppProjectSpec = IAppProject["spec"];
export type AppProjectStatus = IAppProject["status"];

export class ArgoAppProject extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  AppProjectStatus,
  AppProjectSpec
> {
  static readonly kind = "AppProject";
  static readonly namespaced = true;
  static readonly apiBase = "/apis/argoproj.io/v1alpha1/appprojects";

  static readonly crd: ArgoApplicationKubeObjectCRD = {
    apiVersions: ["argoproj.io/v1alpha1"],
    plural: "appprojects",
    singular: "appproject",
    shortNames: ["appproj", "appprojs"],
    title: "Argo AppProjects",
  };
}

export class ArgoAppProjectApi extends Renderer.K8sApi.KubeApi<ArgoAppProject> {}
export class ArgoAppProjectStore extends Renderer.K8sApi.KubeObjectStore<ArgoAppProject, ArgoAppProjectApi> {}

let _argoAppProjectStore: ArgoAppProjectStore | undefined;

export function getArgoAppProjectStore(): ArgoAppProjectStore {
  if (!_argoAppProjectStore) {
    const api = new ArgoAppProjectApi({ objectConstructor: ArgoAppProject });
    _argoAppProjectStore = new ArgoAppProjectStore(api);
    Renderer.K8sApi.apiManager.registerStore(_argoAppProjectStore);
  }
  return _argoAppProjectStore;
}
