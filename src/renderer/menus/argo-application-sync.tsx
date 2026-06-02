import { Renderer } from "@freelensapp/extensions";
import { withErrorPage } from "../components/error-page";
import { syncApplication } from "../endpoints/argo-application-endpoints";
import { ArgoApplication, getArgoApplicationStore } from "../k8s/argocd";
import { runGuardedArgoMutation } from "../mutations";

const {
  Component: { MenuItem, Icon },
} = Renderer;

export interface ArgoSyncMenuItemProps extends Renderer.Component.KubeObjectMenuProps<ArgoApplication> {
  extension: Renderer.LensExtension;
}

export const ArgoSyncMenuItem = (props: ArgoSyncMenuItemProps) =>
  withErrorPage(props, () => {
    const { object, toolbar } = props;

    if (!object) return <></>;

    const store = getArgoApplicationStore();

    const sync = async () => {
      const appName = object.getName?.() ?? object.metadata?.name ?? "application";
      await runGuardedArgoMutation({
        risk: "low",
        actionLabel: "Sync",
        resourceName: appName,
        run: () => syncApplication(store, object),
        successMessage: `Sync requested for ${appName}`,
        failureFallback: "Failed to start sync.",
      });
    };

    return (
      <MenuItem onClick={sync}>
        <Icon material="sync" interactive={toolbar} title="Sync" />
        <span className="title">Sync</span>
      </MenuItem>
    );
  });
