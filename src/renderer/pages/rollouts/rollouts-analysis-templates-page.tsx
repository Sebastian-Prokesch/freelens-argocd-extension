import { Common, Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { Link } from "react-router-dom";
import { withErrorPage } from "../../components/error-page";
import { ArgoAnalysisTemplate, type ArgoAnalysisTemplateApi, getArgoAnalysisTemplateStore } from "../../k8s/rollouts";
import styles from "./argo-rollouts-page.module.scss";
import stylesInline from "./argo-rollouts-page.module.scss?inline";

const {
  Component: { KubeObjectAge, KubeObjectListLayout, WithTooltip },
  K8sApi: { namespacesApi },
  Navigation: { getDetailsUrl },
} = Renderer;

const {
  Util: { stopPropagation },
} = Common;

const sortingCallbacks = {
  name: (object: ArgoAnalysisTemplate) => object.getName(),
  namespace: (object: ArgoAnalysisTemplate) => object.getNs(),
  metrics: (object: ArgoAnalysisTemplate) => object.spec?.metrics?.length ?? 0,
  args: (object: ArgoAnalysisTemplate) => object.spec?.args?.length ?? 0,
  age: (object: ArgoAnalysisTemplate) => object.getCreationTimestamp(),
};

const renderTableHeader: { id: string; title: string; sortBy: keyof typeof sortingCallbacks; className?: string }[] = [
  { id: "name", title: "Name", sortBy: "name" },
  { id: "namespace", title: "Namespace", sortBy: "namespace" },
  { id: "metrics", title: "Metrics", sortBy: "metrics" },
  { id: "args", title: "Args", sortBy: "args" },
  { id: "age", title: "Age", sortBy: "age", className: styles.age },
];

export interface ArgoRolloutsAnalysisTemplatesPageProps {
  extension: Renderer.LensExtension;
}

export const ArgoRolloutsAnalysisTemplatesTabContent = observer(() => {
  const analysisTemplateStore = getArgoAnalysisTemplateStore();

  const getDetailsRoute = (object: ArgoAnalysisTemplate) =>
    getDetailsUrl(
      analysisTemplateStore.api.formatUrlForNotListing({
        namespace: object.getNs(),
        name: object.getName(),
      }),
    );

  return (
    <>
      <style>{stylesInline}</style>
      <KubeObjectListLayout<ArgoAnalysisTemplate, ArgoAnalysisTemplateApi>
        tableId={`${ArgoAnalysisTemplate.crd.plural}Table`}
        isConfigurable
        className={styles.page}
        store={analysisTemplateStore}
        sortingCallbacks={sortingCallbacks}
        searchFilters={[(object: ArgoAnalysisTemplate) => object.getSearchFields()]}
        renderHeaderTitle={ArgoAnalysisTemplate.crd.title}
        renderTableHeader={renderTableHeader}
        renderTableContents={(object: ArgoAnalysisTemplate) => [
          <Link key="name-link" to={getDetailsRoute(object)} onClick={stopPropagation}>
            <WithTooltip>{object.getName()}</WithTooltip>
          </Link>,
          <Link
            key="namespace-link"
            to={getDetailsUrl(namespacesApi.formatUrlForNotListing({ name: object.getNs() }))}
            onClick={stopPropagation}
          >
            <WithTooltip>{object.getNs()}</WithTooltip>
          </Link>,
          <WithTooltip>{String(object.spec?.metrics?.length ?? 0)}</WithTooltip>,
          <WithTooltip>{String(object.spec?.args?.length ?? 0)}</WithTooltip>,
          <KubeObjectAge object={object} key="age" />,
        ]}
      />
    </>
  );
});

export const ArgoRolloutsAnalysisTemplatesPage = observer((props: ArgoRolloutsAnalysisTemplatesPageProps) =>
  withErrorPage(props, () => {
    return <ArgoRolloutsAnalysisTemplatesTabContent />;
  }),
);
