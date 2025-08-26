import { Common, Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { Link } from "react-router-dom";
import { withErrorPage } from "../components/error-page";
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

const renderTableHeader: { title: string; sortBy: keyof typeof sortingCallbacks; className?: string }[] = [
  { title: "Name", sortBy: "name" },
  { title: "Namespace", sortBy: "namespace" },
  { title: "Project", sortBy: "project", className: styles.project },
  { title: "Sync Status", sortBy: "syncStatus", className: styles.syncStatus },
  { title: "Health Status", sortBy: "healthStatus", className: styles.healthStatus },
  { title: "Age", sortBy: "age", className: styles.age },
];

export interface ArgoApplicationsPageProps {
  extension: Renderer.LensExtension;
}

export const ArgoApplicationsPage = observer((props: ArgoApplicationsPageProps) =>
  withErrorPage(props, () => {
    return (
      <>
        <style>{stylesInline}</style>
        <KubeObjectListLayout<ArgoApplication, ArgoApplicationApi>
          tableId={`${ArgoApplication.crd.plural}Table`}
          className={styles.page}
          store={getArgoApplicationStore()}
          sortingCallbacks={sortingCallbacks}
          searchFilters={[(object: ArgoApplication) => object.getSearchFields()]}
          renderHeaderTitle={ArgoApplication.crd.title}
          renderTableHeader={renderTableHeader}
          renderTableContents={(object: ArgoApplication) => [
            <WithTooltip>{object.getName()}</WithTooltip>,
            <Link
              key="link"
              to={getDetailsUrl(namespacesApi.formatUrlForNotListing({ name: object.getNs() }))}
              onClick={stopPropagation}
            >
              <WithTooltip>{object.getNs()}</WithTooltip>
            </Link>,
            <WithTooltip>{object.spec?.project ?? "N/A"}</WithTooltip>,
            <WithTooltip>{object.status?.sync?.status ?? "N/A"}</WithTooltip>,
            <WithTooltip>{object.status?.health?.status ?? "N/A"}</WithTooltip>,
            <KubeObjectAge object={object} key="age" />,
          ]}
        />
      </>
    );
  }),
);
