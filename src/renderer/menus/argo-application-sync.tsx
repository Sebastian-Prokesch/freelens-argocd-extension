import { Renderer } from "@freelensapp/extensions";
import { withErrorPage } from "../components/error-page";
import { ArgoApplication, getArgoApplicationStore } from "../k8s/argocd";

const {
  Component: { MenuItem, Icon, Notifications },
} = Renderer;

export interface ArgoSyncMenuItemProps extends Renderer.Component.KubeObjectMenuProps<ArgoApplication> {
  extension: Renderer.LensExtension;
}

export const ArgoSyncMenuItem = (props: ArgoSyncMenuItemProps) =>
  withErrorPage(props, () => {
    const { object, toolbar } = props;

    if (!object) return <></>;

    const store = getArgoApplicationStore();

    // const sync = async () => {
    //   await store.patch(
    //     object,
    //     [
    //       {
    //         op: "add",
    //         path: "/operation",
    //         value: {
    //           initiatedBy: { username: "LensApp" },
    //           sync: { syncStrategy: { hook: {} } },
    //         },
    //       },
    //     ],
    //     "json",
    //   );
    // };
    const sync = async () => {
      const appName = object.getName?.() ?? object.metadata?.name ?? "application";
      try {
        await store.patch(
          object,
          {
            operation: {
              initiatedBy: {
                username: "LensApp",
              },
              sync: {
                syncStrategy: {
                  hook: {},
                },
              },
            },
          },
          "merge",
        );
        Notifications.ok(`Sync started for ${appName}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to start sync.";
        Notifications.error(message);
      }
    };

    return (
      <MenuItem onClick={sync}>
        <Icon material="sync" interactive={toolbar} title="Sync" />
        <span className="title">Sync</span>
      </MenuItem>
    );
  });
