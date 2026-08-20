import { observer } from "mobx-react";
import { ArgoAppProjectDetails } from "../../details/argo-appproject-details";
import { tryGetArgoExtension } from "../../extension-ref";
import styles from "./argo-api-details-drawer.module.scss";
import stylesInline from "./argo-api-details-drawer.module.scss?inline";
import { argoApiAppProjectDrawerStore } from "./argo-api-appproject-drawer-store";

export const ArgoApiAppProjectDrawer = observer(() => {
  const { isOpen, project } = argoApiAppProjectDrawerStore;
  const extension = tryGetArgoExtension();

  if (!isOpen || !project || !extension) {
    return null;
  }

  const name = project.getName?.() || project.metadata?.name || "AppProject";

  return (
    <>
      <style>{stylesInline}</style>
      <div
        className={styles.overlay}
        role="presentation"
        onClick={() => argoApiAppProjectDrawerStore.close()}
      />
      <aside className={styles.panel} role="dialog" aria-label={`AppProject ${name}`}>
        <div className={styles.header}>
          <div className={styles.titleBlock}>
            <p className={styles.kind}>AppProject</p>
            <h4 className={styles.title}>{name}</h4>
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.closeButton}
              aria-label="Close details"
              onClick={() => argoApiAppProjectDrawerStore.close()}
            >
              ×
            </button>
          </div>
        </div>
        <div className={styles.body}>
          <ArgoAppProjectDetails object={project} extension={extension} />
        </div>
      </aside>
    </>
  );
});
