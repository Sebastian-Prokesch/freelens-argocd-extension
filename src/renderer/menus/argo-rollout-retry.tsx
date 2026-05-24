import { Renderer } from "@freelensapp/extensions";
import { withErrorPage } from "../components/error-page";
import { retryRollout } from "../endpoints/argo-rollout-endpoints";
import { type ArgoRollout, canRetryRollout, getArgoRolloutStore } from "../k8s/rollouts";

const {
  Component: { Icon, MenuItem, Notifications },
} = Renderer;

export interface ArgoRolloutRetryMenuItemProps extends Renderer.Component.KubeObjectMenuProps<ArgoRollout> {
  extension: Renderer.LensExtension;
}

export const ArgoRolloutRetryMenuItem = (props: ArgoRolloutRetryMenuItemProps) =>
  withErrorPage(props, () => {
    const { object, toolbar } = props;

    if (!object || !canRetryRollout(object)) {
      return <></>;
    }

    const rolloutStore = getArgoRolloutStore();

    const handleRetryRollout = async () => {
      const rolloutName = object.getName?.() ?? object.metadata?.name ?? "rollout";
      try {
        await retryRollout(rolloutStore, object);
        Notifications.ok(`Retry requested for ${rolloutName}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to retry rollout.";
        Notifications.error(message);
      }
    };

    return (
      <MenuItem onClick={handleRetryRollout}>
        <Icon material="replay" interactive={toolbar} title="Retry" />
        <span className="title">Retry</span>
      </MenuItem>
    );
  });
