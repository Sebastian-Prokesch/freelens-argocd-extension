import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { Link } from "react-router-dom";
import { withErrorPage } from "../components/error-page";
import { ArgoApplicationSet, getArgoApplicationStore } from "../k8s/argocd";

const {
  Component: { BadgeBoolean, DrawerItem, DrawerTitle, Gutter, WithTooltip },
  Navigation: { getDetailsUrl },
} = Renderer;

export interface ArgoApplicationSetDetailsProps extends Renderer.Component.KubeObjectDetailsProps<ArgoApplicationSet> {
  extension: Renderer.LensExtension;
}

const formatStringList = (values?: string[]) => {
  if (!values?.length) {
    return "None";
  }

  return values.join(", ");
};

const isDefinedString = (value: unknown): value is string => typeof value === "string" && value.length > 0;

const getGeneratedApplications = (status: any): string[] => {
  const fromResources = (status?.resources ?? []).map((item: any) => item?.name).filter(isDefinedString);
  const fromStatus = (status?.applicationStatus ?? []).map((item: any) => item?.application).filter(isDefinedString);

  return [...new Set([...fromResources, ...fromStatus])];
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

    return (
      <>
        <DrawerTitle>ApplicationSet</DrawerTitle>
        <DrawerItem name="Generators">{String(spec.generators?.length ?? 0)}</DrawerItem>
        <DrawerItem name="Template Name">{spec.template?.metadata?.name ?? "N/A"}</DrawerItem>
        <DrawerItem name="Template Project">{spec.template?.spec?.project ?? "N/A"}</DrawerItem>

        <Gutter size="md" />

        <DrawerTitle>Status</DrawerTitle>
        <DrawerItem name="Conditions">{String(status?.conditions?.length ?? 0)}</DrawerItem>
        <DrawerItem name="Managed Applications">{String(status?.resources?.length ?? 0)}</DrawerItem>
        <DrawerItem name="Generated Applications">
          {generatedApplications.length > 0
            ? generatedApplications.map((applicationName) => (
                <div key={applicationName}>
                  <Link to={getApplicationDetailsUrl(namespace, applicationName)}>
                    <WithTooltip>{applicationName}</WithTooltip>
                  </Link>
                </div>
              ))
            : "None"}
        </DrawerItem>
        <DrawerItem name="Latest Parameters">
          {formatStringList(status?.applicationStatus?.map((app: any) => app.application))}
        </DrawerItem>
        <DrawerItem name="Observed Generation">
          {status?.observedGeneration ? String(status.observedGeneration) : "N/A"}
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
