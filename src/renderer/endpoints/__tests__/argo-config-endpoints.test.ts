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
    expect(buildConfigMapUpdatePatch(configMapInput)).toEqual({
      metadata: {
        labels: { "app.kubernetes.io/part-of": "argocd" },
      },
      data: { "application.instanceLabelKey": "argocd.argoproj.io/instance" },
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
    const object = {
      metadata: { name: "argocd-cm", namespace: "argocd" },
      getName: () => "argocd-cm",
      getNs: () => "argocd",
    } as any;

    await updateConfigMapConfig(store, object, configMapInput);

    expect(patch).toHaveBeenCalledWith(object, buildConfigMapUpdatePatch(configMapInput), "merge");
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

  it("buildArgoSecretUpdatePatch returns expected json patch operations", () => {
    const existing = {
      metadata: {
        name: "repo-secret",
        namespace: "argocd",
        labels: { existing: "label" },
      },
      getName: () => "repo-secret",
      getNs: () => "argocd",
    } as any;

    expect(buildArgoSecretUpdatePatch(existing, "repository", secretInput.stringData)).toEqual([
      { op: "add", path: "/metadata/name", value: "repo-secret" },
      { op: "add", path: "/metadata/namespace", value: "argocd" },
      {
        op: "add",
        path: "/metadata/labels",
        value: { existing: "label", "argocd.argoproj.io/secret-type": "repository" },
      },
      { op: "add", path: "/data", value: {} },
      { op: "add", path: "/stringData", value: secretInput.stringData },
    ]);
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
    const object = {
      metadata: {
        name: "repo-secret",
        namespace: "argocd",
        labels: { existing: "label" },
      },
      getName: () => "repo-secret",
      getNs: () => "argocd",
    } as any;

    await updateArgoSecretConfig(store, object, secretInput);

    expect(patch).toHaveBeenCalledWith(
      object,
      buildArgoSecretUpdatePatch(object, "repository", secretInput.stringData),
      "json",
    );
  });

  it("propagates store errors", async () => {
    const error = new Error("boom");
    const store = { create: jest.fn().mockRejectedValueOnce(error), patch: jest.fn() } as any;

    await expect(createConfigMapConfig(store, configMapInput)).rejects.toThrow("boom");
  });
});
