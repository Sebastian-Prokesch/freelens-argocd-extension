import { Common, Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { getArgoCdApiClient, getArgoCdDataSource, getArgoPreferences, useArgoCdApiQuery } from "../argocd-api";
import { argoApiAppProjectDrawerStore } from "../components/argo-api-details";
import { ArgoApiListToolbar, useArgoApiListFilters } from "../components/argo-api-list";
import { ArgoCdApiMisconfiguredNotice, ArgoConnectionSourceBanner } from "../components/argo-connection-source";
import { withErrorPage } from "../components/error-page";
import {
  ArgoAppProject,
  type ArgoAppProjectApi,
  getAppProjectDestinationCount,
  getAppProjectSyncWindowCount,
  getArgoAppProjectStore,
} from "../k8s/argocd";
import apiListStyles from "./argo-api-list.module.scss";
import apiListStylesInline from "./argo-api-list.module.scss?inline";
import styles from "./argo-appprojects-page.module.scss";
import stylesInline from "./argo-appprojects-page.module.scss?inline";

const {
  Component: { KubeObjectAge, KubeObjectListLayout, Table, TableCell, TableHead, TableRow, WithTooltip },
  Navigation: { getDetailsUrl },
} = Renderer;

const {
  Util: { stopPropagation },
} = Common;

const sortingCallbacks = {
  name: (object: ArgoAppProject) => object.getName(),
  namespace: (object: ArgoAppProject) => object.getNs(),
  description: (object: ArgoAppProject) => object.spec?.description ?? "",
  destinations: (object: ArgoAppProject) => getAppProjectDestinationCount(object),
  syncWindows: (object: ArgoAppProject) => getAppProjectSyncWindowCount(object),
  age: (object: ArgoAppProject) => object.getCreationTimestamp(),
};

const renderTableHeader: { id: string; title: string; sortBy: keyof typeof sortingCallbacks; className?: string }[] = [
  { id: "name", title: "Name", sortBy: "name" },
  { id: "namespace", title: "Namespace", sortBy: "namespace" },
  { id: "description", title: "Description", sortBy: "description", className: styles.description },
  { id: "destinations", title: "Destinations", sortBy: "destinations", className: styles.destinations },
  { id: "syncWindows", title: "Sync Windows", sortBy: "syncWindows", className: styles.syncWindows },
  { id: "age", title: "Age", sortBy: "age", className: styles.age },
];

export interface ArgoAppProjectsPageProps {
  extension: Renderer.LensExtension;
}

const ArgoAppProjectsClusterTabContent = observer(() => {
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
          <WithTooltip>{String(getAppProjectDestinationCount(object))}</WithTooltip>,
          <WithTooltip>{String(getAppProjectSyncWindowCount(object))}</WithTooltip>,
          <KubeObjectAge object={object} key="age" />,
        ]}
      />
    </>
  );
});

const ArgoAppProjectsApiTabContent = observer(() => {
  const preferences = getArgoPreferences();
  const connectionId = preferences.activeApiConnectionId;

  useEffect(() => {
    argoApiAppProjectDrawerStore.close();
  }, [connectionId]);

  const { data, isLoading, error } = useArgoCdApiQuery(true, `projects-${connectionId}`, () =>
    getArgoCdApiClient().listProjects(),
  );
  const projects = data ?? [];
  const { search, setSearch, namespace, setNamespace, namespaces, filteredItems, filteredCount, totalCount } =
    useArgoApiListFilters(projects);

  const openDetails = (object: ArgoAppProject) => {
    argoApiAppProjectDrawerStore.open(object);
  };

  return (
    <>
      <style>{stylesInline}</style>
      <style>{apiListStylesInline}</style>
      <div className={apiListStyles.root}>
        <ArgoConnectionSourceBanner />
        {isLoading ? <div className={apiListStyles.loading}>Loading AppProjects from Argo CD API...</div> : null}
        {error ? <div className={apiListStyles.error}>{error}</div> : null}
        {!isLoading && !error && projects.length === 0 ? (
          <div className={apiListStyles.empty}>No AppProjects</div>
        ) : null}
        {!isLoading && !error && projects.length > 0 ? (
          <div className={apiListStyles.page}>
            <ArgoApiListToolbar
              title="Argo AppProjects"
              search={search}
              onSearchChange={setSearch}
              namespace={namespace}
              onNamespaceChange={setNamespace}
              namespaces={namespaces}
              filteredCount={filteredCount}
              totalCount={totalCount}
              searchPlaceholder="Search AppProjects..."
            />
            {filteredItems.length === 0 ? (
              <div className={apiListStyles.empty}>No AppProjects match the current filters</div>
            ) : (
              <div className={apiListStyles.tableWrap}>
                <Table tableId="argocdApiAppProjects" scrollable={false} sortSyncWithUrl={false}>
                  <TableHead flat sticky>
                    <TableCell>Name</TableCell>
                    <TableCell>Namespace</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Destinations</TableCell>
                    <TableCell>Sync Windows</TableCell>
                    <TableCell>Age</TableCell>
                  </TableHead>
                  {filteredItems.map((object) => (
                    <TableRow
                      key={`${object.getNs()}/${object.getName()}`}
                      className={apiListStyles.clickableRow}
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
                        <WithTooltip>{object.spec?.description ?? "N/A"}</WithTooltip>
                      </TableCell>
                      <TableCell>
                        <WithTooltip>{String(getAppProjectDestinationCount(object))}</WithTooltip>
                      </TableCell>
                      <TableCell>
                        <WithTooltip>{String(getAppProjectSyncWindowCount(object))}</WithTooltip>
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

export const ArgoAppProjectsTabContent = observer(() => {
  const source = getArgoCdDataSource();
  if (source === "api-misconfigured") {
    return <ArgoCdApiMisconfiguredNotice />;
  }
  if (source === "api") {
    return <ArgoAppProjectsApiTabContent />;
  }
  return <ArgoAppProjectsClusterTabContent />;
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
