import { Common, Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { Link } from "react-router-dom";
import { withErrorPage } from "../../components/error-page";
import {
  ArgoAnalysisRun,
  type ArgoAnalysisRunApi,
  getAnalysisRunMeasurementCount,
  getAnalysisRunMetricCount,
  getAnalysisRunPhase,
  getArgoAnalysisRunStore,
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
  name: (object: ArgoAnalysisRun) => object.getName(),
  namespace: (object: ArgoAnalysisRun) => object.getNs(),
  phase: (object: ArgoAnalysisRun) => getAnalysisRunPhase(object),
  metrics: (object: ArgoAnalysisRun) => getAnalysisRunMetricCount(object),
  measurements: (object: ArgoAnalysisRun) => getAnalysisRunMeasurementCount(object),
  started: (object: ArgoAnalysisRun) => object.status?.startedAt ?? "",
  finished: (object: ArgoAnalysisRun) => object.status?.finishedAt ?? "",
  age: (object: ArgoAnalysisRun) => object.getCreationTimestamp(),
};

const renderTableHeader: { id: string; title: string; sortBy: keyof typeof sortingCallbacks; className?: string }[] = [
  { id: "name", title: "Name", sortBy: "name" },
  { id: "namespace", title: "Namespace", sortBy: "namespace" },
  { id: "phase", title: "Phase", sortBy: "phase", className: styles.state },
  { id: "metrics", title: "Metrics", sortBy: "metrics" },
  { id: "measurements", title: "Measurements", sortBy: "measurements" },
  { id: "started", title: "Started", sortBy: "started" },
  { id: "finished", title: "Finished", sortBy: "finished" },
  { id: "age", title: "Age", sortBy: "age", className: styles.age },
];

const formatOptional = (value: string | undefined): string => value || "N/A";

export interface ArgoRolloutsAnalysisRunsPageProps {
  extension: Renderer.LensExtension;
}

export const ArgoRolloutsAnalysisRunsTabContent = observer(() => {
  const analysisRunStore = getArgoAnalysisRunStore();

  const getDetailsRoute = (object: ArgoAnalysisRun) =>
    getDetailsUrl(
      analysisRunStore.api.formatUrlForNotListing({
        namespace: object.getNs(),
        name: object.getName(),
      }),
    );

  return (
    <>
      <style>{stylesInline}</style>
      <KubeObjectListLayout<ArgoAnalysisRun, ArgoAnalysisRunApi>
        tableId={`${ArgoAnalysisRun.crd.plural}Table`}
        isConfigurable
        className={styles.page}
        store={analysisRunStore}
        sortingCallbacks={sortingCallbacks}
        searchFilters={[(object: ArgoAnalysisRun) => object.getSearchFields()]}
        renderHeaderTitle={ArgoAnalysisRun.crd.title}
        renderTableHeader={renderTableHeader}
        renderTableContents={(object: ArgoAnalysisRun) => [
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
          <WithTooltip>{getAnalysisRunPhase(object)}</WithTooltip>,
          <WithTooltip>{String(getAnalysisRunMetricCount(object))}</WithTooltip>,
          <WithTooltip>{String(getAnalysisRunMeasurementCount(object))}</WithTooltip>,
          <WithTooltip>{formatOptional(object.status?.startedAt)}</WithTooltip>,
          <WithTooltip>{formatOptional(object.status?.finishedAt)}</WithTooltip>,
          <KubeObjectAge object={object} key="age" />,
        ]}
      />
    </>
  );
});

export const ArgoRolloutsAnalysisRunsPage = observer((props: ArgoRolloutsAnalysisRunsPageProps) =>
  withErrorPage(props, () => {
    return <ArgoRolloutsAnalysisRunsTabContent />;
  }),
);
