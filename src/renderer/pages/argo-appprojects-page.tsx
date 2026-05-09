import { Common, Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { Link } from "react-router-dom";
import { withErrorPage } from "../components/error-page";
import { ArgoAppProject, type ArgoAppProjectApi, getArgoAppProjectStore } from "../k8s/argocd";
import styles from "./argo-appprojects-page.module.scss";
import stylesInline from "./argo-appprojects-page.module.scss?inline";

const {
  Component: { KubeObjectAge, KubeObjectListLayout, WithTooltip },
  Navigation: { getDetailsUrl },
} = Renderer;

const {
  Util: { stopPropagation },
} = Common;

const sortingCallbacks = {
  name: (object: ArgoAppProject) => object.getName(),
  namespace: (object: ArgoAppProject) => object.getNs(),
  description: (object: ArgoAppProject) => object.spec?.description ?? "",
  age: (object: ArgoAppProject) => object.getCreationTimestamp(),
};

const renderTableHeader: { id: string; title: string; sortBy: keyof typeof sortingCallbacks; className?: string }[] = [
  { id: "name", title: "Name", sortBy: "name" },
  { id: "namespace", title: "Namespace", sortBy: "namespace" },
  { id: "description", title: "Description", sortBy: "description", className: styles.description },
  { id: "age", title: "Age", sortBy: "age", className: styles.age },
];

export interface ArgoAppProjectsPageProps {
  extension: Renderer.LensExtension;
}

export const ArgoAppProjectsTabContent = observer(() => {
  const appProjectStore = getArgoAppProjectStore();
  const getAppProjectDetailsUrl = (object: ArgoAppProject) =>
    getDetailsUrl(
      appProjectStore.api.formatUrlForNotListing({
        namespace: object.getNs(),
        name: object.getName(),
      }),
    );

  return (
    <>
      <style>{stylesInline}</style>
      <KubeObjectListLayout<ArgoAppProject, ArgoAppProjectApi>
        tableId={`${ArgoAppProject.crd.plural}Table`}
        isConfigurable
        className={styles.page}
        store={appProjectStore}
        sortingCallbacks={sortingCallbacks}
        searchFilters={[(object: ArgoAppProject) => object.getSearchFields()]}
        renderHeaderTitle={ArgoAppProject.crd.title}
        renderTableHeader={renderTableHeader}
        renderTableContents={(object: ArgoAppProject) => [
          <Link key="name-link" to={getAppProjectDetailsUrl(object)} onClick={stopPropagation}>
            <WithTooltip>{object.getName()}</WithTooltip>
          </Link>,
          <WithTooltip>{object.getNs()}</WithTooltip>,
          <WithTooltip>{object.spec?.description ?? "N/A"}</WithTooltip>,
          <KubeObjectAge object={object} key="age" />,
        ]}
      />
    </>
  );
});

export const ArgoAppProjectsPage = observer((props: ArgoAppProjectsPageProps) =>
  withErrorPage(props, () => {
    return (
      <>
        <ArgoAppProjectsTabContent />
      </>
    );
  }),
);
