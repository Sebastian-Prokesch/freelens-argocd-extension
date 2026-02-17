import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { useEffect, useRef, useState } from "react";
import { ArgoApplication } from "../../k8s/argocd";
import styles from "./argo-application-status-chart.module.scss";
import stylesInline from "./argo-application-status-chart.module.scss?inline";

const {
  Component: { PieChart },
} = Renderer;

interface ArgoApplicationStatusChartProps {
  className?: string;
  applications: ArgoApplication[];
}

export const ArgoApplicationStatusChart = observer(({ className, applications }: ArgoApplicationStatusChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const [resolvedColors, setResolvedColors] = useState<Record<string, string>>({});

  // Count applications by health status
  const statusCounts = applications.reduce(
    (acc, app) => {
      const healthStatus = app.status?.health?.status || "Unknown";
      acc[healthStatus] = (acc[healthStatus] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Resolve theme colors using CSS custom properties
  useEffect(() => {
    if (containerRef.current) {
      const computedStyle = getComputedStyle(containerRef.current);
      const colorMap: Record<string, string> = {
        Healthy: computedStyle.getPropertyValue("--argo-status-healthy").trim() || "#4caf50",
        Progressing: computedStyle.getPropertyValue("--argo-status-progressing").trim() || "#2196f3",
        Degraded: computedStyle.getPropertyValue("--argo-status-degraded").trim() || "#ff9800",
        Suspended: computedStyle.getPropertyValue("--argo-status-suspended").trim() || "#9c27b0",
        Missing: computedStyle.getPropertyValue("--argo-status-missing").trim() || "#f44336",
        Unknown: computedStyle.getPropertyValue("--argo-status-unknown").trim() || "#757575",
      };
      console.log("Resolved colors:", colorMap);
      setResolvedColors(colorMap);
    }
  }, [applications]); // Re-run when applications change (which might indicate theme change)

  // Filter out empty status counts and ensure we have data
  const filteredStatusCounts = Object.fromEntries(Object.entries(statusCounts).filter(([_, count]) => count > 0));

  // Prepare chart data in FreeLens format
  const statusesToBeShown = Object.entries(filteredStatusCounts);

  const statusDataSet = {
    label: "Status",
    data: statusesToBeShown.map(([, value]) => value),
    backgroundColor: statusesToBeShown.map(([status]) => resolvedColors[status] || resolvedColors.Unknown || "#757575"),
    tooltipLabels: statusesToBeShown.map(
      ([status]) =>
        (percent: string) =>
          `${status}: ${percent}`,
    ),
    borderWidth: 0,
  };

  const chartData = {
    labels: statusesToBeShown.map(([status, count]) => `${status}: ${count}`),
    datasets: [statusDataSet as any],
  };

  console.log("Chart Data:", chartData);
  console.log("Resolved Colors:", resolvedColors);

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
          <h6 className={styles.title}>Application Health Status</h6>
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
      <div ref={containerRef} className={`ArgoApplicationStatusChart ${styles.chartContainer} ${className || ""}`}>
        <h6 className={styles.title}>Application Health Status</h6>
        <div className={styles.chart}>
          <PieChart data={chartData} options={chartOptions} height={300} showLegend={true} legendPosition="bottom" />
        </div>
      </div>
    </>
  );
});
