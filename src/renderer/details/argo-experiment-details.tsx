import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { withErrorPage } from "../components/error-page";
import {
  type ArgoExperiment,
  getExperimentAnalysisCount,
  getExperimentPhase,
  getExperimentTemplateCount,
} from "../k8s/rollouts";

const {
  Component: { DrawerItem, DrawerTitle, Gutter, Table, TableCell, TableHead, TableRow, WithTooltip },
} = Renderer;

export interface ArgoExperimentDetailsProps extends Renderer.Component.KubeObjectDetailsProps<ArgoExperiment> {
  extension: Renderer.LensExtension;
}

const formatOptional = (value: unknown): string => {
  if (value === undefined || value === null || value === "") {
    return "N/A";
  }

  return String(value);
};

export const ArgoExperimentDetails = observer((props: ArgoExperimentDetailsProps) =>
  withErrorPage(props, () => {
    const { object } = props;
    const templates = object.spec?.templates ?? [];
    const analyses = object.spec?.analyses ?? [];
    const conditions = object.status?.conditions ?? [];

    return (
      <>
        <DrawerTitle>Experiment</DrawerTitle>
        <DrawerItem name="Phase">{getExperimentPhase(object)}</DrawerItem>
        <DrawerItem name="Message">
          <WithTooltip>{formatOptional(object.status?.message)}</WithTooltip>
        </DrawerItem>
        <DrawerItem name="Duration">{formatOptional(object.spec?.duration)}</DrawerItem>
        <DrawerItem name="Progress deadline">{formatOptional(object.spec?.progressDeadlineSeconds)}</DrawerItem>
        <DrawerItem name="Template count">{String(getExperimentTemplateCount(object))}</DrawerItem>
        <DrawerItem name="Analysis count">{String(getExperimentAnalysisCount(object))}</DrawerItem>

        <Gutter size="md" />
        <DrawerTitle>Templates</DrawerTitle>
        {templates.length === 0 ? (
          <DrawerItem name="Summary">None</DrawerItem>
        ) : (
          <Table tableId="experiment-templates" scrollable={false} sortSyncWithUrl={false}>
            <TableHead flat sticky={false}>
              <TableCell>Name</TableCell>
              <TableCell>SpecRef</TableCell>
              <TableCell>Replicas</TableCell>
            </TableHead>
            {templates.map((template, index) => (
              <TableRow key={`${template.name ?? "template"}-${index}`}>
                <TableCell>{formatOptional(template.name)}</TableCell>
                <TableCell>{formatOptional(template.specRef)}</TableCell>
                <TableCell>{formatOptional(template.replicas)}</TableCell>
              </TableRow>
            ))}
          </Table>
        )}

        <Gutter size="md" />
        <DrawerTitle>Analyses</DrawerTitle>
        {analyses.length === 0 ? (
          <DrawerItem name="Summary">None</DrawerItem>
        ) : (
          analyses.map((analysis, index) => (
            <DrawerItem key={`${analysis.name ?? "analysis"}-${index}`} name={analysis.name ?? `Analysis ${index + 1}`}>
              <WithTooltip>
                template: {formatOptional(analysis.templateName)}, args: {String(analysis.args?.length ?? 0)}
              </WithTooltip>
            </DrawerItem>
          ))
        )}

        <Gutter size="md" />
        <DrawerTitle>Conditions</DrawerTitle>
        {conditions.length === 0 ? (
          <DrawerItem name="Summary">None</DrawerItem>
        ) : (
          conditions.map((condition, index) => (
            <DrawerItem
              key={`${condition.type ?? "condition"}-${index}`}
              name={condition.type ?? `Condition ${index + 1}`}
            >
              <WithTooltip>
                {formatOptional(condition.status)} - {formatOptional(condition.reason ?? condition.message)}
              </WithTooltip>
            </DrawerItem>
          ))
        )}
      </>
    );
  }),
);
