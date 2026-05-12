import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { withErrorPage } from "../components/error-page";
import { ConditionsList, ResourceEventsSection, StatusBadge } from "../components/shared";
import { ArgoApplication, ArgoApplicationResourceSyncStatus } from "../k8s/argocd";
import { createEnumFromKeys } from "../utils";
import styles from "./argo-application-details.module.scss";
import stylesInline from "./argo-application-details.module.scss?inline";

const {
  Component: { BadgeBoolean, DrawerTitle, DrawerItem, Gutter, Table, TableHead, TableRow, TableCell },
} = Renderer;

const resourcesSortable = {
  name: (appResourceStatus: ArgoApplicationResourceSyncStatus) => appResourceStatus.name,
  status: (appResourceStatus: ArgoApplicationResourceSyncStatus) => appResourceStatus.status,
  kind: (appResourceStatus: ArgoApplicationResourceSyncStatus) => appResourceStatus.kind,
  health: (appResourceStatus: ArgoApplicationResourceSyncStatus) =>
    (appResourceStatus as { health?: { status?: string } }).health?.status ?? "",
};

const resourcesSortByNames = createEnumFromKeys(resourcesSortable);
const resourcesSortByDefault: { sortBy: keyof typeof resourcesSortable; orderBy: Renderer.Component.TableOrderBy } = {
  sortBy: resourcesSortByNames.kind,
  orderBy: "desc",
};

const historySortable = {
  id: (entry: any) => entry?.id ?? 0,
  revision: (entry: any) => entry?.revision ?? "",
  deployedAt: (entry: any) => entry?.deployedAt ?? "",
};

const historySortByNames = createEnumFromKeys(historySortable);
const historySortByDefault: { sortBy: keyof typeof historySortable; orderBy: Renderer.Component.TableOrderBy } = {
  sortBy: historySortByNames.id,
  orderBy: "desc",
};

// Helper functions for source type detection and formatting
const getSourceType = (source: any): string => {
  if (source?.helm) return "Helm";
  if (source?.kustomize) return "Kustomize";
  if (source?.directory) return "Directory";
  if (source?.plugin) return "Plugin";
  return "Git";
};

const formatSyncOptions = (syncOptions?: string[]): string => {
  if (!syncOptions || syncOptions.length === 0) return "None";
  return syncOptions.join(", ");
};

const formatRetryBackoff = (backoff?: any): string => {
  if (!backoff) return "Default";
  const parts: string[] = [];
  if (backoff.duration) parts.push(`Duration: ${backoff.duration}`);
  if (backoff.factor) parts.push(`Factor: ${backoff.factor}`);
  if (backoff.maxDuration) parts.push(`Max: ${backoff.maxDuration}`);
  return parts.length > 0 ? parts.join(", ") : "Default";
};

const formatPluginParameter = (parameter: any): string => {
  if (!parameter?.name) {
    return "Unnamed parameter";
  }

  if (parameter.string) {
    return `${parameter.name}: ${parameter.string}`;
  }

  if (parameter.array?.length) {
    return `${parameter.name}: ${parameter.array.join(",")}`;
  }

  if (parameter.map && Object.keys(parameter.map).length > 0) {
    return `${parameter.name}: ${JSON.stringify(parameter.map)}`;
  }

  return `${parameter.name}: Not set`;
};

const formatDateTime = (dateString?: string): string => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleString();
};

const normalizeArray = <T,>(value: T[] | undefined | null): T[] => (Array.isArray(value) ? value : []);

const formatPluginEnv = (entries: Array<{ name?: string; value?: string } | null | undefined>): string => {
  const pairs = entries
    .filter((entry): entry is { name?: string; value?: string } => Boolean(entry))
    .map((entry) => `${entry.name ?? "UNKNOWN"}=${entry.value ?? ""}`);

  return pairs.length > 0 ? pairs.join(", ") : "None";
};

export interface ArgoApplicationDetailsProps extends Renderer.Component.KubeObjectDetailsProps<ArgoApplication> {
  extension: Renderer.LensExtension;
}

