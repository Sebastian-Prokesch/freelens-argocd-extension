export const ARGOCD_SECRET_TYPE_LABEL = "argocd.argoproj.io/secret-type";
export const ARGOCD_PART_OF_LABEL = "app.kubernetes.io/part-of";
export const ARGOCD_PART_OF_VALUE = "argocd";

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

export const getArgoSecretType = (object: LabeledObject): ArgoSecretType | undefined => {
  const secretType = object.metadata?.labels?.[ARGOCD_SECRET_TYPE_LABEL];

  if (ARGOCD_SECRET_TYPES.includes(secretType as ArgoSecretType)) {
    return secretType as ArgoSecretType;
  }

  return undefined;
};

export const isArgoConfigMap = (object: LabeledObject): boolean =>
  object.metadata?.labels?.[ARGOCD_PART_OF_LABEL] === ARGOCD_PART_OF_VALUE;

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

