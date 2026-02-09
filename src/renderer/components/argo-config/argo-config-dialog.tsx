import { Renderer } from "@freelensapp/extensions";

import React from "react";

import {
  ARGOCD_PART_OF_LABEL,
  ARGOCD_PART_OF_VALUE,
  ARGOCD_SECRET_TYPE_LABEL,
  getSecretField,
  type ArgoSecretType,
  type LabeledObject,
} from "../../k8s/argocd";
import { argoConfigDialogStore, type ArgoConfigKind } from "./argo-config-dialog-store";
import styles from "./argo-config-dialog.module.scss";
import stylesInline from "./argo-config-dialog.module.scss?inline";

const { observer } = global.MobxReact;

const {
  Component: { Button, Dialog, Input, Notifications },
  K8sApi: { configMapStore, secretsStore },
} = Renderer;

type AuthMethod = "none" | "https" | "ssh" | "githubApp";

interface BaseFormState {
  name: string;
  namespace: string;
}

interface RepoFormState extends BaseFormState {
  url: string;
  type: string;
  project: string;
  authMethod: AuthMethod;
  username: string;
  password: string;
  sshPrivateKey: string;
  githubAppId: string;
  githubAppInstallationId: string;
  githubAppPrivateKey: string;
}

interface ClusterFormState extends BaseFormState {
  clusterName: string;
  server: string;
  namespaces: string;
  clusterResources: boolean;
  project: string;
  configJson: string;
}

interface ConfigMapFormState extends BaseFormState {
  dataJson: string;
}

const defaultNamespace = "argocd";
const defaultClusterConfigJson =
  "{\n" +
  "  \"username\": \"<basic auth username>\",\n" +
  "  \"password\": \"<basic auth password>\",\n" +
  "  \"bearerToken\": \"<authentication token>\",\n" +
  "  \"awsAuthConfig\": {\n" +
  "    \"clusterName\": \"<eks cluster name>\",\n" +
  "    \"roleARN\": \"<arn:aws:iam::<ACCOUNT_ID>:role/<ROLE_NAME>>\",\n" +
  "    \"profile\": \"<path to aws profile file>\"\n" +
  "  },\n" +
  "  \"execProviderConfig\": {\n" +
  "    \"command\": \"argocd-k8s-auth\",\n" +
  "    \"args\": [\"aws\", \"--cluster-name\", \"<eks cluster name>\"],\n" +
  "    \"env\": {\n" +
  "      \"AWS_REGION\": \"<region>\",\n" +
  "      \"AWS_ACCESS_KEY_ID\": \"<access key id>\",\n" +
  "      \"AWS_SECRET_ACCESS_KEY\": \"<secret access key>\",\n" +
  "      \"AWS_SESSION_TOKEN\": \"<session token>\"\n" +
  "    },\n" +
  "    \"apiVersion\": \"client.authentication.k8s.io/v1beta1\",\n" +
  "    \"installHint\": \"<install hint>\"\n" +
  "  },\n" +
  "  \"proxyUrl\": \"https://proxy.example.com:8888\",\n" +
  "  \"tlsClientConfig\": {\n" +
  "    \"insecure\": false,\n" +
  "    \"caData\": \"<base64 encoded certificate>\",\n" +
  "    \"certData\": \"<base64 encoded client cert>\",\n" +
  "    \"keyData\": \"<base64 encoded client key>\",\n" +
  "    \"serverName\": \"<tls server name>\"\n" +
  "  },\n" +
  "  \"disableCompression\": false\n" +
  "}";

const emptyRepoForm = (): RepoFormState => ({
  name: "",
  namespace: defaultNamespace,
  url: "",
  type: "git",
  project: "",
  authMethod: "none",
  username: "",
  password: "",
  sshPrivateKey: "",
  githubAppId: "",
  githubAppInstallationId: "",
  githubAppPrivateKey: "",
});

const emptyClusterForm = (): ClusterFormState => ({
  name: "",
  namespace: defaultNamespace,
  clusterName: "",
  server: "",
  namespaces: "",
  clusterResources: false,
  project: "",
  configJson: defaultClusterConfigJson,
});

const emptyConfigMapForm = (): ConfigMapFormState => ({
  name: "",
  namespace: defaultNamespace,
  dataJson: "{\n  \"key\": \"value\"\n}",
});

const getAuthMethod = (secret: LabeledObject | undefined): AuthMethod => {
  if (!secret) {
    return "none";
  }

  if (getSecretField(secret, "sshPrivateKey")) {
    return "ssh";
  }

  if (getSecretField(secret, "githubAppPrivateKey") || getSecretField(secret, "githubAppID")) {
    return "githubApp";
  }

  if (getSecretField(secret, "username") || getSecretField(secret, "password")) {
    return "https";
  }

  return "none";
};

