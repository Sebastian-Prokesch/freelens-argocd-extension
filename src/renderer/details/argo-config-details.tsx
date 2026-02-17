import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import {
  type ArgoSecretType,
  getArgoSecretType,
  getSecretField,
  isArgoConfigMap,
  type LabeledObject,
} from "../k8s/argocd";

const {
  Component: { BadgeBoolean, DrawerItem, DrawerTitle },
} = Renderer;

const getAuthLabel = (secret: LabeledObject): string => {
  if (getSecretField(secret, "sshPrivateKey")) {
    return "SSH";
  }

  if (getSecretField(secret, "githubAppPrivateKey") || getSecretField(secret, "githubAppID")) {
    return "GitHub App";
  }

  if (getSecretField(secret, "username") || getSecretField(secret, "password")) {
    return "HTTPS";
  }

  return "None";
};

const renderSecretDetails = (secret: LabeledObject, secretType: ArgoSecretType) => (
  <>
    <DrawerTitle title="ArgoCD Config" />
    <DrawerItem name="Secret Type">{secretType}</DrawerItem>
    {(secretType === "repository" || secretType === "repo-creds") && (
      <>
        <DrawerItem name="URL">{getSecretField(secret, "url") ?? "N/A"}</DrawerItem>
        <DrawerItem name="Type">{getSecretField(secret, "type") ?? "N/A"}</DrawerItem>
        <DrawerItem name="Project">{getSecretField(secret, "project") ?? "N/A"}</DrawerItem>
        <DrawerItem name="Auth">{getAuthLabel(secret)}</DrawerItem>
      </>
    )}
    {secretType === "cluster" && (
      <>
        <DrawerItem name="Cluster Name">{getSecretField(secret, "name") ?? "N/A"}</DrawerItem>
        <DrawerItem name="Server">{getSecretField(secret, "server") ?? "N/A"}</DrawerItem>
        <DrawerItem name="Namespaces">{getSecretField(secret, "namespaces") ?? "N/A"}</DrawerItem>
        <DrawerItem name="Cluster Resources">
          <BadgeBoolean value={(getSecretField(secret, "clusterResources") ?? "") === "true"} />
        </DrawerItem>
        <DrawerItem name="Project">{getSecretField(secret, "project") ?? "N/A"}</DrawerItem>
      </>
    )}
  </>
);

const renderConfigMapDetails = (configMap: LabeledObject) => {
  const keys = Object.keys(configMap.data ?? {});

  return (
    <>
      <DrawerTitle title="ArgoCD Config" />
      <DrawerItem name="Data Keys">{keys.length ? keys.join(", ") : "N/A"}</DrawerItem>
    </>
  );
};

export interface ArgoConfigDetailsProps extends Renderer.Component.KubeObjectDetailsProps<any> {
  extension: Renderer.LensExtension;
}

export const ArgoConfigDetails = observer((props: ArgoConfigDetailsProps) => {
  const { object } = props;

  if (!object) {
    return null;
  }

  const secretType = getArgoSecretType(object);

  if (secretType) {
    return renderSecretDetails(object, secretType);
  }

  if (isArgoConfigMap(object)) {
    return renderConfigMapDetails(object);
  }

  return null;
});
