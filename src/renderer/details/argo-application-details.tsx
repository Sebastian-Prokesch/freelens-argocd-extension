import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { ArgoPreferencesStore } from "../../common/store";
import { withErrorPage } from "../components/error-page";
import { ArgoApplication } from "../k8s/argocd";
import styles from "./argo-application-details.module.scss";
import stylesInline from "./argo-application-details.module.scss?inline";

const {
  Component: { BadgeBoolean, DrawerItem, MarkdownViewer },
} = Renderer;

export interface ArgoApplicationDetailsProps extends Renderer.Component.KubeObjectDetailsProps<ArgoApplication> {
  extension: Renderer.LensExtension;
}

export const ArgoApplicationDetails = observer((props: ArgoApplicationDetailsProps) =>
  withErrorPage(props, () => {
    const { object } = props;
    const preferences = ArgoPreferencesStore.getInstance<ArgoPreferencesStore>();

    return (
      <>
        <style>{stylesInline}</style>
        <div className={styles.argoApplicationDetails}>
          <DrawerItem name="Description">
            <MarkdownViewer
              markdown={Array.isArray(object.spec.info)
                ? object.spec.info.map(item => `- **${item.name}**: ${item.value}`).join("\n")
                : (object.spec.info ?? "")}
            />
          </DrawerItem>
          <DrawerItem name="ArgoApplication checkbox">
            <BadgeBoolean value={preferences.enabled} />
          </DrawerItem>
        </div>
      </>
    );
  }),
);