const loadRepoFormFromSecret = (secret: LabeledObject | undefined): RepoFormState => {
  const authMethod = getAuthMethod(secret);

  return {
    name: secret?.metadata?.name ?? "",
    namespace: secret?.metadata?.namespace ?? defaultNamespace,
    url: getSecretField(secret ?? ({} as LabeledObject), "url") ?? "",
    type: getSecretField(secret ?? ({} as LabeledObject), "type") ?? "git",
    project: getSecretField(secret ?? ({} as LabeledObject), "project") ?? "",
    authMethod,
    username: "",
    password: "",
    sshPrivateKey: "",
    githubAppId: "",
    githubAppInstallationId: "",
    githubAppPrivateKey: "",
  };
};

const loadClusterFormFromSecret = (secret: LabeledObject | undefined): ClusterFormState => {
  const configRaw = getSecretField(secret ?? ({} as LabeledObject), "config") ?? defaultClusterConfigJson;

  return {
    name: secret?.metadata?.name ?? "",
    namespace: secret?.metadata?.namespace ?? defaultNamespace,
    clusterName: getSecretField(secret ?? ({} as LabeledObject), "name") ?? "",
    server: getSecretField(secret ?? ({} as LabeledObject), "server") ?? "",
    namespaces: getSecretField(secret ?? ({} as LabeledObject), "namespaces") ?? "",
    clusterResources: (getSecretField(secret ?? ({} as LabeledObject), "clusterResources") ?? "") === "true",
    project: getSecretField(secret ?? ({} as LabeledObject), "project") ?? "",
    configJson: configRaw,
  };
};

const loadConfigMapForm = (configMap: LabeledObject | undefined): ConfigMapFormState => {
  const data = configMap?.data ?? {};

  return {
    name: configMap?.metadata?.name ?? "",
    namespace: configMap?.metadata?.namespace ?? defaultNamespace,
    dataJson: JSON.stringify(data, null, 2),
  };
};

const buildSecretStringData = (form: RepoFormState | ClusterFormState, secretType: ArgoSecretType) => {
  const stringData: Record<string, string> = {};

  if (secretType === "repository" || secretType === "repo-creds") {
    const repoForm = form as RepoFormState;
    if (repoForm.url) stringData.url = repoForm.url;
    if (repoForm.type) stringData.type = repoForm.type;
    if (repoForm.project) stringData.project = repoForm.project;

    if (repoForm.authMethod === "https") {
      if (repoForm.username) stringData.username = repoForm.username;
      if (repoForm.password) stringData.password = repoForm.password;
    }

    if (repoForm.authMethod === "ssh") {
      if (repoForm.sshPrivateKey) stringData.sshPrivateKey = repoForm.sshPrivateKey;
    }

    if (repoForm.authMethod === "githubApp") {
      if (repoForm.githubAppId) stringData.githubAppID = repoForm.githubAppId;
      if (repoForm.githubAppInstallationId) stringData.githubAppInstallationID = repoForm.githubAppInstallationId;
      if (repoForm.githubAppPrivateKey) stringData.githubAppPrivateKey = repoForm.githubAppPrivateKey;
    }
  }

  if (secretType === "cluster") {
    const clusterForm = form as ClusterFormState;
    if (clusterForm.clusterName) stringData.name = clusterForm.clusterName;
    if (clusterForm.server) stringData.server = clusterForm.server;
    if (clusterForm.namespaces) stringData.namespaces = clusterForm.namespaces;
    if (clusterForm.project) stringData.project = clusterForm.project;
    stringData.clusterResources = clusterForm.clusterResources ? "true" : "false";
    stringData.config = clusterForm.configJson || "{}";
  }

  return stringData;
};

  const getSecretName = (secret: LabeledObject) => secret.metadata?.name ?? secret.getName();
  const getSecretNamespace = (secret: LabeledObject) => secret.metadata?.namespace ?? secret.getNs();

