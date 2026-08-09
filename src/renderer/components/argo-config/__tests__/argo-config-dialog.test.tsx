import { Renderer } from "@freelensapp/extensions";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ArgoConfigDialog } from "../argo-config-dialog";
import { argoConfigDialogStore } from "../argo-config-dialog-store";

const setInputValue = (placeholder: string, value: string) => {
  fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } });
};

const b64 = (value: string) => Buffer.from(value, "utf8").toString("base64");

const makeRepoSecret = (data: Record<string, string>) =>
  ({
    metadata: {
      name: "repo-secret",
      namespace: "argocd",
      labels: { "argocd.argoproj.io/secret-type": "repository" },
    },
    data,
    getName: () => "repo-secret",
    getNs: () => "argocd",
  }) as any;

const makeArgoConfigMap = (data: Record<string, string>) =>
  ({
    metadata: {
      name: "argocd-cm",
      namespace: "argocd",
      labels: { "app.kubernetes.io/part-of": "argocd" },
    },
    data,
    getName: () => "argocd-cm",
    getNs: () => "argocd",
  }) as any;

describe("ArgoConfigDialog", () => {
  beforeEach(() => {
    argoConfigDialogStore.close();
    (Renderer.K8sApi.secretsStore.create as jest.Mock).mockReset();
    (Renderer.K8sApi.secretsStore.patch as jest.Mock).mockReset();
    (Renderer.K8sApi.configMapStore.create as jest.Mock).mockReset();
    (Renderer.K8sApi.configMapStore.patch as jest.Mock).mockReset();
    (Renderer.Component.Notifications.ok as jest.Mock).mockReset();
    (Renderer.Component.Notifications.error as jest.Mock).mockReset();
    (Renderer.Component.ConfirmDialog.confirm as jest.Mock).mockClear();
  });

  it("creates repository secret in create mode", async () => {
    argoConfigDialogStore.openCreate("repository");

    render(<ArgoConfigDialog />);

    setInputValue("Name", "repo-secret");
    setInputValue("Namespace", "argocd");
    setInputValue("Repository URL", "https://github.com/example/repo.git");
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(Renderer.K8sApi.secretsStore.create).toHaveBeenCalledWith(
        { name: "repo-secret", namespace: "argocd" },
        expect.objectContaining({
          metadata: expect.objectContaining({
            name: "repo-secret",
            namespace: "argocd",
            labels: { "argocd.argoproj.io/secret-type": "repository" },
          }),
          stringData: expect.objectContaining({
            url: "https://github.com/example/repo.git",
            type: "git",
          }),
        }),
      ),
    );
    await waitFor(() => expect(Renderer.Component.Notifications.ok).toHaveBeenCalledWith("ArgoCD config saved."));
  });

  it("preserves stored credentials on metadata-only repository edit", async () => {
    argoConfigDialogStore.openEdit(
      makeRepoSecret({
        url: b64("https://old.example.com/repo.git"),
        type: b64("git"),
        username: b64("user"),
        password: b64("secret"),
        customUnknownKey: b64("value"),
      }),
    );

    render(<ArgoConfigDialog />);

    setInputValue("Repository URL", "https://new.example.com/repo.git");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(Renderer.K8sApi.secretsStore.patch).toHaveBeenCalled());

    const [, ops, strategy] = (Renderer.K8sApi.secretsStore.patch as jest.Mock).mock.calls[0];
    expect(strategy).toBe("json");

    const touchedPaths = ops.map((op: { path: string }) => op.path);
    expect(touchedPaths).not.toContain("/data");
    expect(touchedPaths).not.toContain("/data/username");
    expect(touchedPaths).not.toContain("/data/password");
    expect(touchedPaths).not.toContain("/data/customUnknownKey");
    expect(ops).toContainEqual({
      op: "add",
      path: "/stringData",
      value: { url: "https://new.example.com/repo.git", type: "git" },
    });
  });

  it("removes a credential when its Clear checkbox is checked", async () => {
    argoConfigDialogStore.openEdit(
      makeRepoSecret({
        url: b64("https://example.com/repo.git"),
        username: b64("user"),
        password: b64("secret"),
      }),
    );

    render(<ArgoConfigDialog />);

    fireEvent.click(screen.getByLabelText("Clear stored Password"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(Renderer.K8sApi.secretsStore.patch).toHaveBeenCalled());

    const [, ops] = (Renderer.K8sApi.secretsStore.patch as jest.Mock).mock.calls[0];
    expect(ops).toContainEqual({ op: "remove", path: "/data/password" });
    expect(ops.map((op: { path: string }) => op.path)).not.toContain("/data/username");
  });

  it("confirms auth method change and removes old credentials", async () => {
    (Renderer.Component.ConfirmDialog.confirm as jest.Mock).mockResolvedValueOnce(true);
    argoConfigDialogStore.openEdit(
      makeRepoSecret({
        url: b64("https://example.com/repo.git"),
        username: b64("user"),
        password: b64("secret"),
      }),
    );

    render(<ArgoConfigDialog />);

    fireEvent.change(screen.getByLabelText("Auth Method"), { target: { value: "ssh" } });
    setInputValue("SSH Private Key", "ssh-key-material");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(Renderer.K8sApi.secretsStore.patch).toHaveBeenCalled());

    expect(Renderer.Component.ConfirmDialog.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ labelOk: "Change Auth Method" }),
    );

    const [, ops] = (Renderer.K8sApi.secretsStore.patch as jest.Mock).mock.calls[0];
    expect(ops).toContainEqual({ op: "remove", path: "/data/username" });
    expect(ops).toContainEqual({ op: "remove", path: "/data/password" });
    expect(ops).toContainEqual({
      op: "add",
      path: "/stringData",
      value: expect.objectContaining({ sshPrivateKey: "ssh-key-material" }),
    });
  });

  it("aborts save when auth method change is not confirmed", async () => {
    (Renderer.Component.ConfirmDialog.confirm as jest.Mock).mockResolvedValueOnce(false);
    argoConfigDialogStore.openEdit(
      makeRepoSecret({
        url: b64("https://example.com/repo.git"),
        username: b64("user"),
        password: b64("secret"),
      }),
    );

    render(<ArgoConfigDialog />);

    fireEvent.change(screen.getByLabelText("Auth Method"), { target: { value: "ssh" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(Renderer.Component.ConfirmDialog.confirm).toHaveBeenCalled());
    expect(Renderer.K8sApi.secretsStore.patch).not.toHaveBeenCalled();
  });

  it("round-trips configmap data unchanged on no-op save", async () => {
    const dexConfig = "connectors:\n  - type: github\n    id: github";
    argoConfigDialogStore.openEdit(
      makeArgoConfigMap({
        "dex.config": dexConfig,
        "policy.csv": "p, role:org-admin, applications, *, */*, allow",
        url: "https://argocd.example.com",
      }),
    );

    render(<ArgoConfigDialog />);

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(Renderer.K8sApi.configMapStore.patch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: {
            "dex.config": dexConfig,
            "policy.csv": "p, role:org-admin, applications, *, */*, allow",
            url: "https://argocd.example.com",
          },
        }),
        "merge",
      ),
    );
  });

  it("nulls out configmap keys removed via the key/value editor", async () => {
    argoConfigDialogStore.openEdit(
      makeArgoConfigMap({
        "dex.config": "connectors: []",
        url: "https://argocd.example.com",
      }),
    );

    render(<ArgoConfigDialog />);

    const [firstRemoveButton] = screen.getAllByRole("button", { name: "Remove" });
    expect(firstRemoveButton).toBeDefined();
    fireEvent.click(firstRemoveButton as HTMLElement);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(Renderer.K8sApi.configMapStore.patch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: {
            "dex.config": null,
            url: "https://argocd.example.com",
          },
        }),
        "merge",
      ),
    );
  });

  it("edits configmap data via JSON fallback view", async () => {
    argoConfigDialogStore.openCreate("configmap");

    render(<ArgoConfigDialog />);

    setInputValue("Name", "argocd-cm");
    fireEvent.click(screen.getByRole("button", { name: "Edit as JSON" }));
    setInputValue("Data JSON", '{\n  "application.instanceLabelKey": "argocd.argoproj.io/instance"\n}');
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(Renderer.K8sApi.configMapStore.create).toHaveBeenCalledWith(
        { name: "argocd-cm", namespace: "argocd" },
        expect.objectContaining({
          data: { "application.instanceLabelKey": "argocd.argoproj.io/instance" },
        }),
      ),
    );
  });

  it("shows validation error for invalid configmap JSON", async () => {
    argoConfigDialogStore.openCreate("configmap");

    render(<ArgoConfigDialog />);

    setInputValue("Name", "argocd-cm");
    fireEvent.click(screen.getByRole("button", { name: "Edit as JSON" }));
    setInputValue("Data JSON", "{invalid");
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(Renderer.K8sApi.configMapStore.create).not.toHaveBeenCalled());
    await waitFor(() =>
      expect(Renderer.Component.Notifications.error).toHaveBeenCalledWith("ConfigMap data must be valid JSON."),
    );
  });

  it("shows validation error when configmap data values are not strings", async () => {
    argoConfigDialogStore.openCreate("configmap");

    render(<ArgoConfigDialog />);

    setInputValue("Name", "argocd-cm");
    fireEvent.click(screen.getByRole("button", { name: "Edit as JSON" }));
    setInputValue("Data JSON", '{\n  "enabled": true\n}');
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(Renderer.K8sApi.configMapStore.create).not.toHaveBeenCalled());
    await waitFor(() =>
      expect(Renderer.Component.Notifications.error).toHaveBeenCalledWith(
        'ConfigMap data key "enabled" must have a string value.',
      ),
    );
  });

  it("blocks switching to key/value view when JSON is invalid", async () => {
    argoConfigDialogStore.openCreate("configmap");

    render(<ArgoConfigDialog />);

    fireEvent.click(screen.getByRole("button", { name: "Edit as JSON" }));
    setInputValue("Data JSON", "{invalid");
    fireEvent.click(screen.getByRole("button", { name: "Edit as key/value" }));

    expect(await screen.findByText("ConfigMap data must be valid JSON.")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Data JSON")).toBeInTheDocument();
  });

  it("rejects duplicate keys in the key/value editor", async () => {
    argoConfigDialogStore.openCreate("configmap");

    render(<ArgoConfigDialog />);

    setInputValue("Name", "argocd-cm");
    fireEvent.change(screen.getByPlaceholderText("Key"), { target: { value: "url" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Entry" }));
    const secondKeyInput = screen.getAllByPlaceholderText("Key")[1];
    expect(secondKeyInput).toBeDefined();
    fireEvent.change(secondKeyInput as HTMLElement, { target: { value: "url" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(Renderer.K8sApi.configMapStore.create).not.toHaveBeenCalled());
    await waitFor(() =>
      expect(Renderer.Component.Notifications.error).toHaveBeenCalledWith('ConfigMap data key "url" is duplicated.'),
    );
  });

  it("shows save error notification and inline error when request fails", async () => {
    (Renderer.K8sApi.secretsStore.create as jest.Mock).mockRejectedValueOnce(new Error("forbidden"));
    argoConfigDialogStore.openCreate("repository");

    render(<ArgoConfigDialog />);

    setInputValue("Name", "repo-secret");
    setInputValue("Namespace", "argocd");
    setInputValue("Repository URL", "https://github.com/example/repo.git");
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(Renderer.Component.Notifications.error).toHaveBeenCalledWith("forbidden"));
    expect(await screen.findByText("forbidden")).toBeInTheDocument();
  });

  it("shows fallback save error notification and inline error for non-Error failures", async () => {
    (Renderer.K8sApi.secretsStore.create as jest.Mock).mockRejectedValueOnce({ code: 403 });
    argoConfigDialogStore.openCreate("repository");

    render(<ArgoConfigDialog />);

    setInputValue("Name", "repo-secret");
    setInputValue("Namespace", "argocd");
    setInputValue("Repository URL", "https://github.com/example/repo.git");
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(Renderer.Component.Notifications.error).toHaveBeenCalledWith("Failed to save ArgoCD config."),
    );
    expect(await screen.findByText("Failed to save ArgoCD config.")).toBeInTheDocument();
  });
});
