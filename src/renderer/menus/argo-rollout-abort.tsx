import { Renderer } from "@freelensapp/extensions";
import { withErrorPage } from "../components/error-page";
import { abortRollout } from "../endpoints/argo-rollout-endpoints";
import { getMutationErrorMessage } from "../endpoints/mutation-errors";
import { type ArgoRollout, canAbortRollout, getArgoRolloutStore } from "../k8s/rollouts";

const {
  Component: { Icon, MenuItem, Notifications },
} = Renderer;

export interface ArgoRolloutAbortMenuItemProps extends Renderer.Component.KubeObjectMenuProps<ArgoRollout> {
  extension: Renderer.LensExtension;
}

export const ArgoRolloutAbortMenuItem = (props: ArgoRolloutAbortMenuItemProps) =>
  withErrorPage(props, () => {
    const { object, toolbar } = props;

    if (!object || !canAbortRollout(object)) {
      return <></>;
    }

    const rolloutStore = getArgoRolloutStore();

    const handleAbortRollout = async () => {
      const rolloutName = object.getName?.() ?? object.metadata?.name ?? "rollout";
      try {
        await abortRollout(rolloutStore, object);
        Notifications.ok(`Abort requested for ${rolloutName}`);
      } catch (error) {
        const message = getMutationErrorMessage(error, "Failed to abort rollout.");
        Notifications.error(message);
      }
    };

    return (
      <MenuItem onClick={handleAbortRollout}>
        <Icon material="stop_circle" interactive={toolbar} title="Abort" />
        <span className="title">Abort</span>
      </MenuItem>
    );
  });
