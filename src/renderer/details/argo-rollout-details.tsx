import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { withErrorPage } from "../components/error-page";
import {
  type ArgoAnalysisRun,
  type ArgoRollout,
  canAbortRollout,
  canRetryRollout,
  canShowPromoteFullAction,
  canShowPromoteSkipAllStepsAction,
  canShowPromoteSkipCurrentStepAction,
  deriveRolloutState,
  getAbortMergePatch,
  getAnalysisRunPhase,
  getAnalysisRunsForRollout,
  getArgoAnalysisRunStore,
  getArgoRolloutStore,
  getBlueGreenPromotionLabel,
  getBlueGreenPromotionState,
  getRetryMergePatch,
  getRolloutStateLabel,
  getRolloutStateReason,
  getRolloutStrategyLabel,
  requestRolloutPromotion,
} from "../k8s/rollouts";
import { formatOptionalValue } from "../utils";

const {
  Component: { Button, DrawerItem, DrawerTitle, Gutter, Notifications, WithTooltip },
  Navigation: { getDetailsUrl },
} = Renderer;

export interface ArgoRolloutDetailsProps extends Renderer.Component.KubeObjectDetailsProps<ArgoRollout> {
  extension: Renderer.LensExtension;
}

export const ArgoRolloutDetails = observer((props: ArgoRolloutDetailsProps) => {
  const { object } = props;
  const analysisRunStore = getArgoAnalysisRunStore();
  const analysisRunWatches = useRef<(() => void)[]>([]);
  const rolloutNamespace = object.getNs?.() ?? object.metadata?.namespace;

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        await analysisRunStore.loadAll({ namespaces: rolloutNamespace ? [rolloutNamespace] : [] });
        if (!isMounted) {
          return;
        }

        analysisRunWatches.current.push(analysisRunStore.subscribe());
      } catch {
        // Errors are surfaced by the list section state ("No AnalysisRuns") and extension notifications elsewhere.
      }
    })();

    return () => {
      isMounted = false;
      for (const unsubscribe of analysisRunWatches.current) {
        unsubscribe();
      }
      analysisRunWatches.current = [];
    };
  }, [analysisRunStore, rolloutNamespace]);

  return withErrorPage(props, () => {
    const spec = object.spec;
    const status = object.status;
    const rolloutStore = getArgoRolloutStore();

    const paused =
      spec?.paused === true || (status?.pauseConditions?.length ?? 0) > 0 || status?.controllerPause === true;
    const derivedState = deriveRolloutState(object);
    const rolloutStateLabel = getRolloutStateLabel(object);
    const rolloutStateReason = getRolloutStateReason(object);
    const showPromoteAction = derivedState === "paused_promotable";
    const showPromoteFullAction = canShowPromoteFullAction(object);
    const showPromoteSkipCurrent = canShowPromoteSkipCurrentStepAction(object);
    const showPromoteSkipAll = canShowPromoteSkipAllStepsAction(object);
    const showAbortAction = canAbortRollout(object);
    const showRetryAction = canRetryRollout(object);
    const blueGreenState = getBlueGreenPromotionState(object);
    const isBlueGreen = blueGreenState !== "not_bluegreen";
    const analysisRuns = getAnalysisRunsForRollout(object, (analysisRunStore.items as ArgoAnalysisRun[]) ?? []);

    const rolloutDisplayName = object.getName?.() ?? object.metadata?.name ?? "rollout";

    const promoteRollout = async () => {
      try {
        await requestRolloutPromotion(rolloutStore, object, {});
        Notifications.ok(`Promote requested for ${rolloutDisplayName}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to promote rollout.";
        Notifications.error(message);
      }
    };

    const promoteFullRollout = async () => {
      try {
        await requestRolloutPromotion(rolloutStore, object, { full: true });
        Notifications.ok(`Full promote requested for ${rolloutDisplayName}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fully promote rollout.";
        Notifications.error(message);
      }
    };

    const promoteSkipCurrentRollout = async () => {
      try {
        await requestRolloutPromotion(rolloutStore, object, { skipCurrentStep: true });
        Notifications.ok(`Skip current step requested for ${rolloutDisplayName}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to skip current step.";
        Notifications.error(message);
      }
    };

    const promoteSkipAllRollout = async () => {
      try {
        await requestRolloutPromotion(rolloutStore, object, { skipAllSteps: true });
        Notifications.ok(`Skip all steps requested for ${rolloutDisplayName}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to skip all steps.";
        Notifications.error(message);
      }
    };

    const abortRollout = async () => {
      try {
        await rolloutStore.patch(object, getAbortMergePatch(object), "merge");
        Notifications.ok(`Abort requested for ${object.getName?.() ?? object.metadata?.name ?? "rollout"}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to abort rollout.";
        Notifications.error(message);
      }
    };

    const retryRollout = async () => {
      try {
        await rolloutStore.patch(object, getRetryMergePatch(object), "merge");
        Notifications.ok(`Retry requested for ${object.getName?.() ?? object.metadata?.name ?? "rollout"}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to retry rollout.";
        Notifications.error(message);
      }
    };

    return (
      <>
        <DrawerTitle>Rollout</DrawerTitle>
        <DrawerItem name="Strategy">
          <WithTooltip>{getRolloutStrategyLabel(spec?.strategy)}</WithTooltip>
        </DrawerItem>
        <DrawerItem name="Replicas (spec)">{formatOptionalValue(spec?.replicas)}</DrawerItem>
        <DrawerItem name="Replicas (status)">{formatOptionalValue(status?.replicas)}</DrawerItem>
        <DrawerItem name="Updated">{formatOptionalValue(status?.updatedReplicas)}</DrawerItem>
        <DrawerItem name="Ready">{formatOptionalValue(status?.readyReplicas)}</DrawerItem>
        <DrawerItem name="Available">{formatOptionalValue(status?.availableReplicas)}</DrawerItem>
        <DrawerItem name="Phase">{formatOptionalValue(status?.phase)}</DrawerItem>
        <DrawerItem name="State">{rolloutStateLabel}</DrawerItem>
        <DrawerItem name="State reason">
          <WithTooltip>{rolloutStateReason}</WithTooltip>
        </DrawerItem>
        <DrawerItem name="Paused">{paused ? "Yes" : "No"}</DrawerItem>
        {showPromoteAction ||
        showPromoteFullAction ||
        showPromoteSkipCurrent ||
        showPromoteSkipAll ||
        showAbortAction ||
        showRetryAction ? (
          <DrawerItem name="Actions">
            {showPromoteAction ? <Button onClick={promoteRollout}>Promote</Button> : null}
            {showPromoteFullAction ? <Button onClick={promoteFullRollout}>Promote full</Button> : null}
            {showPromoteSkipCurrent ? <Button onClick={promoteSkipCurrentRollout}>Skip current step</Button> : null}
            {showPromoteSkipAll ? <Button onClick={promoteSkipAllRollout}>Skip all steps</Button> : null}
            {showAbortAction ? <Button onClick={abortRollout}>Abort</Button> : null}
            {showRetryAction ? <Button onClick={retryRollout}>Retry</Button> : null}
          </DrawerItem>
        ) : null}
        <DrawerItem name="Current pod hash">{formatOptionalValue(status?.currentPodHash)}</DrawerItem>
        <DrawerItem name="Stable RS">{formatOptionalValue(status?.stableRS)}</DrawerItem>
        <DrawerItem name="Current step index">{formatOptionalValue(status?.currentStepIndex)}</DrawerItem>
        <DrawerItem name="Observed generation">{formatOptionalValue(status?.observedGeneration)}</DrawerItem>
        <DrawerItem name="Message">
          <WithTooltip>{formatOptionalValue(status?.message)}</WithTooltip>
        </DrawerItem>

        {isBlueGreen ? (
          <>
            <Gutter size="md" />
            <DrawerTitle>BlueGreen Status</DrawerTitle>
            <DrawerItem name="Promotion state">{getBlueGreenPromotionLabel(object)}</DrawerItem>
            <DrawerItem name="Active selector">{formatOptionalValue(status?.blueGreen?.activeSelector)}</DrawerItem>
            <DrawerItem name="Preview selector">{formatOptionalValue(status?.blueGreen?.previewSelector)}</DrawerItem>
            <DrawerItem name="Stable RS">{formatOptionalValue(status?.stableRS)}</DrawerItem>
            <DrawerItem name="Current pod hash">{formatOptionalValue(status?.currentPodHash)}</DrawerItem>
          </>
        ) : null}

        <Gutter size="md" />

        <DrawerTitle>Conditions</DrawerTitle>
        {(status?.conditions?.length ?? 0) === 0 ? (
          <DrawerItem name="Summary">None</DrawerItem>
        ) : (
          status?.conditions?.map((condition, index) => (
            <DrawerItem key={`${condition.type}-${index}`} name={condition.type ?? `Condition ${index + 1}`}>
              <WithTooltip>
                {condition.status} — {condition.reason ?? condition.message ?? "no details"}
              </WithTooltip>
            </DrawerItem>
          ))
        )}

        <Gutter size="md" />
        <DrawerTitle>Related AnalysisRuns</DrawerTitle>
        {analysisRuns.length === 0 ? (
          <DrawerItem name="Summary">None</DrawerItem>
        ) : (
          analysisRuns.map((analysisRun) => {
            const analysisRunName = analysisRun.getName();
            const detailsUrl = getDetailsUrl(
              analysisRunStore.api.formatUrlForNotListing({
                namespace: analysisRun.getNs(),
                name: analysisRunName,
              }),
            );

            return (
              <DrawerItem key={analysisRunName} name={analysisRunName}>
                <Link to={detailsUrl}>
                  <WithTooltip>{getAnalysisRunPhase(analysisRun)}</WithTooltip>
                </Link>
              </DrawerItem>
            );
          })
        )}
      </>
    );
  });
});
