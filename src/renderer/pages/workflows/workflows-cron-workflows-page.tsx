import { Common, Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { Link } from "react-router-dom";
import { withErrorPage } from "../../components/error-page";
import {
  ArgoCronWorkflow,
  type ArgoCronWorkflowApi,
  getArgoCronWorkflowStore,
  getCronWorkflowActiveCount,
  getCronWorkflowLastScheduled,
  getCronWorkflowSchedules,
  getCronWorkflowSuspendLabel,
} from "../../k8s/workflows";

const {
  Component: { KubeObjectAge, KubeObjectListLayout, WithTooltip },
  K8sApi: { namespacesApi },
  Navigation: { getDetailsUrl },
} = Renderer;

const {
  Util: { stopPropagation },
} = Common;

const sortingCallbacks = {
  name: (object: ArgoCronWorkflow) => object.getName(),
  namespace: (object: ArgoCronWorkflow) => object.getNs(),
  schedule: (object: ArgoCronWorkflow) => getCronWorkflowSchedules(object),
  timezone: (object: ArgoCronWorkflow) => object.spec?.timezone ?? "",
  suspended: (object: ArgoCronWorkflow) => getCronWorkflowSuspendLabel(object),
  active: (object: ArgoCronWorkflow) => getCronWorkflowActiveCount(object),
  lastScheduled: (object: ArgoCronWorkflow) => getCronWorkflowLastScheduled(object),
  age: (object: ArgoCronWorkflow) => object.getCreationTimestamp(),
};

const renderTableHeader: { title: string; sortBy: keyof typeof sortingCallbacks }[] = [
  { title: "Name", sortBy: "name" },
  { title: "Namespace", sortBy: "namespace" },
  { title: "Schedule", sortBy: "schedule" },
  { title: "Timezone", sortBy: "timezone" },
  { title: "Suspended", sortBy: "suspended" },
  { title: "Active", sortBy: "active" },
  { title: "Last Scheduled", sortBy: "lastScheduled" },
  { title: "Age", sortBy: "age" },
];

export const ArgoWorkflowsCronWorkflowsTabContent = observer(() => {
  const cronWorkflowStore = getArgoCronWorkflowStore();

  const getCronWorkflowDetailsUrl = (object: ArgoCronWorkflow) =>
    getDetailsUrl(
      cronWorkflowStore.api.formatUrlForNotListing({
        namespace: object.getNs(),
        name: object.getName(),
      }),
    );

  return (
    <KubeObjectListLayout<ArgoCronWorkflow, ArgoCronWorkflowApi>
      tableId={`${ArgoCronWorkflow.crd.plural}Table`}
      className=""
      store={cronWorkflowStore}
      sortingCallbacks={sortingCallbacks}
      searchFilters={[(object: ArgoCronWorkflow) => object.getSearchFields()]}
      renderHeaderTitle={ArgoCronWorkflow.crd.title}
      renderTableHeader={renderTableHeader}
      renderTableContents={(object: ArgoCronWorkflow) => [
        <Link key="name-link" to={getCronWorkflowDetailsUrl(object)} onClick={stopPropagation}>
          <WithTooltip>{object.getName()}</WithTooltip>
        </Link>,
        <Link
          key="namespace-link"
          to={getDetailsUrl(namespacesApi.formatUrlForNotListing({ name: object.getNs() }))}
          onClick={stopPropagation}
        >
          <WithTooltip>{object.getNs()}</WithTooltip>
        </Link>,
        <WithTooltip>{getCronWorkflowSchedules(object)}</WithTooltip>,
        <WithTooltip>{object.spec?.timezone ?? "N/A"}</WithTooltip>,
        <WithTooltip>{getCronWorkflowSuspendLabel(object)}</WithTooltip>,
        <WithTooltip>{String(getCronWorkflowActiveCount(object))}</WithTooltip>,
        <WithTooltip>{getCronWorkflowLastScheduled(object)}</WithTooltip>,
        <KubeObjectAge object={object} key="age" />,
      ]}
    />
  );
});

export interface ArgoWorkflowsCronWorkflowsPageProps {
  extension: Renderer.LensExtension;
}

export const ArgoWorkflowsCronWorkflowsPage = observer((props: ArgoWorkflowsCronWorkflowsPageProps) =>
  withErrorPage(props, () => <ArgoWorkflowsCronWorkflowsTabContent />),
);
