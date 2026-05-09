import { Common, Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { Link } from "react-router-dom";
import { withErrorPage } from "../../components/error-page";
import {
  ArgoClusterAnalysisTemplate,
  type ArgoClusterAnalysisTemplateApi,
  getArgoClusterAnalysisTemplateStore,
} from "../../k8s/rollouts";
import styles from "./argo-rollouts-page.module.scss";
import stylesInline from "./argo-rollouts-page.module.scss?inline";

const {
  Component: { KubeObjectAge, KubeObjectListLayout, WithTooltip },
  Navigation: { getDetailsUrl },
} = Renderer;

const {
  Util: { stopPropagation },
} = Common;

const sortingCallbacks = {
  name: (object: ArgoClusterAnalysisTemplate) => object.getName(),
  metrics: (object: ArgoClusterAnalysisTemplate) => object.spec?.metrics?.length ?? 0,
  args: (object: ArgoClusterAnalysisTemplate) => object.spec?.args?.length ?? 0,
  age: (object: ArgoClusterAnalysisTemplate) => object.getCreationTimestamp(),
};

const renderTableHeader: { id: string; title: string; sortBy: keyof typeof sortingCallbacks; className?: string }[] = [
  { id: "name", title: "Name", sortBy: "name" },
  { id: "metrics", title: "Metrics", sortBy: "metrics" },
  { id: "args", title: "Args", sortBy: "args" },
  { id: "age", title: "Age", sortBy: "age", className: styles.age },
];

export interface ArgoRolloutsClusterAnalysisTemplatesPageProps {
  extension: Renderer.LensExtension;
}

export const ArgoRolloutsClusterAnalysisTemplatesTabContent = observer(() => {
  const clusterAnalysisTemplateStore = getArgoClusterAnalysisTemplateStore();

  const getDetailsRoute = (object: ArgoClusterAnalysisTemplate) =>
    getDetailsUrl(
      clusterAnalysisTemplateStore.api.formatUrlForNotListing({
        name: object.getName(),
      }),
    );

  return (
    <>
      <style>{stylesInline}</style>
      <KubeObjectListLayout<ArgoClusterAnalysisTemplate, ArgoClusterAnalysisTemplateApi>
        tableId={`${ArgoClusterAnalysisTemplate.crd.plural}Table`}
        isConfigurable
        className={styles.page}
        store={clusterAnalysisTemplateStore}
        sortingCallbacks={sortingCallbacks}
        searchFilters={[(object: ArgoClusterAnalysisTemplate) => object.getSearchFields()]}
        renderHeaderTitle={ArgoClusterAnalysisTemplate.crd.title}
        renderTableHeader={renderTableHeader}
        renderTableContents={(object: ArgoClusterAnalysisTemplate) => [
          <Link key="name-link" to={getDetailsRoute(object)} onClick={stopPropagation}>
            <WithTooltip>{object.getName()}</WithTooltip>
          </Link>,
          <WithTooltip>{String(object.spec?.metrics?.length ?? 0)}</WithTooltip>,
          <WithTooltip>{String(object.spec?.args?.length ?? 0)}</WithTooltip>,
          <KubeObjectAge object={object} key="age" />,
        ]}
      />
    </>
  );
});

export const ArgoRolloutsClusterAnalysisTemplatesPage = observer(
  (props: ArgoRolloutsClusterAnalysisTemplatesPageProps) =>
    withErrorPage(props, () => {
      return <ArgoRolloutsClusterAnalysisTemplatesTabContent />;
    }),
);
