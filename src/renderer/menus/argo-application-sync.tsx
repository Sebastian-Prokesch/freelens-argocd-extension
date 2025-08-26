import { Renderer } from "@freelensapp/extensions";
import { withErrorPage } from "../components/error-page";
import { ArgoApplication, getArgoApplicationStore } from "../k8s/argocd";

const {
  Component: { MenuItem, Icon },
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
      await store.patch(
        object,
        { 
          operation: {
            initiatedBy: {
              username: "LensApp",
            },
            sync: {
              syncStrategy: {
                hook: {}
              }
            },
          }
      },
        "merge",
      );
    };
    
    return (
      <MenuItem onClick={sync}>
        <Icon material="sync" interactive={toolbar} title="Sync" />
        <span className="title">Sync</span>
      </MenuItem>
    );

})
