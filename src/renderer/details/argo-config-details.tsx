import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import {
  getArgoSecretType,
  getObjectName,
  getSecretField,
  isArgoConfigMap,
  isArgoConfigResource,
  isArgoNotificationsConfigMap,
  isArgoNotificationsSecret,
  isArgoRbacConfigMap,
  type LabeledObject,
  type ParsedRbacPolicyRule,
  parseClusterConnection,
  parseRbacPolicyCsv,
  parseRepoConnection,
  summarizeNotificationsData,
} from "../k8s/argocd";

const {
  Component: { BadgeBoolean, DrawerItem, DrawerTitle },
} = Renderer;

const formatRepoAuth = (authMethod: ReturnType<typeof parseRepoConnection>["authMethod"]): string => {
  if (authMethod === "githubApp") {
    return "GitHub App";
  }

  return authMethod.toUpperCase();
};

const renderPolicyRows = (rules: ParsedRbacPolicyRule[]) => {
  if (!rules.length) {
    return "No RBAC rules found.";
  }

  return (
    <div>
      {rules.map((rule) => (
        <div key={rule.raw}>
          {rule.kind} | {rule.subject} | {rule.resourceOrRole} | {rule.actionOrGroup} | {rule.object} | {rule.effect}
        </div>
      ))}
    </div>
  );
};

const renderSecretDetails = (secret: LabeledObject) => {
  const secretType = getArgoSecretType(secret);

  if (isArgoNotificationsSecret(secret)) {
    return (
      <>
        <DrawerTitle title="ArgoCD Notifications Secret" />
        <DrawerItem name="Secret Name">{getObjectName(secret)}</DrawerItem>
        <DrawerItem name="Namespace">{secret.metadata?.namespace ?? secret.getNs()}</DrawerItem>
        <DrawerItem name="Key Count">{Object.keys(secret.data ?? secret.stringData ?? {}).length}</DrawerItem>
      </>
    );
  }

  if (!secretType) {
    return null;
  }

  if (secretType === "repository" || secretType === "repo-creds") {
    const connection = parseRepoConnection(secret);
    const hasCredentialMaterial = connection.authMethod !== "none";
    return (
      <>
        <DrawerTitle title="ArgoCD Config" />
        <DrawerItem name="Secret Type">{secretType}</DrawerItem>
        <DrawerItem name="URL">{getSecretField(secret, "url") ?? "N/A"}</DrawerItem>
        <DrawerItem name="Host">{connection.host}</DrawerItem>
        <DrawerItem name="Protocol">{connection.protocol}</DrawerItem>
        <DrawerItem name="Type">{connection.repositoryType}</DrawerItem>
        <DrawerItem name="Auth Method">{formatRepoAuth(connection.authMethod)}</DrawerItem>
        <DrawerItem name="Credential Material">
          <BadgeBoolean value={hasCredentialMaterial} />
        </DrawerItem>
        <DrawerItem name="TLS Client Config">
          <BadgeBoolean value={connection.hasTlsClientConfig} />
        </DrawerItem>
        <DrawerItem name="Project">{getSecretField(secret, "project") ?? "N/A"}</DrawerItem>
      </>
    );
  }

  const connection = parseClusterConnection(secret);

  return (
    <>
      <DrawerTitle title="ArgoCD Config" />
      <DrawerItem name="Secret Type">{secretType}</DrawerItem>
      <DrawerItem name="Cluster Name">{getSecretField(secret, "name") ?? "N/A"}</DrawerItem>
      <DrawerItem name="Server">{getSecretField(secret, "server") ?? "N/A"}</DrawerItem>
      <DrawerItem name="Host">{connection.host}</DrawerItem>
      <DrawerItem name="Protocol">{connection.protocol}</DrawerItem>
      <DrawerItem name="Namespaces">{getSecretField(secret, "namespaces") ?? "N/A"}</DrawerItem>
      <DrawerItem name="Cluster Resources">
        <BadgeBoolean value={(getSecretField(secret, "clusterResources") ?? "") === "true"} />
      </DrawerItem>
      <DrawerItem name="Scope">{connection.namespaceScope}</DrawerItem>
      <DrawerItem name="TLS Client Config">
        <BadgeBoolean value={connection.hasTlsClientConfig} />
      </DrawerItem>
      <DrawerItem name="Insecure TLS">
        <BadgeBoolean value={connection.insecureTls} />
      </DrawerItem>
      <DrawerItem name="Project">{getSecretField(secret, "project") ?? "N/A"}</DrawerItem>
    </>
  );
};

const renderConfigMapDetails = (configMap: LabeledObject) => {
  const keys = Object.keys(configMap.data ?? {});
  const notificationsSummary = summarizeNotificationsData(configMap.data ?? {});
  const rbacPolicy = parseRbacPolicyCsv(configMap.data?.["policy.csv"]);

  if (isArgoNotificationsConfigMap(configMap)) {
    return (
      <>
        <DrawerTitle title="ArgoCD Notifications" />
        <DrawerItem name="ConfigMap Name">{getObjectName(configMap)}</DrawerItem>
        <DrawerItem name="Triggers">{notificationsSummary.triggerKeys.join(", ") || "N/A"}</DrawerItem>
        <DrawerItem name="Templates">{notificationsSummary.templateKeys.join(", ") || "N/A"}</DrawerItem>
        <DrawerItem name="Subscriptions">{notificationsSummary.subscriptionEntries.join(", ") || "N/A"}</DrawerItem>
      </>
    );
  }

  if (isArgoRbacConfigMap(configMap)) {
    return (
      <>
        <DrawerTitle title="ArgoCD RBAC" />
        <DrawerItem name="ConfigMap Name">{getObjectName(configMap)}</DrawerItem>
        <DrawerItem name="Default Policy">{configMap.data?.["policy.default"] ?? "N/A"}</DrawerItem>
        <DrawerItem name="Scopes">{configMap.data?.scopes ?? "N/A"}</DrawerItem>
        <DrawerItem name="Rules">{renderPolicyRows(rbacPolicy.rules)}</DrawerItem>
        {rbacPolicy.parseErrors.length > 0 && (
          <DrawerItem name="Parse Errors">{rbacPolicy.parseErrors.join(" | ")}</DrawerItem>
        )}
      </>
    );
  }

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

  if (!isArgoConfigResource(object)) {
    return null;
  }

  if (getArgoSecretType(object) || isArgoNotificationsSecret(object)) {
    return renderSecretDetails(object);
  }

  if (isArgoConfigMap(object) || isArgoNotificationsConfigMap(object) || isArgoRbacConfigMap(object)) {
    return renderConfigMapDetails(object);
  }

  return null;
});
