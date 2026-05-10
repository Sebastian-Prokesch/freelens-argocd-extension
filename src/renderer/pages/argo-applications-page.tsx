import { Common, Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { Link } from "react-router-dom";
import { withErrorPage } from "../components/error-page";
import { StatusBadge } from "../components/shared";
import { ArgoApplication, type ArgoApplicationApi, getArgoApplicationStore } from "../k8s/argocd";
import styles from "./argo-applications-page.module.scss";
import stylesInline from "./argo-applications-page.module.scss?inline";

const {
  Component: { KubeObjectAge, KubeObjectListLayout, WithTooltip },
  K8sApi: { namespacesApi },
  Navigation: { getDetailsUrl },
} = Renderer;

const {
  Util: { stopPropagation },
} = Common;

const sortingCallbacks = {
  name: (object: ArgoApplication) => object.getName(),
  namespace: (object: ArgoApplication) => object.getNs(),
  project: (object: ArgoApplication) => object.spec?.project ?? "",
  syncStatus: (object: ArgoApplication) => object.status?.sync?.status ?? "",
  healthStatus: (object: ArgoApplication) => object.status?.health?.status ?? "",
  age: (object: ArgoApplication) => object.getCreationTimestamp(),
};

const renderTableHeader: { id: string; title: string; sortBy: keyof typeof sortingCallbacks; className?: string }[] = [
  { id: "name", title: "Name", sortBy: "name" },
  { id: "namespace", title: "Namespace", sortBy: "namespace" },
  { id: "project", title: "Project", sortBy: "project", className: styles.project },
  { id: "syncStatus", title: "Sync Status", sortBy: "syncStatus", className: styles.syncStatus },
  { id: "healthStatus", title: "Health Status", sortBy: "healthStatus", className: styles.healthStatus },
  { id: "age", title: "Age", sortBy: "age", className: styles.age },
];

export interface ArgoApplicationsPageProps {
  extension: Renderer.LensExtension;
}

export const ArgoApplicationsTabContent = observer(() => {
  const applicationStore = getArgoApplicationStore();

  const getApplicationDetailsUrl = (object: ArgoApplication) =>
    getDetailsUrl(
      applicationStore.api.formatUrlForNotListing({
        namespace: object.getNs(),
        name: object.getName(),
      }),
    );

  return (
    <>
      <style>{stylesInline}</style>
      <KubeObjectListLayout<ArgoApplication, ArgoApplicationApi>
        tableId={`${ArgoApplication.crd.plural}Table`}
        isConfigurable
        className={styles.page}
        store={applicationStore}
        sortingCallbacks={sortingCallbacks}
        searchFilters={[(object: ArgoApplication) => object.getSearchFields()]}
        renderHeaderTitle={ArgoApplication.crd.title}
        renderTableHeader={renderTableHeader}
        renderTableContents={(object: ArgoApplication) => [
          <Link key="name-link" to={getApplicationDetailsUrl(object)} onClick={stopPropagation}>
            <WithTooltip>{object.getName()}</WithTooltip>
          </Link>,
          <Link
            key="namespace-link"
            to={getDetailsUrl(namespacesApi.formatUrlForNotListing({ name: object.getNs() }))}
            onClick={stopPropagation}
          >
            <WithTooltip>{object.getNs()}</WithTooltip>
          </Link>,
          <WithTooltip>{object.spec?.project ?? "N/A"}</WithTooltip>,
          <StatusBadge status={object.status?.sync?.status} fallbackLabel="N/A" />,
          <StatusBadge status={object.status?.health?.status} fallbackLabel="N/A" />,
          <KubeObjectAge object={object} key="age" />,
        ]}
      />
    </>
  );
});

export const ArgoApplicationsPage = observer((props: ArgoApplicationsPageProps) =>
  withErrorPage(props, () => {
    return (
      <>
        <ArgoApplicationsTabContent />
      </>
    );
  }),
);
