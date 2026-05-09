import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { Link } from "react-router-dom";
import { withErrorPage } from "../components/error-page";
import { ArgoApplicationSet, getArgoApplicationStore } from "../k8s/argocd";

const {
  Component: { BadgeBoolean, DrawerItem, DrawerTitle, Gutter, Table, TableCell, TableHead, TableRow, WithTooltip },
  Navigation: { getDetailsUrl },
} = Renderer;

export interface ArgoApplicationSetDetailsProps extends Renderer.Component.KubeObjectDetailsProps<ArgoApplicationSet> {
  extension: Renderer.LensExtension;
}

const isDefinedString = (value: unknown): value is string => typeof value === "string" && value.length > 0;

const getGeneratedApplications = (status: any): string[] => {
  const fromResources = (status?.resources ?? []).map((item: any) => item?.name).filter(isDefinedString);
  const fromStatus = (status?.applicationStatus ?? []).map((item: any) => item?.application).filter(isDefinedString);

  return [...new Set([...fromResources, ...fromStatus])];
};

const getGeneratorSummary = (generators: any[]): string => {
  if (!generators.length) {
    return "None";
  }

  const typeCounts: Record<string, number> = {};

  for (const generator of generators) {
    const generatorTypes = Object.keys(generator ?? {}).filter((key) => generator?.[key] !== undefined);

    for (const type of generatorTypes) {
      typeCounts[type] = (typeCounts[type] ?? 0) + 1;
    }
  }

  return Object.entries(typeCounts)
    .map(([type, count]) => `${type} (${count})`)
    .join(", ");
};

const getTemplateSummary = (template: any): string => {
  if (!template?.spec) {
    return "Template spec not configured";
  }

  const summary: string[] = [];
  const templateSpec = template.spec;

  if (templateSpec.project) summary.push(`project=${templateSpec.project}`);
  if (templateSpec.destination?.namespace) summary.push(`namespace=${templateSpec.destination.namespace}`);
  if (templateSpec.destination?.server) summary.push(`server=${templateSpec.destination.server}`);
  if (templateSpec.destination?.name) summary.push(`cluster=${templateSpec.destination.name}`);
  if (templateSpec.source?.repoURL) summary.push(`sourceRepo=${templateSpec.source.repoURL}`);
  if (Array.isArray(templateSpec.sources) && templateSpec.sources.length > 0) {
    summary.push(`sources=${templateSpec.sources.length}`);
  }
  if (templateSpec.syncPolicy?.automated) summary.push("automatedSync=true");

  return summary.length > 0 ? summary.join(", ") : "Template spec configured";
};

const getApplicationDetailsUrl = (namespace: string, applicationName: string): string => {
  const applicationStore = getArgoApplicationStore();

  return getDetailsUrl(
    applicationStore.api.formatUrlForNotListing({
      namespace,
      name: applicationName,
    }),
  );
};

const getConditionBooleanStatus = (conditions: any[] | undefined, type: string): boolean | undefined => {
  const condition = (conditions ?? []).find((item) => item?.type === type);
  if (!condition) {
    return undefined;
  }

  if (condition.status === "True") {
    return true;
  }

  if (condition.status === "False") {
    return false;
  }

  return undefined;
};

const getCondition = (conditions: any[] | undefined, type: string): any | undefined =>
  (conditions ?? []).find((item) => item?.type === type);

