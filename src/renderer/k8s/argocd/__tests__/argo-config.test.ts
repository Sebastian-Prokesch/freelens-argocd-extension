import {
  ARGOCD_NOTIFICATIONS_CONFIGMAP_NAME,
  ARGOCD_NOTIFICATIONS_SECRET_NAME,
  ARGOCD_PART_OF_LABEL,
  ARGOCD_PART_OF_VALUE,
  ARGOCD_RBAC_CONFIGMAP_NAME,
  ARGOCD_SECRET_TYPE_LABEL,
  getArgoSecretType,
  getRepoAuthMethod,
  getSecretField,
  isArgoConfigMap,
  isArgoConfigResource,
  isArgoNotificationsConfigMap,
  isArgoNotificationsSecret,
  isArgoRbacConfigMap,
  isArgoSecret,
  isEditableArgoConfigMap,
  parseClusterConnection,
  parseRbacPolicyCsv,
  parseRepoConnection,
  redactUrlUserinfoForDisplay,
  secretHasStringOrDataKey,
  summarizeNotificationsData,
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
    expect(isEditableArgoConfigMap(configMap)).toBe(true);
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

  it("detects notifications and rbac config resources", () => {
    const notificationsConfigMap = makeObject({
      metadata: {
        name: ARGOCD_NOTIFICATIONS_CONFIGMAP_NAME,
        namespace: "argocd",
        labels: {},
      },
    });
    const notificationsSecret = makeObject({
      metadata: {
        name: ARGOCD_NOTIFICATIONS_SECRET_NAME,
        namespace: "argocd",
        labels: {},
      },
    });
    const rbacConfigMap = makeObject({
      metadata: {
        name: ARGOCD_RBAC_CONFIGMAP_NAME,
        namespace: "argocd",
        labels: {},
      },
    });

    expect(isArgoNotificationsConfigMap(notificationsConfigMap)).toBe(true);
    expect(isArgoNotificationsSecret(notificationsSecret)).toBe(true);
    expect(isArgoRbacConfigMap(rbacConfigMap)).toBe(true);
    expect(isArgoConfigResource(notificationsConfigMap)).toBe(true);
    expect(isArgoConfigResource(notificationsSecret)).toBe(true);
    expect(isArgoConfigResource(rbacConfigMap)).toBe(true);
  });

  it("marks non-whitelisted Argo configmaps as non-editable", () => {
    const customConfigMap = makeObject({
      metadata: {
        name: "custom-argocd-cm",
        namespace: "argocd",
        labels: {
          [ARGOCD_PART_OF_LABEL]: ARGOCD_PART_OF_VALUE,
        },
      },
    });

    expect(isArgoConfigMap(customConfigMap)).toBe(true);
    expect(isEditableArgoConfigMap(customConfigMap)).toBe(false);
    expect(isArgoConfigResource(customConfigMap)).toBe(false);
  });

  it("parses repository and cluster connection metadata", () => {
    const repoSecret = makeObject({
      stringData: {
        type: "helm",
        url: "https://charts.example.com",
        username: "example-user",
      },
    });
    const clusterSecret = makeObject({
      stringData: {
        server: "https://kubernetes.default.svc",
        namespaces: "apps,ops",
        config: JSON.stringify({
          tlsClientConfig: {
            caData: "base64-certificate",
            insecure: true,
          },
        }),
      },
    });

    expect(parseRepoConnection(repoSecret)).toEqual({
      repositoryType: "helm",
      protocol: "https",
      host: "charts.example.com",
      authMethod: "https",
      hasTlsClientConfig: false,
    });
    expect(parseClusterConnection(clusterSecret)).toEqual({
      protocol: "https",
      host: "kubernetes.default.svc",
      hasTlsClientConfig: true,
      insecureTls: true,
      namespaceScope: "namespaced",
    });
  });

  it("summarizes notifications data and parses rbac policy csv", () => {
    const summary = summarizeNotificationsData({
      "trigger.on-deployed": "value",
      "template.app-sync": "value",
      subscriptions: "- recipients:\n  - slack",
    });
    const parsedPolicy = parseRbacPolicyCsv(
      `
      p, role:readonly, applications, get, */*, allow
      g, sebastian, role:readonly
      invalid-line
    `,
    );

    expect(summary).toEqual({
      triggerKeys: ["trigger.on-deployed"],
      templateKeys: ["template.app-sync"],
      subscriptionEntries: ["subscriptions"],
    });
    expect(parsedPolicy.rules).toHaveLength(2);
    expect(parsedPolicy.rules[0]).toMatchObject({
      kind: "p",
      subject: "role:readonly",
      resourceOrRole: "applications",
      actionOrGroup: "get",
      object: "*/*",
      effect: "allow",
    });
    expect(parsedPolicy.rules[1]).toMatchObject({
      kind: "g",
      subject: "sebastian",
      resourceOrRole: "role:readonly",
    });
    expect(parsedPolicy.parseErrors).toEqual(["invalid-line"]);
    expect(getRepoAuthMethod(makeObject({ stringData: {} }))).toBe("none");
  });

  it("detects repo auth from data keys without decoding base64 material", () => {
    const secret = makeObject({
      data: {
        sshPrivateKey: Buffer.from("not-actually-read", "utf8").toString("base64"),
      },
    });

    expect(secretHasStringOrDataKey(secret, "sshPrivateKey")).toBe(true);
    expect(getRepoAuthMethod(secret)).toBe("ssh");
  });

  it("redacts embedded credentials from common URL shapes", () => {
    expect(redactUrlUserinfoForDisplay("https://user:token@github.com/org/repo.git")).toBe(
      "https://github.com/org/repo.git",
    );
    expect(redactUrlUserinfoForDisplay("https://github.com/plain.git")).toBe("https://github.com/plain.git");
    expect(redactUrlUserinfoForDisplay(undefined)).toBeUndefined();
  });
});
