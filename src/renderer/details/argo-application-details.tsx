import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { withErrorPage } from "../components/error-page";
import { ArgoApplication, ArgoApplicationResourceSyncStatus } from "../k8s/argocd";
import { createEnumFromKeys } from "../utils";
import styles from "./argo-application-details.module.scss";
import stylesInline from "./argo-application-details.module.scss?inline";

const {
  Component: { 
    BadgeBoolean,
    DrawerTitle, 
    DrawerItem, 
    Gutter, 
    Table,
    TableHead,
    TableRow,
    TableCell
   },
} = Renderer;

const resourcesSortable = {
  name: (appResourceStatus: ArgoApplicationResourceSyncStatus) => appResourceStatus.name,
  status: (appResourceStatus: ArgoApplicationResourceSyncStatus) => appResourceStatus.status,
  kind: (appResourceStatus: ArgoApplicationResourceSyncStatus) => appResourceStatus.kind,
};

const resourcesSortByNames = createEnumFromKeys(resourcesSortable);
const resourcesSortByDefault: { sortBy: keyof typeof resourcesSortable; orderBy: Renderer.Component.TableOrderBy } = {
  sortBy: resourcesSortByNames.kind,
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

export interface ArgoApplicationDetailsProps extends Renderer.Component.KubeObjectDetailsProps<ArgoApplication> {
  extension: Renderer.LensExtension;
}

export const ArgoApplicationDetails = observer((props: ArgoApplicationDetailsProps) =>
  withErrorPage(props, () => {
    const { object } = props;

    return (
      <>
        <style>{stylesInline}</style>
        <div className={styles.argoApplicationDetails}>
          <Gutter size="md"/>
          
          {/* Section 1: Source Configuration */}
          <DrawerTitle>Source Configuration</DrawerTitle>
          {object.spec.source ? (
            // Single source
            <>
              <DrawerItem name="Repository URL">
                {object.spec.source.repoURL || "Not specified"}
              </DrawerItem>
              <DrawerItem name="Source Type">
                {getSourceType(object.spec.source)}
              </DrawerItem>
              {object.spec.source.targetRevision && (
                <DrawerItem name="Target Revision">
                  {object.spec.source.targetRevision}
                </DrawerItem>
              )}
              {object.spec.source.path && (
                <DrawerItem name="Path">
                  {object.spec.source.path}
                </DrawerItem>
              )}
              {object.spec.source.chart && (
                <DrawerItem name="Chart">
                  {object.spec.source.chart}
                </DrawerItem>
              )}
              {object.spec.source.helm && (
                <>
                  <DrawerItem name="Helm Version">
                    {object.spec.source.helm.version || "Not specified"}
                  </DrawerItem>
                  {object.spec.source.helm.releaseName && (
                    <DrawerItem name="Release Name">
                      {object.spec.source.helm.releaseName}
                    </DrawerItem>
                  )}
                  {object.spec.source.helm.valueFiles && object.spec.source.helm.valueFiles.length > 0 && (
                    <DrawerItem name="Value Files">
                      {object.spec.source.helm.valueFiles.join(", ")}
                    </DrawerItem>
                  )}
                </>
              )}
              {object.spec.source.kustomize && (
                <>
                  <DrawerItem name="Kustomize Version">
                    {object.spec.source.kustomize.version || "Not specified"}
                  </DrawerItem>
                  {object.spec.source.kustomize.namePrefix && (
                    <DrawerItem name="Name Prefix">
                      {object.spec.source.kustomize.namePrefix}
                    </DrawerItem>
                  )}
                  {object.spec.source.kustomize.nameSuffix && (
                    <DrawerItem name="Name Suffix">
                      {object.spec.source.kustomize.nameSuffix}
                    </DrawerItem>
                  )}
                </>
              )}
              {object.spec.source.plugin && (
                <>
                  <DrawerItem name="Plugin Name">
                    {object.spec.source.plugin.name || "Not specified"}
                  </DrawerItem>
                  {object.spec.source.plugin.env && object.spec.source.plugin.env.length > 0 && (
                    <DrawerItem name="Environment Variables">
                      {object.spec.source.plugin.env.map(env => `${env.name}=${env.value}`).join(", ")}
                    </DrawerItem>
                  )}
                  {object.spec.source.plugin.parameters && object.spec.source.plugin.parameters.length > 0 && (
                    <DrawerItem name="Parameters">
                      {object.spec.source.plugin.parameters.map(param => 
                        param.name ? `${param.name}: ${param.string || param.array?.join(",") || param.map ? JSON.stringify(param.map) : "Not set"}` : "Unnamed parameter"
                      ).join(", ")}
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
                    <div><strong>Repository:</strong> {source.repoURL || "Not specified"}</div>
                    <div><strong>Type:</strong> {getSourceType(source)}</div>
                    {source.targetRevision && <div><strong>Revision:</strong> {source.targetRevision}</div>}
                    {source.path && <div><strong>Path:</strong> {source.path}</div>}
                    {source.chart && <div><strong>Chart:</strong> {source.chart}</div>}
                    {source.plugin && <div><strong>Plugin:</strong> {source.plugin.name || "Not specified"}</div>}
                  </div>
                </DrawerItem>
              </div>
            ))
          ) : (
            <DrawerItem name="Source">Not configured</DrawerItem>
          )}

          <Gutter size="md"/>

          {/* Section 2: Destination */}
          <DrawerTitle>Destination</DrawerTitle>
          <DrawerItem name="Cluster">
            {object.spec.destination?.server || object.spec.destination?.name || "Not specified"}
          </DrawerItem>
          <DrawerItem name="Namespace">
            {object.spec.destination?.namespace || "Not specified"}
          </DrawerItem>

          <Gutter size="md"/>

          {/* Section 3: Sync Policy */}
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
                <DrawerItem name="Sync Options">
                  {formatSyncOptions(object.spec.syncPolicy.syncOptions)}
                </DrawerItem>
              )}
              {object.spec.syncPolicy.retry && (
                <>
                  <DrawerItem name="Retry Limit">
                    {object.spec.syncPolicy.retry.limit || "Not set"}
                  </DrawerItem>
                  <DrawerItem name="Retry Backoff">
                    {formatRetryBackoff(object.spec.syncPolicy.retry.backoff)}
                  </DrawerItem>
                </>
              )}
              <Gutter size="md"/>
            </>
          )}

          {/* Section 4: Advanced Settings */}
          {(object.spec.ignoreDifferences && object.spec.ignoreDifferences.length > 0) && (
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
                  {object.spec.ignoreDifferences.map((diff, index) => (
                    <TableRow key={`${diff.kind}-${diff.name}-${index}`}>
                      <TableCell>{diff.kind}</TableCell>
                      <TableCell>{diff.name || "All"}</TableCell>
                      <TableCell>{diff.namespace || "All"}</TableCell>
                      <TableCell>{diff.group || "All"}</TableCell>
                    </TableRow>
                  ))}
                </Table>
              </DrawerItem>
              <Gutter size="md"/>
            </>
          )}

          {/* Section 5: Resources Sync Status (existing table) */}
          <DrawerTitle>Resources Sync Status</DrawerTitle>
          <Table 
            tableId="resources"
            key="argo-application-details-ressources-table" 
            sortable={resourcesSortable}
            sortByDefault={resourcesSortByDefault}
            scrollable={false}
            sortSyncWithUrl={false}
          >
              <TableHead flat sticky={false}>
                    <TableCell sortBy={resourcesSortByNames.name}>Name</TableCell>
                    <TableCell sortBy={resourcesSortByNames.status}>Sync Status</TableCell>
                    <TableCell sortBy={resourcesSortByNames.kind}>Kind</TableCell>
              </TableHead>
            {object.status?.resources?.map((resource, index) => (
                <TableRow key={`${resource.name}-${resource.kind}-${index}`}sortItem={resource}>
                    <TableCell>{resource.name}</TableCell>
                    <TableCell>{resource.status || 'Unknown'}</TableCell>
                    <TableCell>{resource.kind}</TableCell>
                </TableRow>
              ))}
          </Table>
        </div>
      </>
    );
  }),
);
