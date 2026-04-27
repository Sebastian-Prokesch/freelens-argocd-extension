import { Renderer } from "@freelensapp/extensions";
import { withErrorPage } from "../components/error-page";
import { ArgoApplication, getArgoApplicationStore } from "../k8s/argocd";

const {
  Component: { Icon, MenuItem, Notifications },
} = Renderer;

const terminalPhases = new Set(["Succeeded", "Failed", "Error"]);

export interface ArgoTerminateMenuItemProps extends Renderer.Component.KubeObjectMenuProps<ArgoApplication> {
  extension: Renderer.LensExtension;
}

export const ArgoTerminateMenuItem = (props: ArgoTerminateMenuItemProps) =>
  withErrorPage(props, () => {
    const { object, toolbar } = props;

    if (!object) return <></>;

    const phase = object.status?.operationState?.phase;
    const hasInProgressOperation = !!phase && !terminalPhases.has(phase);

    if (!hasInProgressOperation) return <></>;

    const store = getArgoApplicationStore();

    const terminateOperation = async () => {
      const appName = object.getName?.() ?? object.metadata?.name ?? "application";
      try {
        await store.patch(object, [{ op: "remove", path: "/operation" }], "json");
        Notifications.ok(`Terminate requested for ${appName}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to terminate operation.";
        Notifications.error(message);
      }
    };

    return (
      <MenuItem onClick={terminateOperation}>
        <Icon material="stop_circle" interactive={toolbar} title="Terminate Operation" />
        <span className="title">Terminate Operation</span>
      </MenuItem>
    );
  });
