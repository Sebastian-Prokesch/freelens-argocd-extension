import { Common, Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { getArgoCdApiClient, getArgoCdDataSource, getArgoPreferences, useArgoCdApiQuery } from "../argocd-api";
import { argoApiApplicationDrawerStore } from "../components/argo-api-details";
import {
  ArgoApiCheckboxFilter,
  ArgoApiListToolbar,
  useArgoApiApplicationFilters,
} from "../components/argo-api-list";
import {
  ArgoCdApiMisconfiguredNotice,
  ArgoConnectionSourceBanner,
} from "../components/argo-connection-source";
import { withErrorPage } from "../components/error-page";
import { StatusBadge } from "../components/shared";
import { ArgoApplication, type ArgoApplicationApi, getArgoApplicationStore } from "../k8s/argocd";
import { createEnumFromKeys } from "../utils";
import styles from "./argo-applications-page.module.scss";
import stylesInline from "./argo-applications-page.module.scss?inline";
import apiListStyles from "./argo-api-list.module.scss";
import apiListStylesInline from "./argo-api-list.module.scss?inline";

const {
  Component: { KubeObjectAge, KubeObjectListLayout, Table, TableCell, TableHead, TableRow, WithTooltip },
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

const apiSortingCallbacks = {
  name: (object: ArgoApplication) => object.getName?.() || object.metadata?.name || "",
  namespace: (object: ArgoApplication) => object.getNs?.() || object.metadata?.namespace || "",
  project: (object: ArgoApplication) => object.spec?.project ?? "",
  syncStatus: (object: ArgoApplication) => object.status?.sync?.status ?? "",
  healthStatus: (object: ArgoApplication) => object.status?.health?.status ?? "",
  age: (object: ArgoApplication) => object.getCreationTimestamp?.() || object.metadata?.creationTimestamp || "",
};

const apiSortByNames = createEnumFromKeys(apiSortingCallbacks);
const apiSortByDefault: { sortBy: keyof typeof apiSortingCallbacks; orderBy: Renderer.Component.TableOrderBy } = {
  sortBy: apiSortByNames.name,
  orderBy: "asc",
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

const ArgoApplicationsClusterTabContent = observer(() => {
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

const ArgoApplicationsApiTabContent = observer(() => {
  const preferences = getArgoPreferences();
  const connectionId = preferences.activeApiConnectionId;

  useEffect(() => {
    argoApiApplicationDrawerStore.close();
  }, [connectionId]);

  const { data, isLoading, error } = useArgoCdApiQuery(true, `applications-${connectionId}`, () =>
    getArgoCdApiClient().listApplications(),
  );
  const applications = data ?? [];
  const {
    search,
    setSearch,
    namespace,
    setNamespace,
    namespaces,
    filteredItems,
    filteredCount,
    totalCount,
    projects,
    syncStatuses,
    healthStatuses,
    selectedProjects,
    setSelectedProjects,
    selectedSyncStatuses,
    setSelectedSyncStatuses,
    selectedHealthStatuses,
    setSelectedHealthStatuses,
  } = useArgoApiApplicationFilters(applications);

  const openDetails = (object: ArgoApplication) => {
    argoApiApplicationDrawerStore.open(object);
  };

  return (
    <>
      <style>{stylesInline}</style>
      <style>{apiListStylesInline}</style>
      <div className={apiListStyles.root}>
        <ArgoConnectionSourceBanner />
        {isLoading ? <div className={apiListStyles.loading}>Loading applications from Argo CD API...</div> : null}
        {error ? <div className={apiListStyles.error}>{error}</div> : null}
        {!isLoading && !error && applications.length === 0 ? (
          <div className={apiListStyles.empty}>No applications</div>
        ) : null}
        {!isLoading && !error && applications.length > 0 ? (
          <div className={apiListStyles.page}>
            <ArgoApiListToolbar
              title="Argo Applications"
              search={search}
              onSearchChange={setSearch}
              namespace={namespace}
              onNamespaceChange={setNamespace}
              namespaces={namespaces}
              filteredCount={filteredCount}
              totalCount={totalCount}
              searchPlaceholder="Search applications..."
              extraFilters={
                <>
                  <ArgoApiCheckboxFilter
                    label="Project"
                    options={projects}
                    selected={selectedProjects}
                    onChange={setSelectedProjects}
                  />
                  <ArgoApiCheckboxFilter
                    label="Sync Status"
                    options={syncStatuses}
                    selected={selectedSyncStatuses}
                    onChange={setSelectedSyncStatuses}
                  />
                  <ArgoApiCheckboxFilter
                    label="Health Status"
                    options={healthStatuses}
                    selected={selectedHealthStatuses}
                    onChange={setSelectedHealthStatuses}
                  />
                </>
              }
            />
            {filteredItems.length === 0 ? (
              <div className={apiListStyles.empty}>No applications match the current filters</div>
            ) : (
              <div className={apiListStyles.tableWrap}>
                <Table
                  tableId="argocdApiApplications"
                  sortable={apiSortingCallbacks}
                  sortByDefault={apiSortByDefault}
                  scrollable={false}
                  sortSyncWithUrl={false}
                >
                  <TableHead flat sticky>
                    <TableCell sortBy={apiSortByNames.name}>Name</TableCell>
                    <TableCell sortBy={apiSortByNames.namespace}>Namespace</TableCell>
                    <TableCell sortBy={apiSortByNames.project}>Project</TableCell>
                    <TableCell sortBy={apiSortByNames.syncStatus}>Sync Status</TableCell>
                    <TableCell sortBy={apiSortByNames.healthStatus}>Health Status</TableCell>
                    <TableCell sortBy={apiSortByNames.age}>Age</TableCell>
                  </TableHead>
                  {filteredItems.map((object) => (
                    <TableRow
                      key={`${object.getNs()}/${object.getName()}`}
                      className={apiListStyles.clickableRow}
                      sortItem={object}
                      onClick={() => openDetails(object)}
                    >
                      <TableCell>
                        <button
                          type="button"
                          className={apiListStyles.rowLink}
                          onClick={(event) => {
                            event.stopPropagation();
                            openDetails(object);
                          }}
                        >
                          <WithTooltip>{object.getName()}</WithTooltip>
                        </button>
                      </TableCell>
                      <TableCell>
                        <WithTooltip>{object.getNs() || "N/A"}</WithTooltip>
                      </TableCell>
                      <TableCell>
                        <WithTooltip>{object.spec?.project ?? "N/A"}</WithTooltip>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={object.status?.sync?.status} fallbackLabel="N/A" />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={object.status?.health?.status} fallbackLabel="N/A" />
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

export const ArgoApplicationsTabContent = observer(() => {
  const source = getArgoCdDataSource();
  if (source === "api-misconfigured") {
    return <ArgoCdApiMisconfiguredNotice />;
  }
  if (source === "api") {
    return <ArgoApplicationsApiTabContent />;
  }
  return <ArgoApplicationsClusterTabContent />;
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
