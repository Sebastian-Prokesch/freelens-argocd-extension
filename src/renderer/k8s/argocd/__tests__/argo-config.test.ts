import {
  ARGOCD_PART_OF_LABEL,
  ARGOCD_PART_OF_VALUE,
  ARGOCD_SECRET_TYPE_LABEL,
  getArgoSecretType,
  getSecretField,
  isArgoConfigMap,
  isArgoSecret,
} from "../argo-config";

const makeObject = (overrides: Record<string, any> = {}) => ({
  metadata: {
    name: "test",
    namespace: "argocd",
    labels: {},
  },
  getName: () => "test",
  getNs: () => "argocd",
  ...overrides,
});

describe("argo-config helpers", () => {
  it("detects ArgoCD secret types and configmaps", () => {
    const secret = makeObject({
      metadata: {
        name: "repo",
        namespace: "argocd",
        labels: {
          [ARGOCD_SECRET_TYPE_LABEL]: "repository",
        },
      },
    });

    const configMap = makeObject({
      metadata: {
        name: "argocd-cm",
        namespace: "argocd",
        labels: {
          [ARGOCD_PART_OF_LABEL]: ARGOCD_PART_OF_VALUE,
        },
      },
    });

    expect(getArgoSecretType(secret)).toBe("repository");
    expect(isArgoSecret(secret)).toBe(true);
    expect(isArgoConfigMap(configMap)).toBe(true);
  });

  it("reads stringData before data", () => {
    const secret = makeObject({
      stringData: {
        url: "https://example.com",
      },
      data: {
        url: Buffer.from("https://wrong.com", "utf8").toString("base64"),
      },
    });

    expect(getSecretField(secret, "url")).toBe("https://example.com");
  });

  it("decodes base64 data when stringData is missing", () => {
    const secret = makeObject({
      data: {
        url: Buffer.from("https://example.com", "utf8").toString("base64"),
      },
    });

    expect(getSecretField(secret, "url")).toBe("https://example.com");
  });
});
