import { Renderer } from "@freelensapp/extensions";
import { runGuardedArgoMutation } from "../guarded-mutation";

describe("runGuardedArgoMutation", () => {
  beforeEach(() => {
    (Renderer.Component.ConfirmDialog.confirm as jest.Mock).mockReset();
    (Renderer.Component.Notifications.ok as jest.Mock).mockReset();
    (Renderer.Component.Notifications.error as jest.Mock).mockReset();
  });

  it("runs destructive mutation when confirmed", async () => {
    const run = jest.fn().mockResolvedValue(undefined);
    (Renderer.Component.ConfirmDialog.confirm as jest.Mock).mockResolvedValueOnce(true);

    const result = await runGuardedArgoMutation({
      risk: "destructive",
      actionLabel: "Abort",
      resourceName: "demo-rollout",
      run,
      successMessage: "Abort requested for demo-rollout",
      failureFallback: "Failed to abort rollout.",
      confirm: {
        title: "Abort Rollout",
        message: "Abort rollout demo-rollout? This interrupts the ongoing rollout operation.",
      },
    });

    expect(Renderer.Component.ConfirmDialog.confirm).toHaveBeenCalledWith({
      labelOk: "Abort Rollout",
      message: "Abort rollout demo-rollout? This interrupts the ongoing rollout operation.",
    });
    expect(run).toHaveBeenCalledTimes(1);
    expect(Renderer.Component.Notifications.ok).toHaveBeenCalledWith("Abort requested for demo-rollout");
    expect(result).toBe("success");
  });

  it("returns cancelled when destructive confirmation is rejected", async () => {
    const run = jest.fn().mockResolvedValue(undefined);
    (Renderer.Component.ConfirmDialog.confirm as jest.Mock).mockResolvedValueOnce(false);

    const result = await runGuardedArgoMutation({
      risk: "destructive",
      actionLabel: "Abort",
      resourceName: "demo-rollout",
      run,
      successMessage: "Abort requested for demo-rollout",
      failureFallback: "Failed to abort rollout.",
      confirm: {
        title: "Abort Rollout",
        message: "Abort rollout demo-rollout? This interrupts the ongoing rollout operation.",
      },
    });

    expect(run).not.toHaveBeenCalled();
    expect(Renderer.Component.Notifications.ok).not.toHaveBeenCalled();
    expect(Renderer.Component.Notifications.error).not.toHaveBeenCalled();
    expect(result).toBe("cancelled");
  });

  it("shows error message from thrown Error", async () => {
    const run = jest.fn().mockRejectedValue(new Error("abort denied"));
    (Renderer.Component.ConfirmDialog.confirm as jest.Mock).mockResolvedValueOnce(true);

    const result = await runGuardedArgoMutation({
      risk: "destructive",
      actionLabel: "Abort",
      resourceName: "demo-rollout",
      run,
      successMessage: "Abort requested for demo-rollout",
      failureFallback: "Failed to abort rollout.",
    });

    expect(Renderer.Component.Notifications.error).toHaveBeenCalledWith("abort denied");
    expect(result).toBe("error");
  });

  it("shows fallback for non-Error failures", async () => {
    const run = jest.fn().mockRejectedValue({ code: 403 });
    (Renderer.Component.ConfirmDialog.confirm as jest.Mock).mockResolvedValueOnce(true);

    const result = await runGuardedArgoMutation({
      risk: "destructive",
      actionLabel: "Abort",
      resourceName: "demo-rollout",
      run,
      successMessage: "Abort requested for demo-rollout",
      failureFallback: "Failed to abort rollout.",
    });

    expect(Renderer.Component.Notifications.error).toHaveBeenCalledWith("Failed to abort rollout.");
    expect(result).toBe("error");
  });

  it("calls onErrorMessage with normalized message", async () => {
    const run = jest.fn().mockRejectedValue({ code: 403 });
    const onErrorMessage = jest.fn();

    const result = await runGuardedArgoMutation({
      risk: "low",
      actionLabel: "Save",
      resourceName: "argo-config",
      run,
      successMessage: "ArgoCD config saved.",
      failureFallback: "Failed to save ArgoCD config.",
      onErrorMessage,
    });

    expect(onErrorMessage).toHaveBeenCalledWith("Failed to save ArgoCD config.");
    expect(Renderer.Component.Notifications.error).toHaveBeenCalledWith("Failed to save ArgoCD config.");
    expect(result).toBe("error");
  });

  it("skips confirmation for low risk mutations", async () => {
    const run = jest.fn().mockResolvedValue(undefined);

    const result = await runGuardedArgoMutation({
      risk: "low",
      actionLabel: "Sync",
      resourceName: "demo-app",
      run,
      successMessage: "Sync requested for demo-app",
      failureFallback: "Failed to start sync.",
    });

    expect(Renderer.Component.ConfirmDialog.confirm).not.toHaveBeenCalled();
    expect(run).toHaveBeenCalledTimes(1);
    expect(Renderer.Component.Notifications.ok).toHaveBeenCalledWith("Sync requested for demo-app");
    expect(result).toBe("success");
  });
});
