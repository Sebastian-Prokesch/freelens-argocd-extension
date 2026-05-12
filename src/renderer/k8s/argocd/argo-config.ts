export const ARGOCD_SECRET_TYPE_LABEL = "argocd.argoproj.io/secret-type";
export const ARGOCD_PART_OF_LABEL = "app.kubernetes.io/part-of";
export const ARGOCD_PART_OF_VALUE = "argocd";
export const ARGOCD_NOTIFICATIONS_CONFIGMAP_NAME = "argocd-notifications-cm";
export const ARGOCD_NOTIFICATIONS_SECRET_NAME = "argocd-notifications-secret";
export const ARGOCD_RBAC_CONFIGMAP_NAME = "argocd-rbac-cm";
export const ARGOCD_EDITABLE_CONFIGMAP_NAMES = [
  "argocd-cm",
  "argocd-cmd-params-cm",
  "argocd-ssh-known-hosts-cm",
  "argocd-tls-certs-cm",
  "argocd-gpg-keys-cm",
] as const;

export const ARGOCD_SECRET_TYPES = ["repository", "repo-creds", "cluster"] as const;
export type ArgoSecretType = (typeof ARGOCD_SECRET_TYPES)[number];

export interface LabeledObject {
  metadata?: {
    name?: string;
    namespace?: string;
    labels?: Record<string, string>;
  };
  data?: Record<string, string>;
  stringData?: Record<string, string>;
  type?: string;
  getName: () => string;
  getNs: () => string;
}

export interface ParsedRbacPolicyRule {
  kind: "p" | "g";
  subject: string;
  resourceOrRole: string;
  actionOrGroup: string;
  object: string;
  effect: string;
  raw: string;
}

export interface ParsedRbacPolicy {
  rules: ParsedRbacPolicyRule[];
  parseErrors: string[];
}

export interface NotificationsConfigSummary {
  triggerKeys: string[];
  templateKeys: string[];
  subscriptionEntries: string[];
}

export interface ParsedRepoConnection {
  repositoryType: string;
  protocol: string;
  host: string;
  authMethod: "none" | "https" | "ssh" | "githubApp";
  hasTlsClientConfig: boolean;
}

export interface ParsedClusterConnection {
  protocol: string;
  host: string;
  hasTlsClientConfig: boolean;
  insecureTls: boolean;
  namespaceScope: "cluster" | "namespaced" | "unknown";
}

export const getArgoSecretType = (object: LabeledObject): ArgoSecretType | undefined => {
  const secretType = object.metadata?.labels?.[ARGOCD_SECRET_TYPE_LABEL];

  if (ARGOCD_SECRET_TYPES.includes(secretType as ArgoSecretType)) {
    return secretType as ArgoSecretType;
  }

  return undefined;
};

export const isArgoConfigMap = (object: LabeledObject): boolean =>
  object.metadata?.labels?.[ARGOCD_PART_OF_LABEL] === ARGOCD_PART_OF_VALUE;

export const isEditableArgoConfigMap = (object: LabeledObject): boolean =>
  isArgoConfigMap(object) &&
  ARGOCD_EDITABLE_CONFIGMAP_NAMES.includes(getObjectName(object) as (typeof ARGOCD_EDITABLE_CONFIGMAP_NAMES)[number]);

export const getObjectName = (object: LabeledObject): string => object.metadata?.name ?? object.getName();

export const isArgoNotificationsConfigMap = (object: LabeledObject): boolean =>
  getObjectName(object) === ARGOCD_NOTIFICATIONS_CONFIGMAP_NAME;

export const isArgoNotificationsSecret = (object: LabeledObject): boolean =>
  getObjectName(object) === ARGOCD_NOTIFICATIONS_SECRET_NAME;

export const isArgoRbacConfigMap = (object: LabeledObject): boolean =>
  getObjectName(object) === ARGOCD_RBAC_CONFIGMAP_NAME;

export const isArgoConfigResource = (object: LabeledObject): boolean =>
  isArgoSecret(object) ||
  isEditableArgoConfigMap(object) ||
  isArgoNotificationsConfigMap(object) ||
  isArgoNotificationsSecret(object) ||
  isArgoRbacConfigMap(object);

export const isArgoSecret = (object: LabeledObject): boolean => Boolean(getArgoSecretType(object));

