import { Renderer } from "@freelensapp/extensions";

import type { IApplication } from "@kubernetes-models/argo-cd/argoproj.io/v1alpha1/Application";

import type { ArgoApplicationKubeObjectCRD } from "../types";

export type ApplicationSpec = IApplication["spec"];
export type ApplicationStatus = IApplication["status"];

export interface ArgoApplicationResourceSyncStatus {
  name: string;
  status: string;
  kind: string;
}

export class ArgoApplication extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  ApplicationStatus,
  ApplicationSpec
> {
  static readonly kind = "Application";
  static readonly namespaced = true;
  static readonly apiBase = "/apis/argoproj.io/v1alpha1/applications";

  // Add operation field at root level
  operation?: IApplication["operation"];

  static readonly crd: ArgoApplicationKubeObjectCRD = {
    apiVersions: ["argoproj.io/v1alpha1"],
    plural: "applications",
    singular: "application",
    shortNames: ["app"],
    title: "Argo Applications",
  };
}

export class ArgoApplicationApi extends Renderer.K8sApi.KubeApi<ArgoApplication> {}
export class ArgoApplicationStore extends Renderer.K8sApi.KubeObjectStore<ArgoApplication, ArgoApplicationApi> {}

let _argoApplicationStore: ArgoApplicationStore | undefined;

export function getArgoApplicationStore(): ArgoApplicationStore {
  if (!_argoApplicationStore) {
    const api = new ArgoApplicationApi({ objectConstructor: ArgoApplication });
    _argoApplicationStore = new ArgoApplicationStore(api);
    Renderer.K8sApi.apiManager.registerStore(_argoApplicationStore);
  }
  return _argoApplicationStore;
}
