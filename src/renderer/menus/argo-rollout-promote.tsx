import { Renderer } from "@freelensapp/extensions";
import { withErrorPage } from "../components/error-page";
import {
  type ArgoRollout,
  canShowPromoteAction,
  canShowPromoteFullAction,
  canShowPromoteSkipAllStepsAction,
  canShowPromoteSkipCurrentStepAction,
  getArgoRolloutStore,
  requestRolloutPromotion,
} from "../k8s/rollouts";

const {
  Component: { Icon, MenuItem, Notifications },
} = Renderer;

export interface ArgoRolloutPromoteMenuItemProps extends Renderer.Component.KubeObjectMenuProps<ArgoRollout> {
  extension: Renderer.LensExtension;
}

export interface ArgoRolloutPromoteFullMenuItemProps extends Renderer.Component.KubeObjectMenuProps<ArgoRollout> {
  extension: Renderer.LensExtension;
}

export interface ArgoRolloutPromoteSkipCurrentMenuItemProps
  extends Renderer.Component.KubeObjectMenuProps<ArgoRollout> {
  extension: Renderer.LensExtension;
}

export interface ArgoRolloutPromoteSkipAllMenuItemProps extends Renderer.Component.KubeObjectMenuProps<ArgoRollout> {
  extension: Renderer.LensExtension;
}

const rolloutName = (object: ArgoRollout) => object.getName?.() ?? object.metadata?.name ?? "rollout";

export const ArgoRolloutPromoteMenuItem = (props: ArgoRolloutPromoteMenuItemProps) =>
  withErrorPage(props, () => {
    const { object, toolbar } = props;

    if (!object || !canShowPromoteAction(object)) {
      return <></>;
    }

    const rolloutStore = getArgoRolloutStore();

    const onPromote = async () => {
      try {
        await requestRolloutPromotion(rolloutStore, object, {});
        Notifications.ok(`Promote requested for ${rolloutName(object)}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to promote rollout.";
        Notifications.error(message);
      }
    };

    return (
      <MenuItem onClick={onPromote}>
        <Icon material="trending_up" interactive={toolbar} title="Promote" />
        <span className="title">Promote</span>
      </MenuItem>
    );
  });

export const ArgoRolloutPromoteFullMenuItem = (props: ArgoRolloutPromoteFullMenuItemProps) =>
  withErrorPage(props, () => {
    const { object, toolbar } = props;

    if (!object || !canShowPromoteFullAction(object)) {
      return <></>;
    }

    const rolloutStore = getArgoRolloutStore();

    const onPromoteFull = async () => {
      try {
        await requestRolloutPromotion(rolloutStore, object, { full: true });
        Notifications.ok(`Full promote requested for ${rolloutName(object)}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fully promote rollout.";
        Notifications.error(message);
      }
    };

    return (
      <MenuItem onClick={onPromoteFull}>
        <Icon material="flash_on" interactive={toolbar} title="Promote full" />
        <span className="title">Promote full</span>
      </MenuItem>
    );
  });

export const ArgoRolloutPromoteSkipCurrentMenuItem = (props: ArgoRolloutPromoteSkipCurrentMenuItemProps) =>
  withErrorPage(props, () => {
    const { object, toolbar } = props;

    if (!object || !canShowPromoteSkipCurrentStepAction(object)) {
      return <></>;
    }

    const rolloutStore = getArgoRolloutStore();

    const onSkipCurrent = async () => {
      try {
        await requestRolloutPromotion(rolloutStore, object, { skipCurrentStep: true });
        Notifications.ok(`Skip current step requested for ${rolloutName(object)}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to skip current step.";
        Notifications.error(message);
      }
    };

    return (
      <MenuItem onClick={onSkipCurrent}>
        <Icon material="navigate_next" interactive={toolbar} title="Promote skip current step" />
        <span className="title">Promote (skip current step)</span>
      </MenuItem>
    );
  });

export const ArgoRolloutPromoteSkipAllMenuItem = (props: ArgoRolloutPromoteSkipAllMenuItemProps) =>
  withErrorPage(props, () => {
    const { object, toolbar } = props;

    if (!object || !canShowPromoteSkipAllStepsAction(object)) {
      return <></>;
    }

    const rolloutStore = getArgoRolloutStore();

    const onSkipAll = async () => {
      try {
        await requestRolloutPromotion(rolloutStore, object, { skipAllSteps: true });
        Notifications.ok(`Skip all steps requested for ${rolloutName(object)}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to skip all steps.";
        Notifications.error(message);
      }
    };

    return (
      <MenuItem onClick={onSkipAll}>
        <Icon material="last_page" interactive={toolbar} title="Promote skip all steps" />
        <span className="title">Promote (skip all steps)</span>
      </MenuItem>
    );
  });
