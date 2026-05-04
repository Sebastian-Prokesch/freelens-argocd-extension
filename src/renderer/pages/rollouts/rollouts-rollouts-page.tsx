import { Common, Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { Link } from "react-router-dom";
import { withErrorPage } from "../../components/error-page";
import {
  ArgoRollout,
  type ArgoRolloutApi,
  getArgoRolloutStore,
  getBlueGreenPromotionLabel,
  getBlueGreenTrafficTooltip,
  getRolloutStateLabel,
  getRolloutStateReason,
  getRolloutStrategyLabel,
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
  name: (object: ArgoRollout) => object.getName(),
  namespace: (object: ArgoRollout) => object.getNs(),
  strategy: (object: ArgoRollout) => getRolloutStrategyLabel(object.spec?.strategy),
  desired: (object: ArgoRollout) => object.spec?.replicas ?? object.status?.replicas ?? 0,
  updated: (object: ArgoRollout) => object.status?.updatedReplicas ?? 0,
  ready: (object: ArgoRollout) => object.status?.readyReplicas ?? 0,
  available: (object: ArgoRollout) => object.status?.availableReplicas ?? 0,
  traffic: (object: ArgoRollout) => getBlueGreenPromotionLabel(object),
  state: (object: ArgoRollout) => getRolloutStateLabel(object),
  reason: (object: ArgoRollout) => getRolloutStateReason(object),
  age: (object: ArgoRollout) => object.getCreationTimestamp(),
};

const renderTableHeader: { title: string; sortBy: keyof typeof sortingCallbacks; className?: string }[] = [
  { title: "Name", sortBy: "name" },
  { title: "Namespace", sortBy: "namespace" },
  { title: "Strategy", sortBy: "strategy", className: styles.strategy },
  { title: "Desired", sortBy: "desired" },
  { title: "Updated", sortBy: "updated" },
  { title: "Ready", sortBy: "ready" },
  { title: "Available", sortBy: "available" },
  { title: "Traffic", sortBy: "traffic", className: styles.traffic },
  { title: "State", sortBy: "state", className: styles.state },
  { title: "Reason", sortBy: "reason", className: styles.reason },
  { title: "Age", sortBy: "age", className: styles.age },
];

export interface ArgoRolloutsPageProps {
  extension: Renderer.LensExtension;
}

const formatReplicaCell = (value: number | undefined) =>
  value === undefined || Number.isNaN(value) ? "N/A" : String(value);

export const ArgoRolloutsTabContent = observer(() => {
  const rolloutStore = getArgoRolloutStore();

  const getRolloutDetailsUrl = (object: ArgoRollout) =>
    getDetailsUrl(
      rolloutStore.api.formatUrlForNotListing({
        namespace: object.getNs(),
        name: object.getName(),
      }),
    );

  return (
    <>
      <style>{stylesInline}</style>
      <KubeObjectListLayout<ArgoRollout, ArgoRolloutApi>
        tableId={`${ArgoRollout.crd.plural}Table`}
        className={styles.page}
        store={rolloutStore}
        sortingCallbacks={sortingCallbacks}
        searchFilters={[(object: ArgoRollout) => object.getSearchFields()]}
        renderHeaderTitle={ArgoRollout.crd.title}
        renderTableHeader={renderTableHeader}
        renderTableContents={(object: ArgoRollout) => [
          <Link key="name-link" to={getRolloutDetailsUrl(object)} onClick={stopPropagation}>
            <WithTooltip>{object.getName()}</WithTooltip>
          </Link>,
          <Link
            key="namespace-link"
            to={getDetailsUrl(namespacesApi.formatUrlForNotListing({ name: object.getNs() }))}
            onClick={stopPropagation}
          >
            <WithTooltip>{object.getNs()}</WithTooltip>
          </Link>,
          <WithTooltip>{getRolloutStrategyLabel(object.spec?.strategy)}</WithTooltip>,
          <WithTooltip>{formatReplicaCell(object.spec?.replicas ?? object.status?.replicas)}</WithTooltip>,
          <WithTooltip>{formatReplicaCell(object.status?.updatedReplicas)}</WithTooltip>,
          <WithTooltip>{formatReplicaCell(object.status?.readyReplicas)}</WithTooltip>,
          <WithTooltip>{formatReplicaCell(object.status?.availableReplicas)}</WithTooltip>,
          <WithTooltip tooltip={getBlueGreenTrafficTooltip(object) || undefined}>
            {getBlueGreenPromotionLabel(object)}
          </WithTooltip>,
          <WithTooltip>{getRolloutStateLabel(object)}</WithTooltip>,
          <WithTooltip>{getRolloutStateReason(object)}</WithTooltip>,
          <KubeObjectAge object={object} key="age" />,
        ]}
      />
    </>
  );
});

export const ArgoRolloutsRolloutsPage = observer((props: ArgoRolloutsPageProps) =>
  withErrorPage(props, () => {
    return (
      <>
        <ArgoRolloutsTabContent />
      </>
    );
  }),
);
