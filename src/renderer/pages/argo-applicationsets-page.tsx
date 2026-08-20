import { Common, Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { Link } from "react-router-dom";
import { getArgoCdApiClient, getArgoCdDataSource, useArgoCdApiQuery } from "../argocd-api";
import { ArgoApiListToolbar, useArgoApiListFilters } from "../components/argo-api-list";
import {
  ArgoCdApiMisconfiguredNotice,
  ArgoConnectionSourceBanner,
} from "../components/argo-connection-source";
import { withErrorPage } from "../components/error-page";
import {
  ArgoApplicationSet,
  type ArgoApplicationSetApi,
  getApplicationSetHasError,
  getApplicationSetResourcesUpToDate,
  getArgoApplicationSetStore,
  getGeneratedApplicationCount,
} from "../k8s/argocd";
import apiListStyles from "./argo-api-list.module.scss";
import apiListStylesInline from "./argo-api-list.module.scss?inline";
import styles from "./argo-applicationsets-page.module.scss";
import stylesInline from "./argo-applicationsets-page.module.scss?inline";

const {
  Component: { KubeObjectAge, KubeObjectListLayout, Table, TableCell, TableHead, TableRow, WithTooltip },
  K8sApi: { namespacesApi },
  Navigation: { getDetailsUrl },
} = Renderer;

const {
  Util: { stopPropagation },
} = Common;

const sortingCallbacks = {
  name: (object: ArgoApplicationSet) => object.getName(),
  namespace: (object: ArgoApplicationSet) => object.getNs(),
  applications: (object: ArgoApplicationSet) => getGeneratedApplicationCount(object),
  resourcesUpToDate: (object: ArgoApplicationSet) => {
    const value = getApplicationSetResourcesUpToDate(object);

    if (value === true) return 1;
    if (value === false) return 0;

    return -1;
  },
  hasError: (object: ArgoApplicationSet) => {
    const value = getApplicationSetHasError(object);

    if (value === true) return 1;
    if (value === false) return 0;

    return -1;
  },
  age: (object: ArgoApplicationSet) => object.getCreationTimestamp(),
};

const renderTableHeader: { id: string; title: string; sortBy: keyof typeof sortingCallbacks; className?: string }[] = [
  { id: "name", title: "Name", sortBy: "name" },
  { id: "namespace", title: "Namespace", sortBy: "namespace" },
  { id: "applications", title: "Applications", sortBy: "applications", className: styles.applications },
  { id: "resourcesUpToDate", title: "Up To Date", sortBy: "resourcesUpToDate", className: styles.resourcesUpToDate },
  { id: "hasError", title: "Error", sortBy: "hasError", className: styles.hasError },
  { id: "age", title: "Age", sortBy: "age", className: styles.age },
];

const formatBooleanSignal = (value: boolean | undefined): string => {
  if (value === true) return "Yes";
  if (value === false) return "No";

  return "N/A";
};

export interface ArgoApplicationSetsPageProps {
  extension: Renderer.LensExtension;
}

const ArgoApplicationSetsClusterTabContent = observer(() => {
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
          <WithTooltip>{String(getGeneratedApplicationCount(object))}</WithTooltip>,
          <WithTooltip>{formatBooleanSignal(getApplicationSetResourcesUpToDate(object))}</WithTooltip>,
          <WithTooltip>{formatBooleanSignal(getApplicationSetHasError(object))}</WithTooltip>,
          <KubeObjectAge object={object} key="age" />,
        ]}
      />
    </>
  );
});

const ArgoApplicationSetsApiTabContent = observer(() => {
  const { data, isLoading, error } = useArgoCdApiQuery(true, "applicationsets", () =>
    getArgoCdApiClient().listApplicationSets(),
  );
  const applicationSets = data ?? [];
  const { search, setSearch, namespace, setNamespace, namespaces, filteredItems, filteredCount, totalCount } =
    useArgoApiListFilters(applicationSets);

  return (
    <>
      <style>{stylesInline}</style>
      <style>{apiListStylesInline}</style>
      <div className={apiListStyles.root}>
        <ArgoConnectionSourceBanner />
        {isLoading ? <div className={apiListStyles.loading}>Loading ApplicationSets from Argo CD API...</div> : null}
        {error ? <div className={apiListStyles.error}>{error}</div> : null}
        {!isLoading && !error && applicationSets.length === 0 ? (
          <div className={apiListStyles.empty}>No ApplicationSets</div>
        ) : null}
        {!isLoading && !error && applicationSets.length > 0 ? (
          <div className={apiListStyles.page}>
            <ArgoApiListToolbar
              title="Argo ApplicationSets"
              search={search}
              onSearchChange={setSearch}
              namespace={namespace}
              onNamespaceChange={setNamespace}
              namespaces={namespaces}
              filteredCount={filteredCount}
              totalCount={totalCount}
              searchPlaceholder="Search ApplicationSets..."
            />
            {filteredItems.length === 0 ? (
              <div className={apiListStyles.empty}>No ApplicationSets match the current filters</div>
            ) : (
              <div className={apiListStyles.tableWrap}>
                <Table tableId="argocdApiApplicationSets" scrollable={false} sortSyncWithUrl={false}>
                  <TableHead flat sticky>
                    <TableCell>Name</TableCell>
                    <TableCell>Namespace</TableCell>
                    <TableCell>Applications</TableCell>
                    <TableCell>Up To Date</TableCell>
                    <TableCell>Error</TableCell>
                    <TableCell>Age</TableCell>
                  </TableHead>
                  {filteredItems.map((object) => (
                    <TableRow key={`${object.getNs()}/${object.getName()}`}>
                      <TableCell>
                        <WithTooltip>{object.getName()}</WithTooltip>
                      </TableCell>
                      <TableCell>
                        <WithTooltip>{object.getNs() || "N/A"}</WithTooltip>
                      </TableCell>
                      <TableCell>
                        <WithTooltip>{String(getGeneratedApplicationCount(object))}</WithTooltip>
                      </TableCell>
                      <TableCell>
                        <WithTooltip>{formatBooleanSignal(getApplicationSetResourcesUpToDate(object))}</WithTooltip>
                      </TableCell>
                      <TableCell>
                        <WithTooltip>{formatBooleanSignal(getApplicationSetHasError(object))}</WithTooltip>
                      </TableCell>
                      <TableCell>
                        <KubeObjectAge object={object} />
                      </TableCell>
                    </TableRow>
                  ))}
                </Table>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </>
  );
});

export const ArgoApplicationSetsTabContent = observer(() => {
  const source = getArgoCdDataSource();
  if (source === "api-misconfigured") {
    return <ArgoCdApiMisconfiguredNotice />;
  }
  if (source === "api") {
    return <ArgoApplicationSetsApiTabContent />;
  }
  return <ArgoApplicationSetsClusterTabContent />;
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
