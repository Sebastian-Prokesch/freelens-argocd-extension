import { Renderer } from "@freelensapp/extensions";
import type { AnalysisTemplateSpec } from "../k8s/rollouts";
import { formatOptionalValue } from "../utils";

const {
  Component: { DrawerItem, DrawerTitle, Gutter, WithTooltip },
} = Renderer;

interface ArgoAnalysisTemplateDetailContentProps {
  title: string;
  spec: AnalysisTemplateSpec | undefined;
}

export const ArgoAnalysisTemplateDetailContent = ({ title, spec }: ArgoAnalysisTemplateDetailContentProps) => {
  const metrics = spec?.metrics ?? [];
  const args = spec?.args ?? [];
  const dryRunMetricNames = metrics.flatMap((metric) => metric.dryRun?.map((item) => item.metricName || "") ?? []);

  return (
    <>
      <DrawerTitle>{title}</DrawerTitle>
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
              interval: {formatOptionalValue(metric.interval)}, count: {formatOptionalValue(metric.count)}, success
              condition: {formatOptionalValue(metric.successCondition)}, failure condition:{" "}
              {formatOptionalValue(metric.failureCondition)}
            </WithTooltip>
          </DrawerItem>
        ))
      )}
    </>
  );
};
