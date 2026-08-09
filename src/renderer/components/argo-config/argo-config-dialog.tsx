import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import React from "react";
import {
  createArgoSecretConfig,
  createConfigMapConfig,
  type SecretEditIntent,
  updateArgoSecretConfig,
  updateConfigMapConfig,
} from "../../endpoints/argo-config-endpoints";
import {
  ARGOCD_PART_OF_LABEL,
  ARGOCD_PART_OF_VALUE,
  type ArgoSecretType,
  getRepoAuthMethod,
  getSecretField,
  type LabeledObject,
  secretHasStringOrDataKey,
} from "../../k8s/argocd";
import { runGuardedArgoMutation } from "../../mutations";
import styles from "./argo-config-dialog.module.scss";
import stylesInline from "./argo-config-dialog.module.scss?inline";
import { type ArgoConfigKind, argoConfigDialogStore } from "./argo-config-dialog-store";

const {
  Component: { Button, Checkbox, ConfirmDialog, Dialog, Input },
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
  /** Keyed by Secret key name; checked = remove the stored key on save. */
  clearCredentials: Record<string, boolean>;
}

interface ClusterFormState extends BaseFormState {
  clusterName: string;
  server: string;
  namespaces: string;
  clusterResources: boolean;
  project: string;
  configJson: string;
}

interface ConfigMapEntry {
  id: number;
  key: string;
  value: string;
}

type ConfigMapView = "keyValue" | "json";

interface ConfigMapFormState extends BaseFormState {
  view: ConfigMapView;
  entries: ConfigMapEntry[];
  dataJson: string;
}

type RepoCredentialFormKey =
  | "username"
  | "password"
  | "sshPrivateKey"
  | "githubAppId"
  | "githubAppInstallationId"
  | "githubAppPrivateKey";

interface RepoCredentialField {
  secretKey: string;
  formKey: RepoCredentialFormKey;
  placeholder: string;
  multiLine?: boolean;
  password?: boolean;
}

const AUTH_METHOD_FIELDS: Record<AuthMethod, RepoCredentialField[]> = {
  none: [],
  https: [
    { secretKey: "username", formKey: "username", placeholder: "Username" },
    { secretKey: "password", formKey: "password", placeholder: "Password", password: true },
  ],
  ssh: [{ secretKey: "sshPrivateKey", formKey: "sshPrivateKey", placeholder: "SSH Private Key", multiLine: true }],
  githubApp: [
    { secretKey: "githubAppID", formKey: "githubAppId", placeholder: "GitHub App ID" },
    {
      secretKey: "githubAppInstallationID",
      formKey: "githubAppInstallationId",
      placeholder: "GitHub App Installation ID",
    },
    {
      secretKey: "githubAppPrivateKey",
      formKey: "githubAppPrivateKey",
      placeholder: "GitHub App Private Key",
      multiLine: true,
    },
  ],
};

const AUTH_METHOD_LABELS: Record<AuthMethod, string> = {
  none: "None",
  https: "HTTPS",
  ssh: "SSH",
  githubApp: "GitHub App",
};

/** ConfigMap keys that commonly hold long multiline documents. */
const TALL_CONFIGMAP_KEYS = new Set([
  "dex.config",
  "oidc.config",
  "policy.csv",
  "resource.customizations",
  "ssh_known_hosts",
]);

const defaultNamespace = "argocd";
const defaultClusterConfigJson =
  "{\n" +
  '  "username": "<basic auth username>",\n' +
  '  "password": "<basic auth password>",\n' +
  '  "bearerToken": "<authentication token>",\n' +
  '  "awsAuthConfig": {\n' +
  '    "clusterName": "<eks cluster name>",\n' +
  '    "roleARN": "<arn:aws:iam::<ACCOUNT_ID>:role/<ROLE_NAME>>",\n' +
  '    "profile": "<path to aws profile file>"\n' +
  "  },\n" +
  '  "execProviderConfig": {\n' +
  '    "command": "argocd-k8s-auth",\n' +
  '    "args": ["aws", "--cluster-name", "<eks cluster name>"],\n' +
  '    "env": {\n' +
  '      "AWS_REGION": "<region>",\n' +
  '      "AWS_ACCESS_KEY_ID": "<access key id>",\n' +
  '      "AWS_SECRET_ACCESS_KEY": "<secret access key>",\n' +
  '      "AWS_SESSION_TOKEN": "<session token>"\n' +
  "    },\n" +
  '    "apiVersion": "client.authentication.k8s.io/v1beta1",\n' +
  '    "installHint": "<install hint>"\n' +
  "  },\n" +
  '  "proxyUrl": "https://proxy.example.com:8888",\n' +
  '  "tlsClientConfig": {\n' +
  '    "insecure": false,\n' +
  '    "caData": "<base64 encoded certificate>",\n' +
  '    "certData": "<base64 encoded client cert>",\n' +
  '    "keyData": "<base64 encoded client key>",\n' +
  '    "serverName": "<tls server name>"\n' +
  "  },\n" +
  '  "disableCompression": false\n' +
  "}";

