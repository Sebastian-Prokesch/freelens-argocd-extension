import { Renderer } from "@freelensapp/extensions";
import { withErrorPage } from "../components/error-page";
import { abortRollout } from "../endpoints/argo-rollout-endpoints";
import { type ArgoRollout, canAbortRollout, getArgoRolloutStore } from "../k8s/rollouts";
import { getAbortRolloutConfirmCopy, runGuardedArgoMutation } from "../mutations";

const {
  Component: { Icon, MenuItem },
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
      await runGuardedArgoMutation({
        risk: "destructive",
        actionLabel: "Abort",
        resourceName: rolloutName,
        run: () => abortRollout(rolloutStore, object),
        successMessage: `Abort requested for ${rolloutName}`,
        failureFallback: "Failed to abort rollout.",
        confirm: getAbortRolloutConfirmCopy(rolloutName),
      });
    };

    return (
      <MenuItem onClick={handleAbortRollout}>
        <Icon material="stop_circle" interactive={toolbar} title="Abort" />
        <span className="title">Abort</span>
      </MenuItem>
    );
  });
