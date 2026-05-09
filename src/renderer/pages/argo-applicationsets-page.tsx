import { Common, Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { Link } from "react-router-dom";
import { withErrorPage } from "../components/error-page";
import { ArgoApplicationSet, type ArgoApplicationSetApi, getArgoApplicationSetStore } from "../k8s/argocd";
import styles from "./argo-applicationsets-page.module.scss";
import stylesInline from "./argo-applicationsets-page.module.scss?inline";

const {
  Component: { KubeObjectAge, KubeObjectListLayout, WithTooltip },
  K8sApi: { namespacesApi },
  Navigation: { getDetailsUrl },
} = Renderer;

const {
  Util: { stopPropagation },
} = Common;

const sortingCallbacks = {
  name: (object: ArgoApplicationSet) => object.getName(),
  namespace: (object: ArgoApplicationSet) => object.getNs(),
  age: (object: ArgoApplicationSet) => object.getCreationTimestamp(),
};

const renderTableHeader: { id: string; title: string; sortBy: keyof typeof sortingCallbacks; className?: string }[] = [
  { id: "name", title: "Name", sortBy: "name" },
  { id: "namespace", title: "Namespace", sortBy: "namespace" },
  { id: "age", title: "Age", sortBy: "age", className: styles.age },
];

export interface ArgoApplicationSetsPageProps {
  extension: Renderer.LensExtension;
}

export const ArgoApplicationSetsTabContent = observer(() => {
  const applicationSetStore = getArgoApplicationSetStore();

  const getApplicationSetDetailsUrl = (object: ArgoApplicationSet) =>
    getDetailsUrl(
      applicationSetStore.api.formatUrlForNotListing({
        namespace: object.getNs(),
        name: object.getName(),
      }),
    );

  return (
    <>
      <style>{stylesInline}</style>
      <KubeObjectListLayout<ArgoApplicationSet, ArgoApplicationSetApi>
        tableId={`${ArgoApplicationSet.crd.plural}Table`}
        isConfigurable
        className={styles.page}
        store={applicationSetStore}
        sortingCallbacks={sortingCallbacks}
        searchFilters={[(object: ArgoApplicationSet) => object.getSearchFields()]}
        renderHeaderTitle={ArgoApplicationSet.crd.title}
        renderTableHeader={renderTableHeader}
        renderTableContents={(object: ArgoApplicationSet) => [
          <Link key="name-link" to={getApplicationSetDetailsUrl(object)} onClick={stopPropagation}>
            <WithTooltip>{object.getName()}</WithTooltip>
          </Link>,
          <Link
            key="namespace-link"
            to={getDetailsUrl(namespacesApi.formatUrlForNotListing({ name: object.getNs() }))}
            onClick={stopPropagation}
          >
            <WithTooltip>{object.getNs()}</WithTooltip>
          </Link>,
          <KubeObjectAge object={object} key="age" />,
        ]}
      />
    </>
  );
});

export const ArgoApplicationSetsPage = observer((props: ArgoApplicationSetsPageProps) =>
  withErrorPage(props, () => {
    return (
      <>
        <ArgoApplicationSetsTabContent />
      </>
    );
  }),
);