export const ArgoApplicationDetails = observer((props: ArgoApplicationDetailsProps) =>
  withErrorPage(props, () => {
    const { object } = props;
    const pluginEnv = normalizeArray(object.spec.source?.plugin?.env);
    const pluginParameters = normalizeArray(object.spec.source?.plugin?.parameters);
    const ignoreDifferences = normalizeArray(object.spec.ignoreDifferences);
    const resources = normalizeArray(object.status?.resources);
    const history = normalizeArray(object.status?.history);

    return (
      <>
        <style>{stylesInline}</style>
        <div className={styles.argoApplicationDetails}>
          <Gutter size="md" />

          {/* Section 1: Source Configuration */}
          <DrawerTitle>Source Configuration</DrawerTitle>
          {object.spec.source ? (
            // Single source
            <>
              <DrawerItem name="Repository URL">{object.spec.source.repoURL || "Not specified"}</DrawerItem>
              <DrawerItem name="Source Type">{getSourceType(object.spec.source)}</DrawerItem>
              {object.spec.source.targetRevision && (
                <DrawerItem name="Target Revision">{object.spec.source.targetRevision}</DrawerItem>
              )}
              {object.spec.source.path && <DrawerItem name="Path">{object.spec.source.path}</DrawerItem>}
              {object.spec.source.chart && <DrawerItem name="Chart">{object.spec.source.chart}</DrawerItem>}
              {object.spec.source.helm && (
                <>
                  <DrawerItem name="Helm Version">{object.spec.source.helm.version || "Not specified"}</DrawerItem>
                  {object.spec.source.helm.releaseName && (
                    <DrawerItem name="Release Name">{object.spec.source.helm.releaseName}</DrawerItem>
                  )}
                  {object.spec.source.helm.valueFiles && object.spec.source.helm.valueFiles.length > 0 && (
                    <DrawerItem name="Value Files">{object.spec.source.helm.valueFiles.join(", ")}</DrawerItem>
                  )}
                </>
              )}
              {object.spec.source.kustomize && (
                <>
                  <DrawerItem name="Kustomize Version">
                    {object.spec.source.kustomize.version || "Not specified"}
                  </DrawerItem>
                  {object.spec.source.kustomize.namePrefix && (
                    <DrawerItem name="Name Prefix">{object.spec.source.kustomize.namePrefix}</DrawerItem>
                  )}
                  {object.spec.source.kustomize.nameSuffix && (
                    <DrawerItem name="Name Suffix">{object.spec.source.kustomize.nameSuffix}</DrawerItem>
                  )}
                </>
              )}
              {object.spec.source.plugin && (
                <>
                  <DrawerItem name="Plugin Name">{object.spec.source.plugin.name || "Not specified"}</DrawerItem>
                  {pluginEnv.length > 0 && (
                    <DrawerItem name="Environment Variables">{formatPluginEnv(pluginEnv)}</DrawerItem>
                  )}
                  {pluginParameters.length > 0 && (
                    <DrawerItem name="Parameters">
                      {pluginParameters.map((param) => formatPluginParameter(param)).join(", ")}
                    </DrawerItem>
                  )}
                </>
              )}
            </>
          ) : object.spec.sources && object.spec.sources.length > 0 ? (
            // Multiple sources
            object.spec.sources.map((source, idx) => (
              <div key={idx} className={styles.sourceSection}>
                <DrawerItem name={`Source ${idx + 1}${source.name ? ` (${source.name})` : ""}`}>
                  <div className={styles.sourceDetails}>
                    <div>
                      <strong>Repository:</strong> {source.repoURL || "Not specified"}
                    </div>
                    <div>
                      <strong>Type:</strong> {getSourceType(source)}
                    </div>
                    {source.targetRevision && (
                      <div>
                        <strong>Revision:</strong> {source.targetRevision}
                      </div>
                    )}
                    {source.path && (
                      <div>
                        <strong>Path:</strong> {source.path}
                      </div>
                    )}
                    {source.chart && (
                      <div>
                        <strong>Chart:</strong> {source.chart}
                      </div>
                    )}
                    {source.plugin && (
                      <div>
                        <strong>Plugin:</strong> {source.plugin.name || "Not specified"}
                      </div>
                    )}
                  </div>
                </DrawerItem>
              </div>
            ))
          ) : (
            <DrawerItem name="Source">Not configured</DrawerItem>
          )}

          <Gutter size="md" />

          {/* Section 2: Destination */}
          <DrawerTitle>Destination</DrawerTitle>
          <DrawerItem name="Cluster">
            {object.spec.destination?.server || object.spec.destination?.name || "Not specified"}
          </DrawerItem>
          <DrawerItem name="Namespace">{object.spec.destination?.namespace || "Not specified"}</DrawerItem>

          <Gutter size="md" />

          {/* Section 3: Operation State */}
          {object.status?.operationState && (
            <>
              <DrawerTitle>Operation State</DrawerTitle>
              <DrawerItem name="Phase">{object.status.operationState.phase ?? "Unknown"}</DrawerItem>
              <DrawerItem name="Message">{object.status.operationState.message ?? "N/A"}</DrawerItem>
              <DrawerItem name="Started At">{formatDateTime(object.status.operationState.startedAt)}</DrawerItem>
              <DrawerItem name="Finished At">{formatDateTime(object.status.operationState.finishedAt)}</DrawerItem>
              <Gutter size="md" />
            </>
          )}

          {/* Section 4: Sync Policy */}
          {object.spec.syncPolicy && (
            <>
              <DrawerTitle>Sync Policy</DrawerTitle>
              <DrawerItem name="Automated Sync">
                <BadgeBoolean value={!!object.spec.syncPolicy.automated} />
              </DrawerItem>
              {object.spec.syncPolicy.automated && (
                <>
                  <DrawerItem name="Prune">
                    <BadgeBoolean value={object.spec.syncPolicy.automated.prune || false} />
                  </DrawerItem>
                  <DrawerItem name="Self Heal">
                    <BadgeBoolean value={object.spec.syncPolicy.automated.selfHeal || false} />
                  </DrawerItem>
                  <DrawerItem name="Allow Empty">
                    <BadgeBoolean value={object.spec.syncPolicy.automated.allowEmpty || false} />
                  </DrawerItem>
                </>
              )}
              {object.spec.syncPolicy.syncOptions && object.spec.syncPolicy.syncOptions.length > 0 && (
                <DrawerItem name="Sync Options">{formatSyncOptions(object.spec.syncPolicy.syncOptions)}</DrawerItem>
              )}
              {object.spec.syncPolicy.retry && (
                <>
                  <DrawerItem name="Retry Limit">{object.spec.syncPolicy.retry.limit || "Not set"}</DrawerItem>
                  <DrawerItem name="Retry Backoff">
                    {formatRetryBackoff(object.spec.syncPolicy.retry.backoff)}
                  </DrawerItem>
                </>
              )}
              <Gutter size="md" />
            </>
          )}

          {/* Section 5: Advanced Settings */}
          {ignoreDifferences.length > 0 && (
            <>
              <DrawerTitle>Advanced Settings</DrawerTitle>
              <DrawerItem name="Ignore Differences">
                <Table
                  tableId="ignore-differences"
                  key="argo-application-details-ignore-differences-table"
                  scrollable={false}
                  sortSyncWithUrl={false}
                >
                  <TableHead flat sticky={false}>
                    <TableCell>Kind</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Namespace</TableCell>
                    <TableCell>Group</TableCell>
                  </TableHead>
                  {ignoreDifferences.map((diff, index) => {
                    const safeDiff = diff ?? {};
                    const kind = safeDiff.kind ?? "Unknown";
                    const name = typeof safeDiff.name === "string" ? safeDiff.name : "";
                    const namespace = typeof safeDiff.namespace === "string" ? safeDiff.namespace : "";
                    const group = typeof safeDiff.group === "string" ? safeDiff.group : "";
                    return (
                      <TableRow key={`${kind}-${name || "all"}-${index}`}>
                        <TableCell>{kind}</TableCell>
                        <TableCell>{name || "All"}</TableCell>
                        <TableCell>{namespace || "All"}</TableCell>
                        <TableCell>{group || "All"}</TableCell>
                      </TableRow>
                    );
                  })}
                </Table>
              </DrawerItem>
              <Gutter size="md" />
            </>
          )}

          {/* Section 6: Last Sync Information */}
          <DrawerTitle>Last Sync Information</DrawerTitle>
          <DrawerItem name="Current Revision">{object.status?.sync?.revision ?? "N/A"}</DrawerItem>
          <DrawerItem name="Current Sync Status">
            <StatusBadge status={object.status?.sync?.status} fallbackLabel="N/A" />
          </DrawerItem>
          <DrawerItem name="Last Synced Revision">{history[0]?.revision ?? "N/A"}</DrawerItem>
          <DrawerItem name="Observed At">{formatDateTime(object.status?.observedAt)}</DrawerItem>
          <DrawerItem name="Reconciled At">{formatDateTime(object.status?.reconciledAt)}</DrawerItem>

          <Gutter size="md" />

          {/* Section 7: Conditions */}
          {object.status?.conditions && object.status.conditions.length > 0 && (
            <>
              <DrawerTitle>Conditions</DrawerTitle>
              <ConditionsList
                conditions={object.status.conditions}
                mode="table"
                tableId="conditions"
                showReason={false}
                showMessage={true}
                showLastTransitionTime={true}
                getMessage={(condition) => condition.message ?? (condition as { reason?: string }).reason ?? "N/A"}
                getLastTransitionTime={(condition) => formatDateTime(condition.lastTransitionTime)}
              />
              <Gutter size="md" />
            </>
          )}

          {/* Section 8: Resources Sync Status (existing table) */}
          <DrawerTitle>Resources Sync Status</DrawerTitle>
          <Table
            tableId="resources"
            key="argo-application-details-resources-table"
            sortable={resourcesSortable}
            sortByDefault={resourcesSortByDefault}
            scrollable={false}
            sortSyncWithUrl={false}
          >
            <TableHead flat sticky={false}>
              <TableCell sortBy={resourcesSortByNames.name}>Name</TableCell>
              <TableCell sortBy={resourcesSortByNames.status}>Sync Status</TableCell>
              <TableCell sortBy={resourcesSortByNames.health}>Health</TableCell>
              <TableCell sortBy={resourcesSortByNames.kind}>Kind</TableCell>
            </TableHead>
            {resources.map((resource, index) => {
              const safeResource = (resource ?? {}) as ArgoApplicationResourceSyncStatus;
              const resourceName = safeResource.name ?? "Unknown";
              const resourceKind = safeResource.kind ?? "Unknown";
              const resourceHealthStatus = (safeResource as { health?: { status?: string } }).health?.status;
              return (
                <TableRow key={`${resourceName}-${resourceKind}-${index}`} sortItem={safeResource}>
                  <TableCell>{resourceName}</TableCell>
                  <TableCell>
                    <StatusBadge status={safeResource.status} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={resourceHealthStatus} />
                  </TableCell>
                  <TableCell>{resourceKind}</TableCell>
                </TableRow>
              );
            })}
          </Table>

          <Gutter size="md" />

          {/* Section 9: Sync History */}
          {history.length > 0 && (
            <>
              <DrawerTitle>Sync History</DrawerTitle>
              <Table
                tableId="sync-history"
                key="argo-application-details-sync-history-table"
                sortable={historySortable}
                sortByDefault={historySortByDefault}
                scrollable={false}
                sortSyncWithUrl={false}
              >
                <TableHead flat sticky={false}>
                  <TableCell sortBy={historySortByNames.id}>ID</TableCell>
                  <TableCell sortBy={historySortByNames.revision}>Revision</TableCell>
                  <TableCell sortBy={historySortByNames.deployedAt}>Deployed At</TableCell>
                  <TableCell>Initiated By</TableCell>
                  <TableCell>Source</TableCell>
                </TableHead>
                {history.map((entry, index) => {
                  const safeEntry = (entry ?? {}) as Record<string, any>;
                  return (
                    <TableRow key={`history-${safeEntry.id ?? index}`} sortItem={safeEntry}>
                      <TableCell>{safeEntry.id ?? "N/A"}</TableCell>
                      <TableCell>{safeEntry.revision ?? "N/A"}</TableCell>
                      <TableCell>{formatDateTime(safeEntry.deployedAt)}</TableCell>
                      <TableCell>
                        {safeEntry.initiatedBy?.username ??
                          (safeEntry.initiatedBy?.automated ? "Automated" : "Unknown")}
                      </TableCell>
                      <TableCell>{safeEntry.source?.repoURL ?? safeEntry.source?.chart ?? "N/A"}</TableCell>
                    </TableRow>
                  );
                })}
              </Table>
            </>
          )}

          <Gutter size="md" />
          <ResourceEventsSection
            resource={{
              uid: object.metadata?.uid,
              name: object.getName?.() ?? object.metadata?.name,
              namespace: object.getNs?.() ?? object.metadata?.namespace,
              kind: object.kind,
              apiVersion: object.apiVersion,
            }}
          />
        </div>
      </>
    );
  }),
);
