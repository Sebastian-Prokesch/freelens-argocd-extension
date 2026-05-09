import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { useEffect, useRef, useState } from "react";
import { ArgoApplicationStatusChart, ArgoApplicationSyncStatusChart } from "../components/argo-overview";
import { type ArgoApplication, getArgoApplicationStore, getArgoAppProjectStore } from "../k8s/argocd";
import styles from "./argo-overview-page.module.scss";
import stylesInline from "./argo-overview-page.module.scss?inline";

const {
  Component: { Events, NamespaceSelectFilter },
} = Renderer;

export interface ArgoOverviewPageProps {
  extension: Renderer.LensExtension;
}

const getHealthStatusCounts = (applications: ArgoApplication[]): Record<string, number> =>
  applications.reduce(
    (counts, app) => {
      const status = app.status?.health?.status ?? "Unknown";
      counts[status] = (counts[status] ?? 0) + 1;
      return counts;
    },
    {} as Record<string, number>,
  );

function filterItems(items: Renderer.K8sApi.KubeEvent[]): Renderer.K8sApi.KubeEvent[] {
  const events = items.filter((event) => {
    return event?.involvedObject?.apiVersion?.includes("argoproj.io/v1alpha1");
  });
  return events;
}

export const ArgoOverviewTabContent = observer(() => {
  const watches = useRef<(() => void)[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const applicationStore = getArgoApplicationStore();
  const appProjectStore = getArgoAppProjectStore();

  useEffect(() => {
    let isMounted = true;

    (async () => {
      const namespaceStore = Renderer.K8sApi.namespaceStore;
      try {
        setLoadError(null);
        await namespaceStore.loadAll({ namespaces: [] });
        watches.current.push(namespaceStore.subscribe());

        const namespaces = namespaceStore.items.map((ns) => ns.getName());

        await Promise.all([applicationStore.loadAll({ namespaces }), appProjectStore.loadAll({ namespaces })]);
        watches.current.push(applicationStore.subscribe());
        watches.current.push(appProjectStore.subscribe());

        if (isMounted) {
          setIsLoaded(true);
        }
      } catch (error) {
        if (isMounted) {
          const message = error instanceof Error ? error.message : "Failed to load ArgoCD overview data.";
          setLoadError(message);
        }
      }
    })();

    return () => {
      isMounted = false;
      for (const unsubscribe of watches.current) {
        unsubscribe();
      }
      watches.current = [];
    };
  }, []);

  const applications = (applicationStore.contextItems as ArgoApplication[]) ?? [];
  const healthCounts = getHealthStatusCounts(applications);
  const isNoApplications = isLoaded && !loadError && applications.length === 0;
  const scopedStyles = styles as Record<string, string>;

  return (
    <>
      <style>{stylesInline}</style>
      <div className={styles.root}>
        <div className={styles.header}>
          <h5 className={styles.title}>ArgoCD Overview</h5>
          <div className={styles.namespaceFilter}>
            <NamespaceSelectFilter id="overview-namespace-select-filter-input" />
          </div>
        </div>

        <div className={styles.scrollBody}>
          {!isLoaded ? <div className={styles.loadingMessage}>Loading ArgoCD overview resources...</div> : null}
          {loadError ? <div className={styles.errorMessage}>{loadError}</div> : null}
          <div className={styles.statuses}>
            <div className={scopedStyles.healthSummary}>
              <h6 className={scopedStyles.summaryTitle}>Health Summary</h6>
              {Object.keys(healthCounts).length > 0 ? (
                <div className={scopedStyles.summaryText}>
                  {Object.entries(healthCounts)
                    .map(([status, count]) => `${status}: ${count}`)
                    .join(" | ")}
                </div>
              ) : (
                <div className={scopedStyles.summaryText}>No applications</div>
              )}
            </div>
            {isNoApplications ? <div className={scopedStyles.emptyState}>No applications</div> : null}
            <div className={styles.chartsRow}>
              <div className={styles.chart}>
                <ArgoApplicationStatusChart applications={applications} isLoading={!isLoaded && !loadError} />
              </div>

              <div className={styles.chart}>
                <ArgoApplicationSyncStatusChart applications={applications} isLoading={!isLoaded && !loadError} />
              </div>
            </div>
          </div>

          <Events compact hideFilters filterItems={[filterItems]} compactLimit={1000} />
        </div>
      </div>
    </>
  );
});

export const ArgoOverviewPage = observer(() => {
  return <ArgoOverviewTabContent />;
});
