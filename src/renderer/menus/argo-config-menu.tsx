import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { argoConfigDialogStore } from "../components/argo-config";
import { isArgoConfigMap, isArgoSecret } from "../k8s/argocd";

const {
  Component: { Icon, MenuItem },
} = Renderer;

export interface ArgoConfigMenuItemProps extends Renderer.Component.KubeObjectMenuProps<any> {
  extension: Renderer.LensExtension;
}

export const ArgoConfigMenuItem = observer((props: ArgoConfigMenuItemProps) => {
  const { object, toolbar } = props;

  if (!object) {
    return null;
  }

  const objectKind = object.kind as string | undefined;
  const matchesSecretKind = !objectKind || objectKind === "Secret";
  const matchesConfigMapKind = !objectKind || objectKind === "ConfigMap";
  const isSecret = matchesSecretKind && isArgoSecret(object);
  const isConfigMap = matchesConfigMapKind && isArgoConfigMap(object);

  if (!isSecret && !isConfigMap) {
    return null;
  }

  // Built-in Freelens toolbar actions already provide edit/delete for Secret/ConfigMap.
  // Keep Argo-specific action in the context menu only to avoid duplicated toolbar icons.
  if (toolbar) {
    return null;
  }

  const handleEdit = () => {
    argoConfigDialogStore.openEdit(object);
  };

  return (
    <MenuItem onClick={handleEdit}>
      <Icon material="settings" interactive={toolbar} title="Edit ArgoCD Config" />
      <span className="title">Edit ArgoCD Config</span>
    </MenuItem>
  );
});
