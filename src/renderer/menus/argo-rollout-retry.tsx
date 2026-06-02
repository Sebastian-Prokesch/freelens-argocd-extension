import { Renderer } from "@freelensapp/extensions";
import { withErrorPage } from "../components/error-page";
import { retryRollout } from "../endpoints/argo-rollout-endpoints";
import { type ArgoRollout, canRetryRollout, getArgoRolloutStore } from "../k8s/rollouts";
import { runGuardedArgoMutation } from "../mutations";

const {
  Component: { Icon, MenuItem },
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
      await runGuardedArgoMutation({
        risk: "low",
        actionLabel: "Retry",
        resourceName: rolloutName,
        run: () => retryRollout(rolloutStore, object),
        successMessage: `Retry requested for ${rolloutName}`,
        failureFallback: "Failed to retry rollout.",
      });
    };

    return (
      <MenuItem onClick={handleRetryRollout}>
        <Icon material="replay" interactive={toolbar} title="Retry" />
        <span className="title">Retry</span>
      </MenuItem>
    );
  });
