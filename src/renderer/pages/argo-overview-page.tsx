import { Renderer } from "@freelensapp/extensions";
import { useRef, useEffect } from "react";
import { observer } from "mobx-react";

import styles from "./argo-overview-page.module.scss";
import stylesInline from "./argo-overview-page.module.scss?inline";
import { ArgoApplication, ArgoAppProject } from "../k8s/argocd";

const {
    Component: {Events, NamespaceSelectFilter, TabLayout },
  } = Renderer;



export interface ArgoOverviewPageProps {
    extension: Renderer.LensExtension;
  }
  
function filterItems(items: Renderer.K8sApi.KubeEvent[]): Renderer.K8sApi.KubeEvent[] {
const events = items.filter((event) => {
    return event?.involvedObject?.apiVersion?.includes("argoproj.io/v1alpha1");
});
return events;
}

export const ArgoOverviewTabContent = observer(() => {
    const watches = useRef<(() => void)[]>([]);
    useEffect(() => {
        (async () => {
        const namespaceStore = Renderer.K8sApi.namespaceStore;
        await namespaceStore.loadAll({ namespaces: [] });
        watches.current.push(namespaceStore.subscribe());

        const namespaces = namespaceStore.items.map((ns) => ns.getName());
        for (const object of [
            ArgoApplication,
            ArgoAppProject
            ]) {
            try {
                const store = object.getStore()
                if (!store) continue;
                await store.loadAll({ namespaces });
                watches.current.push(store.subscribe());
            } catch (_) {
                continue;
            }
        }
        })();
    })
    return (
        <>
        <style>{stylesInline}</style>
        <div className={styles.page}>
            <div className={styles.header}>
                <h5>ArgoCD Overview</h5>
                <NamespaceSelectFilter id="overview-namespace-select-filter-input" />
            </div>
            <Events compact hideFilters filterItems={[filterItems]} compactLimit={1000} />
        </div>
        </>
    );
});

export const ArgoOverviewPage = observer(() => {
      return (
        <>
        <style>{stylesInline}</style>
        <TabLayout>
            <ArgoOverviewTabContent />
        </TabLayout>
        </>
      );
    },
);