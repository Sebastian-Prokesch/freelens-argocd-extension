import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { withErrorPage } from "../components/error-page";
import { ConditionsList, ResourceEventsSection, StatusBadge } from "../components/shared";
import {
  type ArgoAnalysisRun,
  getAnalysisRunConditionSummary,
  getAnalysisRunMeasurementCount,
  getAnalysisRunMetricCount,
  getAnalysisRunPhase,
} from "../k8s/rollouts";
import { formatOptionalValue } from "../utils";

const {
  Component: { DrawerItem, DrawerTitle, Gutter, Table, TableCell, TableHead, TableRow, WithTooltip },
} = Renderer;

export interface ArgoAnalysisRunDetailsProps extends Renderer.Component.KubeObjectDetailsProps<ArgoAnalysisRun> {
  extension: Renderer.LensExtension;
}

export const ArgoAnalysisRunDetails = observer((props: ArgoAnalysisRunDetailsProps) =>
  withErrorPage(props, () => {
    const { object } = props;
    const metricResults = object.status?.metricResults ?? [];
    const conditions = object.status?.conditions ?? [];

    return (
      <>
        <DrawerTitle>AnalysisRun</DrawerTitle>
        <DrawerItem name="Phase">
          <StatusBadge status={getAnalysisRunPhase(object)} />
        </DrawerItem>
        <DrawerItem name="Started">{formatOptionalValue(object.status?.startedAt)}</DrawerItem>
        <DrawerItem name="Finished">{formatOptionalValue(object.status?.finishedAt)}</DrawerItem>
        <DrawerItem name="Message">
          <WithTooltip>{formatOptionalValue(object.status?.message)}</WithTooltip>
        </DrawerItem>
        <DrawerItem name="Metrics count">{String(getAnalysisRunMetricCount(object))}</DrawerItem>
        <DrawerItem name="Measurements count">{String(getAnalysisRunMeasurementCount(object))}</DrawerItem>
        <DrawerItem name="Conditions summary">
          <WithTooltip>{getAnalysisRunConditionSummary(object)}</WithTooltip>
        </DrawerItem>

        <Gutter size="md" />
        <DrawerTitle>Metrics</DrawerTitle>
        {metricResults.length === 0 ? (
          <DrawerItem name="Summary">No metric results</DrawerItem>
        ) : (
          <Table tableId="analysis-run-metrics" scrollable={false} sortSyncWithUrl={false}>
            <TableHead flat sticky={false}>
              <TableCell>Name</TableCell>
              <TableCell>Phase</TableCell>
              <TableCell>Success</TableCell>
              <TableCell>Failed</TableCell>
              <TableCell>Inconclusive</TableCell>
              <TableCell>Measurements</TableCell>
            </TableHead>
            {metricResults.map((metricResult, index) => (
              <TableRow key={`${metricResult.name ?? "metric"}-${index}`}>
                <TableCell>{formatOptionalValue(metricResult.name)}</TableCell>
                <TableCell>
                  <StatusBadge status={metricResult.phase} fallbackLabel="N/A" />
                </TableCell>
                <TableCell>{String(metricResult.successful ?? 0)}</TableCell>
                <TableCell>{String(metricResult.failed ?? 0)}</TableCell>
                <TableCell>{String(metricResult.inconclusive ?? 0)}</TableCell>
                <TableCell>{String(metricResult.measurements?.length ?? 0)}</TableCell>
              </TableRow>
            ))}
          </Table>
        )}

        <Gutter size="md" />
        <DrawerTitle>Conditions</DrawerTitle>
        <ConditionsList conditions={conditions} mode="compact" />

        <Gutter size="md" />
        <ResourceEventsSection
          resource={{
            uid: object.metadata?.uid,
            name: object.getName?.() ?? object.metadata?.name,
            namespace: object.getNs?.() ?? object.metadata?.namespace,
            kind: object.kind,
            apiVersion: object.apiVersion,
          }}
        />
      </>
    );
  }),
);
