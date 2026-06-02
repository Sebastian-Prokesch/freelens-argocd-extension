import { Renderer } from "@freelensapp/extensions";
import { withErrorPage } from "../components/error-page";
import { hardRefreshApplication, refreshApplication } from "../endpoints/argo-application-endpoints";
import { ArgoApplication, getArgoApplicationStore } from "../k8s/argocd";
import { runGuardedArgoMutation } from "../mutations";

const {
  Component: { MenuItem, Icon },
} = Renderer;

export interface ArgoRefreshMenuItemProps extends Renderer.Component.KubeObjectMenuProps<ArgoApplication> {
  extension: Renderer.LensExtension;
}

export interface ArgoHardRefreshMenuItemProps extends Renderer.Component.KubeObjectMenuProps<ArgoApplication> {
  extension: Renderer.LensExtension;
}

export const ArgoRefreshMenuItem = (props: ArgoRefreshMenuItemProps) =>
  withErrorPage(props, () => {
    const { object, toolbar } = props;

    if (!object) return <></>;

    const store = getArgoApplicationStore();

    const onRefresh = async () => {
      const appName = object.getName?.() ?? object.metadata?.name ?? "application";
      await runGuardedArgoMutation({
        risk: "low",
        actionLabel: "Refresh",
        resourceName: appName,
        run: () => refreshApplication(store, object),
        successMessage: `Refresh requested for ${appName}`,
        failureFallback: "Failed to refresh application.",
      });
    };

    return (
      <MenuItem onClick={onRefresh}>
        <Icon material="refresh" interactive={toolbar} title="Refresh" />
        <span className="title">Refresh</span>
      </MenuItem>
    );
  });

export const ArgoHardRefreshMenuItem = (props: ArgoHardRefreshMenuItemProps) =>
  withErrorPage(props, () => {
    const { object, toolbar } = props;

    if (!object) return <></>;

    const store = getArgoApplicationStore();

    const onHardRefresh = async () => {
      const appName = object.getName?.() ?? object.metadata?.name ?? "application";
      await runGuardedArgoMutation({
        risk: "low",
        actionLabel: "Hard Refresh",
        resourceName: appName,
        run: () => hardRefreshApplication(store, object),
        successMessage: `Hard refresh requested for ${appName}`,
        failureFallback: "Failed to hard refresh application.",
      });
    };

    return (
      <MenuItem onClick={onHardRefresh}>
        <Icon material="autorenew" interactive={toolbar} title="Hard Refresh" />
        <span className="title">Hard Refresh</span>
      </MenuItem>
    );
  });
