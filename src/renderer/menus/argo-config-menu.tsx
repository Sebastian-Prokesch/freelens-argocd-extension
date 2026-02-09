import { Renderer } from "@freelensapp/extensions";

import { observer } from "mobx-react";

import { argoConfigDialogStore } from "../components/argo-config";
import { isArgoConfigMap, isArgoSecret } from "../k8s/argocd";

const {
  Component: { ConfirmDialog, MenuItem },
  K8sApi: { configMapStore, secretsStore },
} = Renderer;

export interface ArgoConfigMenuItemProps extends Renderer.Component.KubeObjectMenuProps<any> {
  extension: Renderer.LensExtension;
}

export const ArgoConfigMenuItem = observer((props: ArgoConfigMenuItemProps) => {
  const { object } = props;

  if (!object) {
    return null;
  }

  const isSecret = isArgoSecret(object);
  const isConfigMap = isArgoConfigMap(object);

  if (!isSecret && !isConfigMap) {
    return null;
  }

  const handleEdit = () => {
    argoConfigDialogStore.openEdit(object);
  };

  const handleDelete = async () => {
    const confirmed = await ConfirmDialog.confirm({
      message: `Delete ArgoCD config ${object.getName()}?`,
    });

    if (!confirmed) {
      return;
    }

    if (isSecret) {
      await secretsStore.remove(object as any);
    } else {
      await configMapStore.remove(object as any);
    }
  };

  return (
    <>
      <MenuItem onClick={handleEdit}>Edit ArgoCD Config</MenuItem>
      <MenuItem onClick={handleDelete}>Delete ArgoCD Config</MenuItem>
    </>
  );
});

