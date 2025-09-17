import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { useRef, useEffect, useState } from "react";
import { ArgoApplication } from "../../k8s/argocd";
import styles from "./argo-application-sync-status-chart.module.scss";
import stylesInline from "./argo-application-sync-status-chart.module.scss?inline";

const {
  Component: { PieChart },
} = Renderer;

interface ArgoApplicationSyncStatusChartProps {
  className?: string;
  applications: ArgoApplication[];
}

export const ArgoApplicationSyncStatusChart = observer(({ className, applications }: ArgoApplicationSyncStatusChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [resolvedColors, setResolvedColors] = useState<Record<string, string>>({});

  // Count applications by sync status
  const statusCounts = applications.reduce((acc, app) => {
    const syncStatus = app.status?.sync?.status || "Unknown";
    acc[syncStatus] = (acc[syncStatus] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Resolve theme colors using CSS custom properties
  useEffect(() => {
    if (containerRef.current) {
      const computedStyle = getComputedStyle(containerRef.current);
      const colorMap: Record<string, string> = {
        Synced: computedStyle.getPropertyValue('--argo-sync-synced').trim() || '#4caf50',
        OutOfSync: computedStyle.getPropertyValue('--argo-sync-outofsync').trim() || '#ff9800',
        Unknown: computedStyle.getPropertyValue('--argo-sync-unknown').trim() || '#757575',
      };
      console.log("Resolved sync colors:", colorMap);
      setResolvedColors(colorMap);
    }
  }, [applications]); // Re-run when applications change (which might indicate theme change)

  // Filter out empty status counts and ensure we have data
  const filteredStatusCounts = Object.fromEntries(
    Object.entries(statusCounts).filter(([_, count]) => count > 0)
  );

  // Prepare chart data in FreeLens format
  const statusesToBeShown = Object.entries(filteredStatusCounts);

  const statusDataSet = {
    label: "Sync Status",
    data: statusesToBeShown.map(([, value]) => value),
    backgroundColor: statusesToBeShown.map(
      ([status]) => resolvedColors[status] || resolvedColors.Unknown || '#757575'
    ),
    tooltipLabels: statusesToBeShown.map(
      ([status]) =>
        (percent: string) =>
          `${status}: ${percent}`,
    ),
    borderWidth: 0,
  };

  const chartData = {
    labels: statusesToBeShown.map(([status]) => status),
    datasets: [statusDataSet as any],
  };

  console.log("Sync Chart Data:", chartData);
  console.log("Resolved Sync Colors:", resolvedColors);

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

  if (applications.length === 0 || Object.keys(filteredStatusCounts).length === 0) {
    return (
      <>
        <style>{stylesInline}</style>
        <div className={`${styles.chartContainer} ${className || ""}`}>
          <h6 className={styles.title}>Application Sync Status</h6>
          <div className={styles.noData}>
            <div>No ArgoCD applications found</div>
            <div className={styles.loadingText}>Loading applications...</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{stylesInline}</style>
      <div ref={containerRef} className={`ArgoApplicationSyncStatusChart ${styles.chartContainer} ${className || ""}`}>
        <h6 className={styles.title}>Application Sync Status</h6>
        <div className={styles.chart}>
          <PieChart
            data={chartData}
            options={chartOptions}
            height={300}
            showLegend={true}
            legendPosition="bottom"
          />
        </div>
      </div>
    </>
  );
});
