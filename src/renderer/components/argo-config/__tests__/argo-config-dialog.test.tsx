import { Renderer } from "@freelensapp/extensions";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ArgoConfigDialog } from "../argo-config-dialog";
import { argoConfigDialogStore } from "../argo-config-dialog-store";

const setInputValue = (placeholder: string, value: string) => {
  fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } });
};

describe("ArgoConfigDialog", () => {
  beforeEach(() => {
    argoConfigDialogStore.close();
    (Renderer.K8sApi.secretsStore.create as jest.Mock).mockReset();
    (Renderer.K8sApi.secretsStore.patch as jest.Mock).mockReset();
    (Renderer.K8sApi.configMapStore.create as jest.Mock).mockReset();
    (Renderer.K8sApi.configMapStore.patch as jest.Mock).mockReset();
    (Renderer.Component.Notifications.ok as jest.Mock).mockReset();
    (Renderer.Component.Notifications.error as jest.Mock).mockReset();
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

  it("shows validation error for invalid configmap JSON", async () => {
    argoConfigDialogStore.openCreate("configmap");

    render(<ArgoConfigDialog />);

    setInputValue("Name", "argocd-cm");
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
    setInputValue("Data JSON", '{\n  "enabled": true\n}');
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(Renderer.K8sApi.configMapStore.create).not.toHaveBeenCalled());
    await waitFor(() =>
      expect(Renderer.Component.Notifications.error).toHaveBeenCalledWith(
        'ConfigMap data key "enabled" must have a string value.',
      ),
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