export const ArgoApplicationSetDetails = observer((props: ArgoApplicationSetDetailsProps) =>
  withErrorPage(props, () => {
    const { object } = props;
    const spec = object.spec as any;
    const status = object.status as any;
    const namespace = object.getNs() ?? object.metadata?.namespace ?? "default";
    const generatedApplications = getGeneratedApplications(status);
    const resourcesUpToDate =
      getConditionBooleanStatus(status?.conditions, "ResourcesUpToDate") ??
      getConditionBooleanStatus(status?.conditions, "ApplicationSetUpToDate") ??
      false;
    const hasError = getConditionBooleanStatus(status?.conditions, "ErrorOccurred") ?? false;
    const errorCondition = getCondition(status?.conditions, "ErrorOccurred");
    const errorMessage =
      errorCondition?.message ?? errorCondition?.reason ?? "ApplicationSet reports an unspecified error.";
    const generators = Array.isArray(spec.generators) ? spec.generators : [];
    const applicationStatusByName = new Map<string, any>(
      (status?.applicationStatus ?? [])
        .filter((item: any) => isDefinedString(item?.application))
        .map((item: any) => [item.application, item]),
    );

    return (
      <>
        <DrawerTitle>ApplicationSet</DrawerTitle>
        <DrawerItem name="Generator Count">{String(generators.length)}</DrawerItem>
        <DrawerItem name="Generator Types">{getGeneratorSummary(generators)}</DrawerItem>
        <DrawerItem name="Template Name">{spec.template?.metadata?.name ?? "N/A"}</DrawerItem>
        <DrawerItem name="Template Project">{spec.template?.spec?.project ?? "N/A"}</DrawerItem>
        <DrawerItem name="Template Summary">{getTemplateSummary(spec.template)}</DrawerItem>

        <Gutter size="md" />

        <DrawerTitle>Status</DrawerTitle>
        <DrawerItem name="Conditions Count">{String(status?.conditions?.length ?? 0)}</DrawerItem>
        <DrawerItem name="Managed Applications">{String(status?.resources?.length ?? 0)}</DrawerItem>
        <DrawerItem name="Generated Applications">
          {generatedApplications.length > 0 ? (
            <Table tableId="generated-applications" scrollable={false} sortSyncWithUrl={false}>
              <TableHead flat sticky={false}>
                <TableCell>Name</TableCell>
                <TableCell>Sync Status</TableCell>
                <TableCell>Health Status</TableCell>
              </TableHead>
              {generatedApplications.map((applicationName) => {
                const appStatus = applicationStatusByName.get(applicationName);

                return (
                  <TableRow key={applicationName}>
                    <TableCell>
                      <Link to={getApplicationDetailsUrl(namespace, applicationName)}>
                        <WithTooltip>{applicationName}</WithTooltip>
                      </Link>
                    </TableCell>
                    <TableCell>{appStatus?.sync?.status ?? "Unknown"}</TableCell>
                    <TableCell>{appStatus?.health?.status ?? "Unknown"}</TableCell>
                  </TableRow>
                );
              })}
            </Table>
          ) : (
            "None"
          )}
        </DrawerItem>
        <DrawerItem name="Observed Generation">
          {status?.observedGeneration ? String(status.observedGeneration) : "N/A"}
        </DrawerItem>
        <DrawerItem name="Conditions">
          {status?.conditions?.length ? (
            <Table tableId="applicationset-conditions" scrollable={false} sortSyncWithUrl={false}>
              <TableHead flat sticky={false}>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Message</TableCell>
              </TableHead>
              {status.conditions.map((condition: any, index: number) => (
                <TableRow key={`${condition?.type ?? "condition"}-${index}`}>
                  <TableCell>{condition?.type ?? "Unknown"}</TableCell>
                  <TableCell>{condition?.status ?? "Unknown"}</TableCell>
                  <TableCell>{condition?.reason ?? "N/A"}</TableCell>
                  <TableCell>{condition?.message ?? "N/A"}</TableCell>
                </TableRow>
              ))}
            </Table>
          ) : (
            "None"
          )}
        </DrawerItem>
        {hasError ? (
          <>
            <DrawerItem name="Error Occurred">
              <BadgeBoolean value={true} />
            </DrawerItem>
            <DrawerItem name="Error Message">{errorMessage}</DrawerItem>
          </>
        ) : null}
        <DrawerItem name="Resources Up-to-date">
          <BadgeBoolean value={resourcesUpToDate} />
        </DrawerItem>
      </>
    );
  }),
);
