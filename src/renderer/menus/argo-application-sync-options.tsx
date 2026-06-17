import { Renderer } from "@freelensapp/extensions";
import { withErrorPage } from "../components/error-page";
import { applicationSyncDialogStore } from "../components/application-sync";
import { ArgoApplication } from "../k8s/argocd";

const {
  Component: { MenuItem, Icon },
} = Renderer;

export interface ArgoSyncWithOptionsMenuItemProps extends Renderer.Component.KubeObjectMenuProps<ArgoApplication> {
  extension: Renderer.LensExtension;
}

export const ArgoSyncWithOptionsMenuItem = (props: ArgoSyncWithOptionsMenuItemProps) =>
  withErrorPage(props, () => {
    const { object, toolbar } = props;

    if (!object) return <></>;

    const openDialog = () => {
      applicationSyncDialogStore.open(object);
    };

    return (
      <MenuItem onClick={openDialog}>
        <Icon material="tune" interactive={toolbar} title="Sync with options" />
        <span className="title">Adv sync</span>
      </MenuItem>
    );
  });
