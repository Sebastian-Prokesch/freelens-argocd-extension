import { Renderer } from "@freelensapp/extensions";

export interface NamespacedObjectReference {
  name: string;
  namespace?: string;
}

export interface ArgoApplicationKubeObjectCRD extends Renderer.K8sApi.LensExtensionKubeObjectCRD {
  title: string;
}
