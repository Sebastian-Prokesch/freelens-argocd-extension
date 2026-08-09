import {
  buildArgoSecretCreateResource,
  buildArgoSecretUpdatePatch,
  buildConfigMapCreateResource,
  buildConfigMapUpdatePatch,
  createArgoSecretConfig,
  createConfigMapConfig,
  updateArgoSecretConfig,
  updateConfigMapConfig,
} from "../argo-config-endpoints";

describe("argo-config-endpoints", () => {
  const configMapInput = {
    name: "argocd-cm",
    namespace: "argocd",
    labels: { "app.kubernetes.io/part-of": "argocd" },
    data: { "application.instanceLabelKey": "argocd.argoproj.io/instance" },
  };

  const secretInput = {
    name: "repo-secret",
    namespace: "argocd",
    secretType: "repository" as const,
    stringData: {
      url: "https://github.com/example/repo.git",
      type: "git",
    },
  };

  const makeConfigMap = (data: Record<string, string>) =>
    ({
      metadata: { name: "argocd-cm", namespace: "argocd" },
      data,
      getName: () => "argocd-cm",
      getNs: () => "argocd",
    }) as any;

  const makeSecret = (data: Record<string, string>) =>
    ({
      metadata: {
        name: "repo-secret",
        namespace: "argocd",
        labels: { existing: "label" },
      },
      data,
      getName: () => "repo-secret",
      getNs: () => "argocd",
    }) as any;

  const labelsOp = {
    op: "add",
    path: "/metadata/labels",
    value: { existing: "label", "argocd.argoproj.io/secret-type": "repository" },
  };

  it("buildConfigMapCreateResource returns expected create payload", () => {
    expect(buildConfigMapCreateResource(configMapInput)).toEqual({
      apiVersion: "v1",
      kind: "ConfigMap",
      metadata: {
        name: "argocd-cm",
        namespace: "argocd",
        labels: { "app.kubernetes.io/part-of": "argocd" },
      },
      data: { "application.instanceLabelKey": "argocd.argoproj.io/instance" },
    });
  });

  it("buildConfigMapUpdatePatch returns expected merge patch", () => {
    const configMap = makeConfigMap({ "application.instanceLabelKey": "old-value" });

    expect(buildConfigMapUpdatePatch(configMap, configMapInput)).toEqual({
      metadata: {
        labels: { "app.kubernetes.io/part-of": "argocd" },
      },
      data: { "application.instanceLabelKey": "argocd.argoproj.io/instance" },
    });
  });

  it("buildConfigMapUpdatePatch nulls out keys removed from data", () => {
    const configMap = makeConfigMap({
      "application.instanceLabelKey": "argocd.argoproj.io/instance",
      "dex.config": "connectors: []",
    });

    expect(buildConfigMapUpdatePatch(configMap, configMapInput)).toEqual({
      metadata: {
        labels: { "app.kubernetes.io/part-of": "argocd" },
      },
      data: {
        "application.instanceLabelKey": "argocd.argoproj.io/instance",
        "dex.config": null,
      },
    });
  });

  it("createConfigMapConfig calls store.create with expected args", async () => {
    const create = jest.fn().mockResolvedValueOnce(undefined);
    const store = { create, patch: jest.fn() } as any;

    await createConfigMapConfig(store, configMapInput);

    expect(create).toHaveBeenCalledWith(
      { name: "argocd-cm", namespace: "argocd" },
      buildConfigMapCreateResource(configMapInput),
    );
  });

  it("updateConfigMapConfig calls store.patch with merge strategy", async () => {
    const patch = jest.fn().mockResolvedValueOnce(undefined);
    const store = { create: jest.fn(), patch } as any;
    const object = makeConfigMap({ "application.instanceLabelKey": "old-value" });

    await updateConfigMapConfig(store, object, configMapInput);

    expect(patch).toHaveBeenCalledWith(object, buildConfigMapUpdatePatch(object, configMapInput), "merge");
  });

  it("buildArgoSecretCreateResource returns expected create payload", () => {
    expect(buildArgoSecretCreateResource(secretInput)).toEqual({
      apiVersion: "v1",
      kind: "Secret",
      metadata: {
        name: "repo-secret",
        namespace: "argocd",
        labels: { "argocd.argoproj.io/secret-type": "repository" },
      },
      type: "Opaque",
      stringData: {
        url: "https://github.com/example/repo.git",
        type: "git",
      },
    });
  });

  it("metadata-only edit leaves stored credentials and unknown keys untouched", () => {
    const existing = makeSecret({
      url: "b2xkLXVybA==",
      password: "c2VjcmV0",
      sshPrivateKey: "a2V5",
      customUnknownKey: "dmFsdWU=",
    });

    const ops = buildArgoSecretUpdatePatch(existing, "repository", {
      set: { url: "https://github.com/example/repo.git", type: "git" },
      remove: [],
    });

    expect(ops).toEqual([
      labelsOp,
      { op: "remove", path: "/data/url" },
      {
        op: "add",
        path: "/stringData",
        value: { url: "https://github.com/example/repo.git", type: "git" },
      },
    ]);

    const touchedPaths = ops.map((op) => op.path);
    expect(touchedPaths).not.toContain("/data/password");
    expect(touchedPaths).not.toContain("/data/sshPrivateKey");
    expect(touchedPaths).not.toContain("/data/customUnknownKey");
    expect(touchedPaths).not.toContain("/data");
  });

  it("credential replacement removes the stale base64 entry for that key only", () => {
    const existing = makeSecret({ url: "b2xkLXVybA==", username: "dXNlcg==", password: "c2VjcmV0" });

    const ops = buildArgoSecretUpdatePatch(existing, "repository", {
      set: { url: "https://github.com/example/repo.git", password: "new-password" },
      remove: [],
    });

    expect(ops).toEqual([
      labelsOp,
      { op: "remove", path: "/data/url" },
      { op: "remove", path: "/data/password" },
      {
        op: "add",
        path: "/stringData",
        value: { url: "https://github.com/example/repo.git", password: "new-password" },
      },
    ]);
  });

  it("explicit clear removes existing data and stringData entries", () => {
    const existing = makeSecret({ password: "c2VjcmV0" });
    existing.stringData = { password: "plain" };

    const ops = buildArgoSecretUpdatePatch(existing, "repository", {
      set: {},
      remove: ["password"],
    });

    expect(ops).toEqual([
      labelsOp,
      { op: "remove", path: "/data/password" },
      { op: "remove", path: "/stringData/password" },
    ]);
  });

  it("skips remove ops for keys the secret does not have", () => {
    const existing = makeSecret({ url: "b2xkLXVybA==" });

    const ops = buildArgoSecretUpdatePatch(existing, "repository", {
      set: {},
      remove: ["password", "project"],
    });

    expect(ops).toEqual([labelsOp]);
  });

  it("auth-method transition removes old credentials and sets new ones", () => {
    const existing = makeSecret({ username: "dXNlcg==", password: "c2VjcmV0" });

    const ops = buildArgoSecretUpdatePatch(existing, "repository", {
      set: { sshPrivateKey: "ssh-key-material" },
      remove: ["username", "password"],
    });

    expect(ops).toEqual([
      labelsOp,
      { op: "remove", path: "/data/username" },
      { op: "remove", path: "/data/password" },
      { op: "add", path: "/stringData", value: { sshPrivateKey: "ssh-key-material" } },
    ]);
  });

  it("set wins when a key appears in both set and remove", () => {
    const existing = makeSecret({ password: "c2VjcmV0" });

    const ops = buildArgoSecretUpdatePatch(existing, "repository", {
      set: { password: "new-password" },
      remove: ["password"],
    });

    expect(ops).toEqual([
      labelsOp,
      { op: "remove", path: "/data/password" },
      { op: "add", path: "/stringData", value: { password: "new-password" } },
    ]);
  });

  it("escapes JSON pointer special characters in removed keys", () => {
    const existing = makeSecret({ "weird/key~name": "dmFsdWU=" });

    const ops = buildArgoSecretUpdatePatch(existing, "repository", {
      set: {},
      remove: ["weird/key~name"],
    });

    expect(ops).toEqual([labelsOp, { op: "remove", path: "/data/weird~1key~0name" }]);
  });

  it("createArgoSecretConfig calls store.create with expected args", async () => {
    const create = jest.fn().mockResolvedValueOnce(undefined);
    const store = { create, patch: jest.fn() } as any;

    await createArgoSecretConfig(store, secretInput);

    expect(create).toHaveBeenCalledWith(
      { name: "repo-secret", namespace: "argocd" },
      buildArgoSecretCreateResource(secretInput),
    );
  });

  it("updateArgoSecretConfig calls store.patch with json strategy", async () => {
    const patch = jest.fn().mockResolvedValueOnce(undefined);
    const store = { create: jest.fn(), patch } as any;
    const object = makeSecret({ password: "c2VjcmV0" });
    const intent = { set: { url: "https://github.com/example/repo.git" }, remove: [] };

    await updateArgoSecretConfig(store, object, { secretType: "repository", intent });

    expect(patch).toHaveBeenCalledWith(object, buildArgoSecretUpdatePatch(object, "repository", intent), "json");
  });

  it("propagates store errors", async () => {
    const error = new Error("boom");
    const store = { create: jest.fn().mockRejectedValueOnce(error), patch: jest.fn() } as any;

    await expect(createConfigMapConfig(store, configMapInput)).rejects.toThrow("boom");
  });
});
