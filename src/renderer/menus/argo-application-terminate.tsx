import { Renderer } from "@freelensapp/extensions";
import { withErrorPage } from "../components/error-page";
import { ArgoApplication, getArgoApplicationStore } from "../k8s/argocd";

const {
  Component: { Icon, MenuItem },
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
      await store.patch(object, [{ op: "remove", path: "/operation" }], "json");
    };

    return (
      <MenuItem onClick={terminateOperation}>
        <Icon material="stop_circle" interactive={toolbar} title="Terminate Operation" />
        <span className="title">Terminate Operation</span>
      </MenuItem>
    );
  });