let nextConfigMapEntryId = 1;

const makeConfigMapEntry = (key = "", value = ""): ConfigMapEntry => ({
  id: nextConfigMapEntryId++,
  key,
  value,
});

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
  clearCredentials: {},
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
  view: "keyValue",
  entries: [makeConfigMapEntry()],
  dataJson: '{\n  "key": "value"\n}',
});

const loadRepoFormFromSecret = (secret: LabeledObject | undefined): RepoFormState => {
  const authMethod = secret ? getRepoAuthMethod(secret) : "none";

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
    clearCredentials: {},
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
  const entries = Object.entries(data).map(([key, value]) => makeConfigMapEntry(key, value));

  return {
    name: configMap?.metadata?.name ?? "",
    namespace: configMap?.metadata?.namespace ?? defaultNamespace,
    view: "keyValue",
    entries: entries.length > 0 ? entries : [makeConfigMapEntry()],
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

    for (const field of AUTH_METHOD_FIELDS[repoForm.authMethod]) {
      const value = repoForm[field.formKey];
      if (value) stringData[field.secretKey] = value;
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

const buildRepoSecretEditIntent = (form: RepoFormState, originalAuthMethod: AuthMethod): SecretEditIntent => {
  const set: Record<string, string> = {};
  const remove: string[] = [];

  const metadataFields: Array<[string, string]> = [
    ["url", form.url.trim()],
    ["type", form.type.trim()],
    ["project", form.project.trim()],
  ];

  for (const [key, value] of metadataFields) {
    if (value) {
      set[key] = value;
    } else {
      remove.push(key);
    }
  }

  for (const field of AUTH_METHOD_FIELDS[form.authMethod]) {
    if (form.clearCredentials[field.secretKey]) {
      remove.push(field.secretKey);
      continue;
    }

    const value = form[field.formKey];
    if (value) {
      set[field.secretKey] = value;
    }
  }

  if (form.authMethod !== originalAuthMethod) {
    for (const field of AUTH_METHOD_FIELDS[originalAuthMethod]) {
      if (!remove.includes(field.secretKey) && !(field.secretKey in set)) {
        remove.push(field.secretKey);
      }
    }
  }

  return { set, remove };
};

const buildClusterSecretEditIntent = (form: ClusterFormState): SecretEditIntent => {
  const set: Record<string, string> = {};
  const remove: string[] = [];

  const metadataFields: Array<[string, string]> = [
    ["name", form.clusterName.trim()],
    ["server", form.server.trim()],
    ["namespaces", form.namespaces.trim()],
    ["project", form.project.trim()],
  ];

  for (const [key, value] of metadataFields) {
    if (value) {
      set[key] = value;
    } else {
      remove.push(key);
    }
  }

  set.clusterResources = form.clusterResources ? "true" : "false";
  set.config = form.configJson || "{}";

  return { set, remove };
};

const ensureRequiredField = (value: string, label: string): string => {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }

  return trimmed;
};

const parseJsonObject = (value: string, label: string): Record<string, unknown> => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object.`);
  }

  return parsed as Record<string, unknown>;
};

const parseConfigMapData = (value: string): Record<string, string> => {
  const parsed = parseJsonObject(value, "ConfigMap data");
  const data: Record<string, string> = {};

  for (const [key, entryValue] of Object.entries(parsed)) {
    if (typeof entryValue !== "string") {
      throw new Error(`ConfigMap data key "${key}" must have a string value.`);
    }

    data[key] = entryValue;
  }

  return data;
};

const configMapEntriesToData = (entries: ConfigMapEntry[]): Record<string, string> => {
  const data: Record<string, string> = {};

  for (const entry of entries) {
    const key = entry.key.trim();

    if (!key) {
      if (entry.value) {
        throw new Error("ConfigMap data keys must not be empty.");
      }
      continue;
    }

    if (key in data) {
      throw new Error(`ConfigMap data key "${key}" is duplicated.`);
    }

    data[key] = entry.value;
  }

  return data;
};

export const ArgoConfigDialog = observer(() => {
  const { isOpen, mode, target } = argoConfigDialogStore;
  const isEdit = mode === "edit";
  const [repoForm, setRepoForm] = React.useState<RepoFormState>(emptyRepoForm());
  const [originalAuthMethod, setOriginalAuthMethod] = React.useState<AuthMethod>("none");
  const [clusterForm, setClusterForm] = React.useState<ClusterFormState>(emptyClusterForm());
  const [configMapForm, setConfigMapForm] = React.useState<ConfigMapFormState>(emptyConfigMapForm());
  const [error, setError] = React.useState<string | undefined>();

  React.useEffect(() => {
    if (!isOpen || !target) {
      return;
    }

    if (target.kind === "repository" || target.kind === "repo-creds") {
      const loaded = loadRepoFormFromSecret(target.object);
      setRepoForm(loaded);
      setOriginalAuthMethod(loaded.authMethod);
    }

    if (target.kind === "cluster") {
      setClusterForm(target.object ? loadClusterFormFromSecret(target.object) : emptyClusterForm());
    }

    if (target.kind === "configmap") {
      setConfigMapForm(target.object ? loadConfigMapForm(target.object) : emptyConfigMapForm());
    }

    setError(undefined);
  }, [isOpen, target]);

  if (!target) {
    return null;
  }

  const closeDialog = () => argoConfigDialogStore.close();

  const confirmAuthMethodChange = async (): Promise<boolean> => {
    if (!isEdit || !target.object) {
      return true;
    }

    if (target.kind !== "repository" && target.kind !== "repo-creds") {
      return true;
    }

    if (repoForm.authMethod === originalAuthMethod) {
      return true;
    }

    const droppedKeys = AUTH_METHOD_FIELDS[originalAuthMethod]
      .map((field) => field.secretKey)
      .filter((key) => secretHasStringOrDataKey(target.object as LabeledObject, key));

    if (droppedKeys.length === 0) {
      return true;
    }

    return await ConfirmDialog.confirm({
      labelOk: "Change Auth Method",
      message:
        `Changing the auth method from ${AUTH_METHOD_LABELS[originalAuthMethod]} to ` +
        `${AUTH_METHOD_LABELS[repoForm.authMethod]} will permanently remove the stored ` +
        `${droppedKeys.join(", ")} from this secret. Continue?`,
    });
  };

  const handleSave = async () => {
    setError(undefined);

    if (!(await confirmAuthMethodChange())) {
      return;
    }

    await runGuardedArgoMutation({
      risk: "low",
      actionLabel: mode === "create" ? "Create ArgoCD Config" : "Save ArgoCD Config",
      resourceName: target.kind,
      run: async () => {
        if (target.kind === "configmap") {
          ensureRequiredField(configMapForm.name, "Name");
          ensureRequiredField(configMapForm.namespace, "Namespace");
        }

        if (target.kind === "cluster") {
          ensureRequiredField(clusterForm.name, "Secret name");
          ensureRequiredField(clusterForm.namespace, "Namespace");
        }

        if (target.kind === "repository" || target.kind === "repo-creds") {
          ensureRequiredField(repoForm.name, "Name");
          ensureRequiredField(repoForm.namespace, "Namespace");
        }

        if (target.kind === "cluster") {
          parseJsonObject(clusterForm.configJson, "Cluster config");
        }

        if (target.kind === "configmap") {
          const data =
            configMapForm.view === "json"
              ? parseConfigMapData(configMapForm.dataJson)
              : configMapEntriesToData(configMapForm.entries);
          const name = configMapForm.name.trim();
          const namespace = configMapForm.namespace.trim();
          const labels = {
            ...(target.object?.metadata?.labels ?? {}),
            [ARGOCD_PART_OF_LABEL]: ARGOCD_PART_OF_VALUE,
          };
          if (mode === "create") {
            await createConfigMapConfig(configMapStore as any, {
              name,
              namespace,
              labels,
              data,
            });
          } else if (target.object) {
            await updateConfigMapConfig(configMapStore as any, target.object, {
              name,
              namespace,
              labels,
              data,
            });
          }
        }

        if (target.kind === "repository" || target.kind === "repo-creds" || target.kind === "cluster") {
          const name = target.kind === "cluster" ? clusterForm.name.trim() : repoForm.name.trim();
          const namespace = target.kind === "cluster" ? clusterForm.namespace.trim() : repoForm.namespace.trim();

          if (mode === "create") {
            const stringData = buildSecretStringData(target.kind === "cluster" ? clusterForm : repoForm, target.kind);
            await createArgoSecretConfig(secretsStore as any, {
              name,
              namespace,
              secretType: target.kind,
              stringData,
            });
          } else if (target.object) {
            const intent =
              target.kind === "cluster"
                ? buildClusterSecretEditIntent(clusterForm)
                : buildRepoSecretEditIntent(repoForm, originalAuthMethod);
            await updateArgoSecretConfig(secretsStore as any, target.object, {
              secretType: target.kind,
              intent,
            });
          }
        }

        closeDialog();
      },
      successMessage: "ArgoCD config saved.",
      failureFallback: "Failed to save ArgoCD config.",
      onErrorMessage: (message) => setError(message),
    });
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

  const renderCredentialField = (field: RepoCredentialField) => {
    const cleared = Boolean(repoForm.clearCredentials[field.secretKey]);
    const hasStoredValue = Boolean(
      isEdit && target.object && secretHasStringOrDataKey(target.object as LabeledObject, field.secretKey),
    );
    const placeholder = isEdit && hasStoredValue ? `${field.placeholder} (blank keeps current)` : field.placeholder;

    return (
      <React.Fragment key={field.secretKey}>
        <Input
          value={repoForm[field.formKey]}
          onChange={(value) => setRepoForm({ ...repoForm, [field.formKey]: value })}
          placeholder={placeholder}
          disabled={cleared}
          multiLine={field.multiLine}
          type={field.password ? "password" : undefined}
        />
        {hasStoredValue && (
          <Checkbox
            label={`Clear stored ${field.placeholder}`}
            value={cleared}
            onChange={(checked: boolean) =>
              setRepoForm({
                ...repoForm,
                clearCredentials: { ...repoForm.clearCredentials, [field.secretKey]: checked },
              })
            }
          />
        )}
      </React.Fragment>
    );
  };

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
      {AUTH_METHOD_FIELDS[repoForm.authMethod].map(renderCredentialField)}
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
          onChange={(event) => setClusterForm({ ...clusterForm, clusterResources: event.target.value === "true" })}
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

  const updateConfigMapEntry = (id: number, updates: Partial<Pick<ConfigMapEntry, "key" | "value">>) => {
    setConfigMapForm({
      ...configMapForm,
      entries: configMapForm.entries.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry)),
    });
  };

  const removeConfigMapEntry = (id: number) => {
    const entries = configMapForm.entries.filter((entry) => entry.id !== id);
    setConfigMapForm({
      ...configMapForm,
      entries: entries.length > 0 ? entries : [makeConfigMapEntry()],
    });
  };

  const addConfigMapEntry = () => {
    setConfigMapForm({
      ...configMapForm,
      entries: [...configMapForm.entries, makeConfigMapEntry()],
    });
  };

  const switchConfigMapView = () => {
    setError(undefined);

    try {
      if (configMapForm.view === "keyValue") {
        const data = configMapEntriesToData(configMapForm.entries);
        setConfigMapForm({
          ...configMapForm,
          view: "json",
          dataJson: JSON.stringify(data, null, 2),
        });
      } else {
        const data = parseConfigMapData(configMapForm.dataJson);
        const entries = Object.entries(data).map(([key, value]) => makeConfigMapEntry(key, value));
        setConfigMapForm({
          ...configMapForm,
          view: "keyValue",
          entries: entries.length > 0 ? entries : [makeConfigMapEntry()],
        });
      }
    } catch (switchError) {
      setError(switchError instanceof Error ? switchError.message : "ConfigMap data is invalid.");
    }
  };

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
      {configMapForm.view === "keyValue" ? (
        <>
          {configMapForm.entries.map((entry) => (
            <div className={styles.kvRow} key={entry.id}>
              <div className={styles.kvKey}>
                <Input
                  value={entry.key}
                  onChange={(value) => updateConfigMapEntry(entry.id, { key: value })}
                  placeholder="Key"
                />
              </div>
              <textarea
                className={`${styles.textArea} ${styles.kvValue}`}
                value={entry.value}
                onChange={(event) => updateConfigMapEntry(entry.id, { value: event.target.value })}
                rows={TALL_CONFIGMAP_KEYS.has(entry.key.trim()) ? 10 : 3}
                placeholder="Value"
                aria-label={`Value for ${entry.key.trim() || "new entry"}`}
              />
              <Button onClick={() => removeConfigMapEntry(entry.id)}>Remove</Button>
            </div>
          ))}
          <Button onClick={addConfigMapEntry}>Add Entry</Button>
        </>
      ) : (
        <Input
          value={configMapForm.dataJson}
          onChange={(value) => setConfigMapForm({ ...configMapForm, dataJson: value })}
          placeholder="Data JSON"
          multiLine
        />
      )}
      <Button onClick={switchConfigMapView}>
        {configMapForm.view === "keyValue" ? "Edit as JSON" : "Edit as key/value"}
      </Button>
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
