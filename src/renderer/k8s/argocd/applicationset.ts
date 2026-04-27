import { Renderer } from "@freelensapp/extensions";

import type { IApplicationSet } from "@kubernetes-models/argo-cd/argoproj.io/v1alpha1/ApplicationSet";

import type { ArgoApplicationKubeObjectCRD } from "../types";

export type ApplicationSetSpec = IApplicationSet["spec"];
export type ApplicationSetStatus = IApplicationSet["status"];

export class ArgoApplicationSet extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  ApplicationSetStatus,
  ApplicationSetSpec
> {
  static readonly kind = "ApplicationSet";
  static readonly namespaced = true;
  static readonly apiBase = "/apis/argoproj.io/v1alpha1/applicationsets";

  static readonly crd: ArgoApplicationKubeObjectCRD = {
    apiVersions: ["argoproj.io/v1alpha1"],
    plural: "applicationsets",
    singular: "applicationset",
    shortNames: ["appset", "appsets"],
    title: "Argo ApplicationSets",
  };
}

export class ArgoApplicationSetApi extends Renderer.K8sApi.KubeApi<ArgoApplicationSet> {}
export class ArgoApplicationSetStore extends Renderer.K8sApi.KubeObjectStore<
  ArgoApplicationSet,
  ArgoApplicationSetApi
> {}

let _argoApplicationSetStore: ArgoApplicationSetStore | undefined;

export function getArgoApplicationSetStore(): ArgoApplicationSetStore {
  if (!_argoApplicationSetStore) {
    const api = new ArgoApplicationSetApi({ objectConstructor: ArgoApplicationSet });
    _argoApplicationSetStore = new ArgoApplicationSetStore(api);
    Renderer.K8sApi.apiManager.registerStore(_argoApplicationSetStore);
  }
  return _argoApplicationSetStore;
}
