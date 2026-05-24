import { Renderer } from "@freelensapp/extensions";
import { withErrorPage } from "../components/error-page";
import { syncApplication } from "../endpoints/argo-application-endpoints";
import { ArgoApplication, getArgoApplicationStore } from "../k8s/argocd";

const {
  Component: { MenuItem, Icon, Notifications },
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
      try {
        await syncApplication(store, object);
        Notifications.ok(`Sync started for ${appName}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to start sync.";
        Notifications.error(message);
      }
    };

    return (
      <MenuItem onClick={sync}>
        <Icon material="sync" interactive={toolbar} title="Sync" />
        <span className="title">Sync</span>
      </MenuItem>
    );
  });
