import { Common, Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { Link } from "react-router-dom";
import { withErrorPage } from "../../components/error-page";
import {
  ArgoExperiment,
  type ArgoExperimentApi,
  getArgoExperimentStore,
  getExperimentAnalysisCount,
  getExperimentPhase,
  getExperimentTemplateCount,
} from "../../k8s/rollouts";
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
  name: (object: ArgoExperiment) => object.getName(),
  namespace: (object: ArgoExperiment) => object.getNs(),
  phase: (object: ArgoExperiment) => getExperimentPhase(object),
  templates: (object: ArgoExperiment) => getExperimentTemplateCount(object),
  analyses: (object: ArgoExperiment) => getExperimentAnalysisCount(object),
  age: (object: ArgoExperiment) => object.getCreationTimestamp(),
};

const renderTableHeader: { id: string; title: string; sortBy: keyof typeof sortingCallbacks; className?: string }[] = [
  { id: "name", title: "Name", sortBy: "name" },
  { id: "namespace", title: "Namespace", sortBy: "namespace" },
  { id: "phase", title: "Phase", sortBy: "phase", className: styles.state },
  { id: "templates", title: "Templates", sortBy: "templates" },
  { id: "analyses", title: "Analyses", sortBy: "analyses" },
  { id: "age", title: "Age", sortBy: "age", className: styles.age },
];

export interface ArgoRolloutsExperimentsPageProps {
  extension: Renderer.LensExtension;
}

export const ArgoRolloutsExperimentsTabContent = observer(() => {
  const experimentStore = getArgoExperimentStore();

  const getDetailsRoute = (object: ArgoExperiment) =>
    getDetailsUrl(
      experimentStore.api.formatUrlForNotListing({
        namespace: object.getNs(),
        name: object.getName(),
      }),
    );

  return (
    <>
      <style>{stylesInline}</style>
      <KubeObjectListLayout<ArgoExperiment, ArgoExperimentApi>
        tableId={`${ArgoExperiment.crd.plural}Table`}
        isConfigurable
        className={styles.page}
        store={experimentStore}
        sortingCallbacks={sortingCallbacks}
        searchFilters={[(object: ArgoExperiment) => object.getSearchFields()]}
        renderHeaderTitle={ArgoExperiment.crd.title}
        renderTableHeader={renderTableHeader}
        renderTableContents={(object: ArgoExperiment) => [
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
          <WithTooltip>{getExperimentPhase(object)}</WithTooltip>,
          <WithTooltip>{String(getExperimentTemplateCount(object))}</WithTooltip>,
          <WithTooltip>{String(getExperimentAnalysisCount(object))}</WithTooltip>,
          <KubeObjectAge object={object} key="age" />,
        ]}
      />
    </>
  );
});

export const ArgoRolloutsExperimentsPage = observer((props: ArgoRolloutsExperimentsPageProps) =>
  withErrorPage(props, () => {
    return <ArgoRolloutsExperimentsTabContent />;
  }),
);
