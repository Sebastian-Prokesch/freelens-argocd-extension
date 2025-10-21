import { Renderer } from "@freelensapp/extensions";
import { useRef, useEffect, useState } from "react";
import { observer } from "mobx-react";

import styles from "./argo-overview-page.module.scss";
import stylesInline from "./argo-overview-page.module.scss?inline";
import { ArgoApplication, ArgoAppProject } from "../k8s/argocd";
import { ArgoApplicationStatusChart, ArgoApplicationSyncStatusChart } from "../components/argo-overview";

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
    const [applications, setApplications] = useState<ArgoApplication[]>([]);
    
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
                
                // Update applications state when ArgoApplication store changes
                if (object === ArgoApplication) {
                    setApplications(store.items);
                }
            } catch (_) {
                continue;
            }
        }
        })();
    }, []);

    // The NamespaceSelectFilter automatically filters the applications
    // through the store, so we can use the applications directly
    
    return (
        <>
        <style>{stylesInline}</style>
        <div className={styles.page}>
            <div className={styles.headerBox}>
                <h2 className={styles.title}>ArgoCD Overview</h2>
                <div className={styles.namespaceFilter}>
                    <NamespaceSelectFilter 
                        id="overview-namespace-select-filter-input"
                    />
                </div>
            </div>
            
            <div className={styles.chartsContainer}>
                <div className={styles.chartsWrapper}>
                    <div className={styles.chart}>
                        <ArgoApplicationStatusChart applications={applications} />
                    </div>
                    
                    <div className={styles.chart}>
                        <ArgoApplicationSyncStatusChart applications={applications} />
                    </div>
                </div>
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