export const decodeBase64 = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  try {
    return Buffer.from(value, "base64").toString("utf8");
  } catch {
    return undefined;
  }
};

export const getSecretField = (secret: LabeledObject, key: string): string | undefined =>
  secret.stringData?.[key] ?? decodeBase64(secret.data?.[key]);

const safeParseJson = (value?: string): Record<string, unknown> | undefined => {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value);

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return undefined;
  }

  return undefined;
};

const parseUrl = (value?: string): URL | undefined => {
  if (!value) {
    return undefined;
  }

  try {
    return new URL(value);
  } catch {
    return undefined;
  }
};

export const getRepoAuthMethod = (secret: LabeledObject): ParsedRepoConnection["authMethod"] => {
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

export const parseRepoConnection = (secret: LabeledObject): ParsedRepoConnection => {
  const repoType = getSecretField(secret, "type") ?? "git";
  const url = getSecretField(secret, "url");
  const parsedUrl = parseUrl(url);
  const config = safeParseJson(getSecretField(secret, "config"));
  const tlsClientConfig = config?.tlsClientConfig;
  const hasTlsClientConfig = Boolean(
    tlsClientConfig &&
      typeof tlsClientConfig === "object" &&
      ("caData" in tlsClientConfig || "certData" in tlsClientConfig || "keyData" in tlsClientConfig),
  );

  return {
    repositoryType: repoType,
    protocol: parsedUrl?.protocol.replace(":", "") ?? (url?.startsWith("ssh://") ? "ssh" : "unknown"),
    host: parsedUrl?.host ?? "N/A",
    authMethod: getRepoAuthMethod(secret),
    hasTlsClientConfig,
  };
};

export const parseClusterConnection = (secret: LabeledObject): ParsedClusterConnection => {
  const server = getSecretField(secret, "server");
  const parsedUrl = parseUrl(server);
  const config = safeParseJson(getSecretField(secret, "config"));
  const tlsClientConfig = config?.tlsClientConfig;
  const hasTlsClientConfig = Boolean(
    tlsClientConfig &&
      typeof tlsClientConfig === "object" &&
      ("caData" in tlsClientConfig || "certData" in tlsClientConfig || "keyData" in tlsClientConfig),
  );
  const insecureTls = Boolean(
    tlsClientConfig &&
      typeof tlsClientConfig === "object" &&
      "insecure" in tlsClientConfig &&
      tlsClientConfig.insecure === true,
  );
  const namespaces = getSecretField(secret, "namespaces");
  const clusterResources = getSecretField(secret, "clusterResources");

  let namespaceScope: ParsedClusterConnection["namespaceScope"] = "unknown";
  if (namespaces) {
    namespaceScope = "namespaced";
  } else if (clusterResources === "true") {
    namespaceScope = "cluster";
  }

  return {
    protocol: parsedUrl?.protocol.replace(":", "") ?? "unknown",
    host: parsedUrl?.host ?? "N/A",
    hasTlsClientConfig,
    insecureTls,
    namespaceScope,
  };
};

export const summarizeNotificationsData = (data: Record<string, string> = {}): NotificationsConfigSummary => {
  const keys = Object.keys(data);

  return {
    triggerKeys: keys.filter((key) => key.startsWith("trigger.")),
    templateKeys: keys.filter((key) => key.startsWith("template.")),
    subscriptionEntries: keys.filter((key) => key === "subscriptions" || key.startsWith("subscriptions.")),
  };
};

export const parseRbacPolicyCsv = (policyCsv?: string): ParsedRbacPolicy => {
  if (!policyCsv) {
    return { rules: [], parseErrors: [] };
  }

  const rules: ParsedRbacPolicyRule[] = [];
  const parseErrors: string[] = [];

  for (const line of policyCsv.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const columns = trimmed.split(",").map((value) => value.trim());
    const kind = columns[0];

    if (kind !== "p" && kind !== "g") {
      parseErrors.push(trimmed);
      continue;
    }

    const [subject = "", resourceOrRole = "", actionOrGroup = "", object = "", effect = ""] = columns.slice(1);
    rules.push({
      kind,
      subject,
      resourceOrRole,
      actionOrGroup,
      object,
      effect,
      raw: trimmed,
    });
  }

  return { rules, parseErrors };
};