export const ArgoConfigDialog = observer(() => {
  const { isOpen, mode, target } = argoConfigDialogStore;
  const isEdit = mode === "edit";
  const [repoForm, setRepoForm] = React.useState<RepoFormState>(emptyRepoForm());
  const [clusterForm, setClusterForm] = React.useState<ClusterFormState>(emptyClusterForm());
  const [configMapForm, setConfigMapForm] = React.useState<ConfigMapFormState>(emptyConfigMapForm());
  const [error, setError] = React.useState<string | undefined>();

  React.useEffect(() => {
    if (!isOpen || !target) {
      return;
    }

    if (target.kind === "repository" || target.kind === "repo-creds") {
      setRepoForm(loadRepoFormFromSecret(target.object));
    }

    if (target.kind === "cluster") {
      setClusterForm(target.object ? loadClusterFormFromSecret(target.object) : emptyClusterForm());
    }

    if (target.kind === "configmap") {
      setConfigMapForm(loadConfigMapForm(target.object));
    }

    setError(undefined);
  }, [isOpen, target]);

  if (!target) {
    return null;
  }

  const closeDialog = () => argoConfigDialogStore.close();

  const validateJson = (value: string, label: string) => {
    try {
      JSON.parse(value);
    } catch (err) {
      throw new Error(`${label} must be valid JSON.`);
    }
  };

  const handleSave = async () => {
    try {
      setError(undefined);

      if (target.kind === "configmap") {
        validateJson(configMapForm.dataJson, "ConfigMap data");
      }

      if (target.kind === "cluster") {
        validateJson(clusterForm.configJson, "Cluster config");
      }

      if (target.kind === "configmap") {
        const data = JSON.parse(configMapForm.dataJson) as Record<string, string>;
        const labels = {
          ...(target.object?.metadata?.labels ?? {}),
          [ARGOCD_PART_OF_LABEL]: ARGOCD_PART_OF_VALUE,
        };
        const base = {
          apiVersion: "v1",
          kind: "ConfigMap",
          metadata: {
            name: configMapForm.name,
            namespace: configMapForm.namespace,
            labels,
          },
          data,
        };

        if (mode === "create") {
          await configMapStore.create({ name: configMapForm.name, namespace: configMapForm.namespace }, base);
        } else if (target.object) {
          await configMapStore.patch(target.object as any, base as any, "merge");
        }
      }

      if (target.kind === "repository" || target.kind === "repo-creds" || target.kind === "cluster") {
        const stringData = buildSecretStringData(
          target.kind === "cluster" ? clusterForm : repoForm,
          target.kind,
        );
        const base = {
          apiVersion: "v1",
          kind: "Secret",
          metadata: {
            name: target.kind === "cluster" ? clusterForm.name : repoForm.name,
            namespace: target.kind === "cluster" ? clusterForm.namespace : repoForm.namespace,
            labels: {
              [ARGOCD_SECRET_TYPE_LABEL]: target.kind,
            },
          },
          type: "Opaque",
          stringData,
        };

        if (mode === "create") {
          await secretsStore.create(
            {
              name: base.metadata.name,
              namespace: base.metadata.namespace,
            },
            base as any,
          );
        } else if (target.object) {
          const secretName = getSecretName(target.object);
          const secretNamespace = getSecretNamespace(target.object);
          await secretsStore.patch(
            target.object as any,
            {
              metadata: {
                name: secretName,
                namespace: secretNamespace,
                labels: {
                  ...(target.object.metadata?.labels ?? {}),
                  [ARGOCD_SECRET_TYPE_LABEL]: target.kind,
                },
              },
              type: "Opaque" as any,
              stringData,
            } as any,
            "merge",
          );
        }
      }

      closeDialog();
      Notifications.ok("ArgoCD config saved.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save ArgoCD config.";
      setError(message);
      Notifications.error(message);
    }
  };

  const title = (() => {
    if (target.kind === "repository") {
      return mode === "create" ? "Create Repository" : "Edit Repository";
    }
    if (target.kind === "repo-creds") {
      return mode === "create" ? "Create Repo Credentials" : "Edit Repo Credentials";
    }
    if (target.kind === "cluster") {
      return mode === "create" ? "Create Cluster" : "Edit Cluster";
    }
    return mode === "create" ? "Create ArgoCD Config" : "Edit ArgoCD Config";
  })();

  const renderRepoFields = (kind: ArgoConfigKind) => (
    <>
      <Input
        value={repoForm.name}
        onChange={(value) => setRepoForm({ ...repoForm, name: value })}
        placeholder="Name"
        disabled={isEdit}
      />
      <Input
        value={repoForm.namespace}
        onChange={(value) => setRepoForm({ ...repoForm, namespace: value })}
        placeholder="Namespace"
        disabled={isEdit}
      />
      <Input
        value={repoForm.url}
        onChange={(value) => setRepoForm({ ...repoForm, url: value })}
        placeholder={kind === "repo-creds" ? "URL Prefix" : "Repository URL"}
      />
      <Input
        value={repoForm.type}
        onChange={(value) => setRepoForm({ ...repoForm, type: value })}
        placeholder="Type (git, helm, oci)"
      />
      <Input
        value={repoForm.project}
        onChange={(value) => setRepoForm({ ...repoForm, project: value })}
        placeholder="Project (optional)"
      />
      <div className="input-group">
        <label htmlFor="argo-auth-method">Auth Method</label>
        <select
          id="argo-auth-method"
          value={repoForm.authMethod}
          onChange={(event) => setRepoForm({ ...repoForm, authMethod: event.target.value as AuthMethod })}
        >
          <option value="none">None</option>
          <option value="https">HTTPS</option>
          <option value="ssh">SSH</option>
          <option value="githubApp">GitHub App</option>
        </select>
      </div>
      {repoForm.authMethod === "https" && (
        <>
          <Input
            value={repoForm.username}
            onChange={(value) => setRepoForm({ ...repoForm, username: value })}
            placeholder="Username"
          />
          <Input
            value={repoForm.password}
            onChange={(value) => setRepoForm({ ...repoForm, password: value })}
            placeholder="Password"
            type="password"
          />
        </>
      )}
      {repoForm.authMethod === "ssh" && (
        <Input
          value={repoForm.sshPrivateKey}
          onChange={(value) => setRepoForm({ ...repoForm, sshPrivateKey: value })}
          placeholder="SSH Private Key"
          multiLine
        />
      )}
      {repoForm.authMethod === "githubApp" && (
        <>
          <Input
            value={repoForm.githubAppId}
            onChange={(value) => setRepoForm({ ...repoForm, githubAppId: value })}
            placeholder="GitHub App ID"
          />
          <Input
            value={repoForm.githubAppInstallationId}
            onChange={(value) => setRepoForm({ ...repoForm, githubAppInstallationId: value })}
            placeholder="GitHub App Installation ID"
          />
          <Input
            value={repoForm.githubAppPrivateKey}
            onChange={(value) => setRepoForm({ ...repoForm, githubAppPrivateKey: value })}
            placeholder="GitHub App Private Key"
            multiLine
          />
        </>
      )}
    </>
  );

  const renderClusterFields = () => (
    <>
      <Input
        value={clusterForm.name}
        onChange={(value) => setClusterForm({ ...clusterForm, name: value })}
        placeholder="Secret Name"
        disabled={isEdit}
      />
      <Input
        value={clusterForm.namespace}
        onChange={(value) => setClusterForm({ ...clusterForm, namespace: value })}
        placeholder="Namespace"
        disabled={isEdit}
      />
      <Input
        value={clusterForm.clusterName}
        onChange={(value) => setClusterForm({ ...clusterForm, clusterName: value })}
        placeholder="Cluster Name"
      />
      <Input
        value={clusterForm.server}
        onChange={(value) => setClusterForm({ ...clusterForm, server: value })}
        placeholder="API Server URL"
      />
      <Input
        value={clusterForm.namespaces}
        onChange={(value) => setClusterForm({ ...clusterForm, namespaces: value })}
        placeholder="Namespaces (comma-separated)"
      />
      <div className="input-group">
        <label htmlFor="argo-cluster-resources">Cluster Resources</label>
        <select
          id="argo-cluster-resources"
          value={clusterForm.clusterResources ? "true" : "false"}
          onChange={(event) =>
            setClusterForm({ ...clusterForm, clusterResources: event.target.value === "true" })
          }
        >
          <option value="false">false</option>
          <option value="true">true</option>
        </select>
      </div>
      <Input
        value={clusterForm.project}
        onChange={(value) => setClusterForm({ ...clusterForm, project: value })}
        placeholder="Project (optional)"
      />
      <div className="input-group">
        <label htmlFor="argo-cluster-config">Cluster Config (JSON)</label>
        <textarea
          id="argo-cluster-config"
          className={styles.textArea}
          value={clusterForm.configJson}
          onChange={(event) => setClusterForm({ ...clusterForm, configJson: event.target.value })}
          rows={12}
        />
      </div>
    </>
  );

  const renderConfigMapFields = () => (
    <>
      <Input
        value={configMapForm.name}
        onChange={(value) => setConfigMapForm({ ...configMapForm, name: value })}
        placeholder="Name"
        disabled={isEdit}
      />
      <Input
        value={configMapForm.namespace}
        onChange={(value) => setConfigMapForm({ ...configMapForm, namespace: value })}
        placeholder="Namespace"
        disabled={isEdit}
      />
      <Input
        value={configMapForm.dataJson}
        onChange={(value) => setConfigMapForm({ ...configMapForm, dataJson: value })}
        placeholder="Data JSON"
        multiLine
      />
    </>
  );

  return (
    <Dialog isOpen={isOpen} close={closeDialog}>
      <>
        <style>{stylesInline}</style>
        <div className={styles.dialogContent}>
          <div className="flex gaps column">
            <h3 className={styles.dialogHeader}>{title}</h3>
            {error && <div className={styles.dialogError}>{error}</div>}
          {target.kind === "repository" && renderRepoFields(target.kind)}
          {target.kind === "repo-creds" && renderRepoFields(target.kind)}
          {target.kind === "cluster" && renderClusterFields()}
          {target.kind === "configmap" && renderConfigMapFields()}
            <div className={styles.dialogActions}>
              <Button onClick={closeDialog}>Cancel</Button>
              <Button primary onClick={handleSave}>
                {mode === "create" ? "Create" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </>
    </Dialog>
  );
});

