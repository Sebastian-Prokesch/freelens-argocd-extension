import { Renderer } from "@freelensapp/extensions";
import { withErrorPage } from "../components/error-page";
import { type ArgoRollout, canAbortRollout, getAbortMergePatch, getArgoRolloutStore } from "../k8s/rollouts";

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

    const abortRollout = async () => {
      const rolloutName = object.getName?.() ?? object.metadata?.name ?? "rollout";
      try {
        await rolloutStore.patch(object, getAbortMergePatch(object), "merge");
        Notifications.ok(`Abort requested for ${rolloutName}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to abort rollout.";
        Notifications.error(message);
      }
    };

    return (
      <MenuItem onClick={abortRollout}>
        <Icon material="stop_circle" interactive={toolbar} title="Abort" />
        <span className="title">Abort</span>
      </MenuItem>
    );
  });
