import { Common, Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { Link } from "react-router-dom";
import { withErrorPage } from "../../components/error-page";
import { ArgoWorkflowTemplate, type ArgoWorkflowTemplateApi, getArgoWorkflowTemplateStore } from "../../k8s/workflows";

const {
  Component: { KubeObjectAge, KubeObjectListLayout, WithTooltip },
  K8sApi: { namespacesApi },
  Navigation: { getDetailsUrl },
} = Renderer;

const {
  Util: { stopPropagation },
} = Common;

const sortingCallbacks = {
  name: (object: ArgoWorkflowTemplate) => object.getName(),
  namespace: (object: ArgoWorkflowTemplate) => object.getNs(),
  entrypoint: (object: ArgoWorkflowTemplate) => object.spec?.entrypoint ?? "",
  serviceAccountName: (object: ArgoWorkflowTemplate) => object.spec?.serviceAccountName ?? "",
  age: (object: ArgoWorkflowTemplate) => object.getCreationTimestamp(),
};

const renderTableHeader: { title: string; sortBy: keyof typeof sortingCallbacks }[] = [
  { title: "Name", sortBy: "name" },
  { title: "Namespace", sortBy: "namespace" },
  { title: "Entrypoint", sortBy: "entrypoint" },
  { title: "Service Account", sortBy: "serviceAccountName" },
  { title: "Age", sortBy: "age" },
];

export const ArgoWorkflowsTemplatesTabContent = observer(() => {
  const workflowTemplateStore = getArgoWorkflowTemplateStore();

  const getWorkflowTemplateDetailsUrl = (object: ArgoWorkflowTemplate) =>
    getDetailsUrl(
      workflowTemplateStore.api.formatUrlForNotListing({
        namespace: object.getNs(),
        name: object.getName(),
      }),
    );

  return (
    <KubeObjectListLayout<ArgoWorkflowTemplate, ArgoWorkflowTemplateApi>
      tableId={`${ArgoWorkflowTemplate.crd.plural}Table`}
      className=""
      store={workflowTemplateStore}
      sortingCallbacks={sortingCallbacks}
      searchFilters={[(object: ArgoWorkflowTemplate) => object.getSearchFields()]}
      renderHeaderTitle={ArgoWorkflowTemplate.crd.title}
      renderTableHeader={renderTableHeader}
      renderTableContents={(object: ArgoWorkflowTemplate) => [
        <Link key="name-link" to={getWorkflowTemplateDetailsUrl(object)} onClick={stopPropagation}>
          <WithTooltip>{object.getName()}</WithTooltip>
        </Link>,
        <Link
          key="namespace-link"
          to={getDetailsUrl(namespacesApi.formatUrlForNotListing({ name: object.getNs() }))}
          onClick={stopPropagation}
        >
          <WithTooltip>{object.getNs()}</WithTooltip>
        </Link>,
        <WithTooltip>{object.spec?.entrypoint ?? "N/A"}</WithTooltip>,
        <WithTooltip>{object.spec?.serviceAccountName ?? "N/A"}</WithTooltip>,
        <KubeObjectAge object={object} key="age" />,
      ]}
    />
  );
});

export interface ArgoWorkflowsTemplatesPageProps {
  extension: Renderer.LensExtension;
}

export const ArgoWorkflowsTemplatesPage = observer((props: ArgoWorkflowsTemplatesPageProps) =>
  withErrorPage(props, () => <ArgoWorkflowsTemplatesTabContent />),
);
