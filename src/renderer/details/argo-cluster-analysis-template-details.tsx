import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { withErrorPage } from "../components/error-page";
import { type ArgoClusterAnalysisTemplate } from "../k8s/rollouts";

const {
  Component: { DrawerItem, DrawerTitle, Gutter, WithTooltip },
} = Renderer;

export interface ArgoClusterAnalysisTemplateDetailsProps
  extends Renderer.Component.KubeObjectDetailsProps<ArgoClusterAnalysisTemplate> {
  extension: Renderer.LensExtension;
}

const formatOptional = (value: unknown): string => {
  if (value === undefined || value === null || value === "") {
    return "N/A";
  }

  return String(value);
};

export const ArgoClusterAnalysisTemplateDetails = observer((props: ArgoClusterAnalysisTemplateDetailsProps) =>
  withErrorPage(props, () => {
    const { object } = props;
    const metrics = object.spec?.metrics ?? [];
    const args = object.spec?.args ?? [];
    const dryRunMetricNames = metrics.flatMap((metric) => metric.dryRun?.map((item) => item.metricName || "") ?? []);

    return (
      <>
        <DrawerTitle>ClusterAnalysisTemplate</DrawerTitle>
        <DrawerItem name="Metrics count">{String(metrics.length)}</DrawerItem>
        <DrawerItem name="Args count">{String(args.length)}</DrawerItem>
        <DrawerItem name="Dry-run metrics count">{String(dryRunMetricNames.filter(Boolean).length)}</DrawerItem>
        <DrawerItem name="Metric names">
          <WithTooltip>
            {metrics
              .map((metric) => metric.name)
              .filter(Boolean)
              .join(", ") || "None"}
          </WithTooltip>
        </DrawerItem>
        <DrawerItem name="Arg names">
          <WithTooltip>
            {args
              .map((arg) => arg.name)
              .filter(Boolean)
              .join(", ") || "None"}
          </WithTooltip>
        </DrawerItem>
        <Gutter size="md" />
        <DrawerTitle>Metric Summary</DrawerTitle>
        {metrics.length === 0 ? (
          <DrawerItem name="Summary">No metrics configured</DrawerItem>
        ) : (
          metrics.map((metric, index) => (
            <DrawerItem key={`${metric.name ?? "metric"}-${index}`} name={metric.name ?? `Metric ${index + 1}`}>
              <WithTooltip>
                interval: {formatOptional(metric.interval)}, count: {formatOptional(metric.count)}, success condition:{" "}
                {formatOptional(metric.successCondition)}, failure condition: {formatOptional(metric.failureCondition)}
              </WithTooltip>
            </DrawerItem>
          ))
        )}
      </>
    );
  }),
);
