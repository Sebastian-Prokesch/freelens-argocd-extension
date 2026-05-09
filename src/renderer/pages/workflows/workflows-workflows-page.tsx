import { Common, Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { Link } from "react-router-dom";
import { withErrorPage } from "../../components/error-page";
import {
  ArgoWorkflow,
  type ArgoWorkflowApi,
  getArgoWorkflowDuration,
  getArgoWorkflowProgress,
  getArgoWorkflowStatusReason,
  getArgoWorkflowStore,
  getWorkflowPhase,
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
  name: (object: ArgoWorkflow) => object.getName(),
  namespace: (object: ArgoWorkflow) => object.getNs(),
  phase: (object: ArgoWorkflow) => getWorkflowPhase(object),
  progress: (object: ArgoWorkflow) => getArgoWorkflowProgress(object),
  duration: (object: ArgoWorkflow) => getArgoWorkflowDuration(object),
  reason: (object: ArgoWorkflow) => getArgoWorkflowStatusReason(object),
  age: (object: ArgoWorkflow) => object.getCreationTimestamp(),
};

const renderTableHeader: { id: string; title: string; sortBy: keyof typeof sortingCallbacks }[] = [
  { id: "name", title: "Name", sortBy: "name" },
  { id: "namespace", title: "Namespace", sortBy: "namespace" },
  { id: "phase", title: "Phase", sortBy: "phase" },
  { id: "progress", title: "Progress", sortBy: "progress" },
  { id: "duration", title: "Duration", sortBy: "duration" },
  { id: "reason", title: "Reason", sortBy: "reason" },
  { id: "age", title: "Age", sortBy: "age" },
];

export const ArgoWorkflowsTabContent = observer(() => {
  const workflowStore = getArgoWorkflowStore();

  const getWorkflowDetailsUrl = (object: ArgoWorkflow) =>
    getDetailsUrl(
      workflowStore.api.formatUrlForNotListing({
        namespace: object.getNs(),
        name: object.getName(),
      }),
    );

  return (
    <KubeObjectListLayout<ArgoWorkflow, ArgoWorkflowApi>
      tableId={`${ArgoWorkflow.crd.plural}Table`}
      isConfigurable
      className=""
      store={workflowStore}
      sortingCallbacks={sortingCallbacks}
      searchFilters={[(object: ArgoWorkflow) => object.getSearchFields()]}
      renderHeaderTitle={ArgoWorkflow.crd.title}
      renderTableHeader={renderTableHeader}
      renderTableContents={(object: ArgoWorkflow) => [
        <Link key="name-link" to={getWorkflowDetailsUrl(object)} onClick={stopPropagation}>
          <WithTooltip>{object.getName()}</WithTooltip>
        </Link>,
        <Link
          key="namespace-link"
          to={getDetailsUrl(namespacesApi.formatUrlForNotListing({ name: object.getNs() }))}
          onClick={stopPropagation}
        >
          <WithTooltip>{object.getNs()}</WithTooltip>
        </Link>,
        <WithTooltip>{getWorkflowPhase(object)}</WithTooltip>,
        <WithTooltip>{getArgoWorkflowProgress(object)}</WithTooltip>,
        <WithTooltip>{getArgoWorkflowDuration(object)}</WithTooltip>,
        <WithTooltip>{getArgoWorkflowStatusReason(object)}</WithTooltip>,
        <KubeObjectAge object={object} key="age" />,
      ]}
    />
  );
});

export interface ArgoWorkflowsWorkflowsPageProps {
  extension: Renderer.LensExtension;
}

export const ArgoWorkflowsWorkflowsPage = observer((props: ArgoWorkflowsWorkflowsPageProps) =>
  withErrorPage(props, () => <ArgoWorkflowsTabContent />),
);
