import { Renderer } from "@freelensapp/extensions";

import type { IRollout } from "@kubernetes-models/argo-rollouts/argoproj.io/v1alpha1/Rollout";

import type { ArgoApplicationKubeObjectCRD } from "../types";

export * from "./analysis-run";
export * from "./analysis-template";
export * from "./cluster-analysis-template";
export * from "./experiment";
export * from "./related";

export type RolloutSpec = IRollout["spec"];
export type RolloutStatus = IRollout["status"];

export class ArgoRollout extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  RolloutStatus,
  RolloutSpec
> {
  static readonly kind = "Rollout";
  static readonly namespaced = true;
  static readonly apiBase = "/apis/argoproj.io/v1alpha1/rollouts";

  static readonly crd: ArgoApplicationKubeObjectCRD = {
    apiVersions: ["argoproj.io/v1alpha1"],
    plural: "rollouts",
    singular: "rollout",
    shortNames: ["ro"],
    title: "Argo Rollouts",
  };
}

export class ArgoRolloutApi extends Renderer.K8sApi.KubeApi<ArgoRollout> {}
export class ArgoRolloutStore extends Renderer.K8sApi.KubeObjectStore<ArgoRollout, ArgoRolloutApi> {}

let _argoRolloutStore: ArgoRolloutStore | undefined;

export { getAbortMergePatch, getRetryMergePatch } from "./actions";
export { ANALYSIS_PHASE_INCONCLUSIVE, getCurrentCanaryStep, isInconclusiveCanaryAnalysis } from "./canary-step";
export {
  buildPromotePatches,
  canShowPromoteAction,
  canShowPromoteFullAction,
  canShowPromoteSkipAllStepsAction,
  canShowPromoteSkipCurrentStepAction,
  getPromotablePauseReasons,
  getPromoteMergePatch,
  PROMOTE_ERRORS,
  type PromoteMergePatch,
  type PromoteOptions,
  requestRolloutPromotion,
  validatePromoteOptions,
} from "./promotion";
export {
  type BlueGreenPromotionState,
  canAbortRollout,
  canRetryRollout,
  type DerivedRolloutState,
  deriveRolloutState,
  getBlueGreenPromotionLabel,
  getBlueGreenPromotionState,
  getBlueGreenTrafficTooltip,
  getRolloutStateLabel,
  getRolloutStateReason,
} from "./state";
export { getRolloutStrategyLabel } from "./strategy";

export function getArgoRolloutStore(): ArgoRolloutStore {
  if (!_argoRolloutStore) {
    const api = new ArgoRolloutApi({ objectConstructor: ArgoRollout });
    _argoRolloutStore = new ArgoRolloutStore(api);
    Renderer.K8sApi.apiManager.registerStore(_argoRolloutStore);
  }
  return _argoRolloutStore;
}
