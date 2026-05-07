import { Renderer } from "@freelensapp/extensions";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArgoConfigDialog } from "../argo-config-dialog";
import { argoConfigDialogStore } from "../argo-config-dialog-store";

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
    const user = userEvent.setup();
    argoConfigDialogStore.openCreate("repository");

    render(<ArgoConfigDialog />);

    await user.type(screen.getByPlaceholderText("Name"), "repo-secret");
    const namespaceInput = screen.getByPlaceholderText("Namespace");
    await user.clear(namespaceInput);
    await user.type(namespaceInput, "argocd");
    await user.type(screen.getByPlaceholderText("Repository URL"), "https://github.com/example/repo.git");
    await user.click(screen.getByRole("button", { name: "Create" }));

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
    );
    expect(Renderer.Component.Notifications.ok).toHaveBeenCalledWith("ArgoCD config saved.");
  });

  it("shows validation error for invalid configmap JSON", async () => {
    const user = userEvent.setup();
    argoConfigDialogStore.openCreate("configmap");

    render(<ArgoConfigDialog />);

    const dataInput = screen.getByPlaceholderText("Data JSON");
    fireEvent.change(dataInput, { target: { value: "{invalid" } });
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(Renderer.K8sApi.configMapStore.create).not.toHaveBeenCalled();
    expect(Renderer.Component.Notifications.error).toHaveBeenCalledWith("ConfigMap data must be valid JSON.");
  });
});
