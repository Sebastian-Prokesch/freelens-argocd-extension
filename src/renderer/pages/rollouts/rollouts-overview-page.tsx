import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { useEffect, useRef, useState } from "react";
import { type ArgoRollout, getArgoRolloutStore } from "../../k8s/rollouts";
import styles from "../argo-overview-page.module.scss";
import stylesInline from "../argo-overview-page.module.scss?inline";
import chartStyles from "./rollouts-overview-page.module.scss";
import chartStylesInline from "./rollouts-overview-page.module.scss?inline";

const {
  Component: { NamespaceSelectFilter, PieChart },
} = Renderer;

export interface ArgoRolloutsOverviewPageProps {
  extension: Renderer.LensExtension;
}

const getPhaseColorMap = (computedStyle: CSSStyleDeclaration): Record<string, string> => ({
  Healthy: computedStyle.getPropertyValue("--rollout-phase-healthy").trim() || "#4caf50",
  Progressing: computedStyle.getPropertyValue("--rollout-phase-progressing").trim() || "#2196f3",
  Paused: computedStyle.getPropertyValue("--rollout-phase-paused").trim() || "#9c27b0",
  Degraded: computedStyle.getPropertyValue("--rollout-phase-degraded").trim() || "#ff9800",
  Error: computedStyle.getPropertyValue("--rollout-phase-error").trim() || "#f44336",
  Failed: computedStyle.getPropertyValue("--rollout-phase-error").trim() || "#f44336",
  Unknown: computedStyle.getPropertyValue("--rollout-phase-unknown").trim() || "#757575",
});

export const ArgoRolloutsOverviewTabContent = observer(() => {
  const watches = useRef<(() => void)[]>([]);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resolvedColors, setResolvedColors] = useState<Record<string, string>>({});
  const rolloutStore = getArgoRolloutStore();

  useEffect(() => {
    let isMounted = true;

    (async () => {
      const namespaceStore = Renderer.K8sApi.namespaceStore;
      try {
        setLoadError(null);
        await namespaceStore.loadAll({ namespaces: [] });
        watches.current.push(namespaceStore.subscribe());

        const namespaces = namespaceStore.items.map((namespace) => namespace.getName());
        await rolloutStore.loadAll({ namespaces });
        watches.current.push(rolloutStore.subscribe());

        if (isMounted) {
          setIsLoaded(true);
        }
      } catch (error) {
        if (isMounted) {
          const message = error instanceof Error ? error.message : "Failed to load Argo Rollouts overview data.";
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
  }, [rolloutStore]);

  useEffect(() => {
    if (!chartContainerRef.current) {
      return;
    }

    const computedStyle = getComputedStyle(chartContainerRef.current);
    setResolvedColors(getPhaseColorMap(computedStyle));
  }, [isLoaded, rolloutStore.items.length]);

  const rollouts = (rolloutStore.contextItems as ArgoRollout[]) ?? [];
  const phaseCounts = rollouts.reduce(
    (accumulator, rollout) => {
      const phase = rollout.status?.phase || "Unknown";
      accumulator[phase] = (accumulator[phase] || 0) + 1;
      return accumulator;
    },
    {} as Record<string, number>,
  );

  const phasesToBeShown = Object.entries(phaseCounts).filter(([_, count]) => count > 0);

  const phaseDataSet = {
    label: "Phase",
    data: phasesToBeShown.map(([_, count]) => count),
    backgroundColor: phasesToBeShown.map(([phase]) => resolvedColors[phase] || resolvedColors.Unknown || "#757575"),
    borderWidth: 0,
  };

  const chartData = {
    labels: phasesToBeShown.map(([phase, count]) => `${phase}: ${count}`),
    datasets: [phaseDataSet as any],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        enabled: true,
      },
    },
  };

  return (
    <>
      <style>{stylesInline}</style>
      <style>{chartStylesInline}</style>
      <div className={styles.root}>
        <div className={styles.header}>
          <h5 className={styles.title}>Argo Rollouts Overview</h5>
          <div className={styles.namespaceFilter}>
            <NamespaceSelectFilter id="rollouts-overview-namespace-select-filter-input" />
          </div>
        </div>

        <div className={styles.scrollBody}>
          {!isLoaded ? <div className={styles.loadingMessage}>Loading Argo Rollouts resources...</div> : null}
          {loadError ? <div className={styles.errorMessage}>{loadError}</div> : null}
          <div className={styles.statuses}>
            <div className={styles.chartsRow}>
              <div
                ref={chartContainerRef}
                className={`${chartStyles.chartContainer} ${phasesToBeShown.length === 0 ? "" : "ArgoRolloutsPhaseChart"}`}
              >
                <h6 className={chartStyles.title}>Rollout Phase Distribution</h6>
                {phasesToBeShown.length === 0 ? (
                  <div className={chartStyles.noData}>{isLoaded ? "No Rollouts found" : "Loading Rollouts..."}</div>
                ) : (
                  <div className={chartStyles.chart}>
                    <PieChart
                      data={chartData}
                      options={chartOptions}
                      height={300}
                      showLegend={true}
                      legendPosition="bottom"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

export const ArgoRolloutsOverviewPage = observer((props: ArgoRolloutsOverviewPageProps) => {
  void props;
  return <ArgoRolloutsOverviewTabContent />;
});
