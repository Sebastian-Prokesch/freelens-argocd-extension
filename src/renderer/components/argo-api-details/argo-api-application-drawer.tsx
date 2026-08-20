import { observer } from "mobx-react";
import { tryGetArgoExtension } from "../../extension-ref";
import { ArgoApplicationDetails } from "../../details/argo-application-details";
import {
  ArgoHardRefreshMenuItem,
  ArgoRefreshMenuItem,
  ArgoSyncMenuItem,
  ArgoSyncWithOptionsMenuItem,
  ArgoTerminateMenuItem,
} from "../../menus";
import styles from "./argo-api-details-drawer.module.scss";
import stylesInline from "./argo-api-details-drawer.module.scss?inline";
import { argoApiApplicationDrawerStore } from "./argo-api-application-drawer-store";

export const ArgoApiApplicationDrawer = observer(() => {
  const { isOpen, application } = argoApiApplicationDrawerStore;
  const extension = tryGetArgoExtension();

  if (!isOpen || !application || !extension) {
    return null;
  }

  const name = application.getName?.() || application.metadata?.name || "Application";

  return (
    <>
      <style>{stylesInline}</style>
      <div
        className={styles.overlay}
        role="presentation"
        onClick={() => argoApiApplicationDrawerStore.close()}
      />
      <aside className={styles.panel} role="dialog" aria-label={`Application ${name}`}>
        <div className={styles.header}>
          <div className={styles.titleBlock}>
            <p className={styles.kind}>Application</p>
            <h4 className={styles.title}>{name}</h4>
          </div>
          <div className={styles.actions}>
            <ArgoRefreshMenuItem object={application} toolbar extension={extension} />
            <ArgoHardRefreshMenuItem object={application} toolbar extension={extension} />
            <ArgoSyncMenuItem object={application} toolbar extension={extension} />
            <ArgoSyncWithOptionsMenuItem object={application} toolbar extension={extension} />
            <ArgoTerminateMenuItem object={application} toolbar extension={extension} />
            <button
              type="button"
              className={styles.closeButton}
              aria-label="Close details"
              onClick={() => argoApiApplicationDrawerStore.close()}
            >
              ×
            </button>
          </div>
        </div>
        <div className={styles.body}>
          <ArgoApplicationDetails
            object={application}
            extension={extension}
            onApplicationUpdated={(next) => argoApiApplicationDrawerStore.replace(next)}
          />
        </div>
      </aside>
    </>
  );
});
