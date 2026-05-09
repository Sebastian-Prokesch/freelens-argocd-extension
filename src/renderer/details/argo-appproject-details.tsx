import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { withErrorPage } from "../components/error-page";
import { ArgoAppProject } from "../k8s/argocd";
import styles from "./argo-appproject-details.module.scss";
import stylesInline from "./argo-appproject-details.module.scss?inline";

const {
  Component: { DrawerItem, DrawerTitle, Gutter, Table, TableCell, TableHead, TableRow },
} = Renderer;

export interface ArgoAppProjectDetailsProps extends Renderer.Component.KubeObjectDetailsProps<ArgoAppProject> {
  extension: Renderer.LensExtension;
}

const renderStringList = (values?: string[]) => {
  if (!values?.length) return "None";
  return values.join(", ");
};

const formatJwtToken = (token: { iat?: number; exp?: number; id?: string }) => {
  const parts: string[] = [];
  if (token.id) parts.push(`id=${token.id}`);
  if (token.iat) parts.push(`iat=${token.iat}`);
  if (token.exp) parts.push(`exp=${token.exp}`);
  return parts.length > 0 ? parts.join(" ") : "token";
};

const renderTable = (rows: any[], columns: string[], rowRenderer: (row: any) => any[]) => {
  if (!rows?.length) return <span>None</span>;

  return (
    <div className={styles.tableWrapper}>
      <Table scrollable={false} sortSyncWithUrl={false}>
        <TableHead flat sticky={false}>
          {columns.map((column) => (
            <TableCell key={column}>{column}</TableCell>
          ))}
        </TableHead>
        {rows.map((row, index) => (
          <TableRow key={`row-${index}`}>
            {rowRenderer(row).map((cell, cellIndex) => (
              <TableCell key={`cell-${cellIndex}`}>{cell}</TableCell>
            ))}
          </TableRow>
        ))}
      </Table>
    </div>
  );
};

export const ArgoAppProjectDetails = observer((props: ArgoAppProjectDetailsProps) =>
  withErrorPage(props, () => {
    const { object } = props;
    const spec = object?.spec ?? {};

    return (
      <>
        <style>{stylesInline}</style>
        <div className={styles.argoAppProjectDetails}>
          <DrawerTitle>General</DrawerTitle>
          <DrawerItem name="Description">{spec.description ?? "None"}</DrawerItem>

          <Gutter size="md" />

          <DrawerTitle>Source Repositories</DrawerTitle>
          <DrawerItem name="Repositories">{renderStringList(spec.sourceRepos)}</DrawerItem>

          <Gutter size="md" />

          <DrawerTitle>Destinations</DrawerTitle>
          <DrawerItem name="Allowed Destinations">
            {renderTable(spec.destinations ?? [], ["Server", "Namespace"], (destination) => [
              destination.server ?? destination.name ?? "Any",
              destination.namespace ?? "Any",
            ])}
          </DrawerItem>

          <Gutter size="md" />

          <DrawerTitle>Cluster Resource Whitelist</DrawerTitle>
          <DrawerItem name="Allowed Cluster Resources">
            {renderTable(spec.clusterResourceWhitelist ?? [], ["Group", "Kind"], (resource) => [
              resource.group ?? "*",
              resource.kind ?? "*",
            ])}
          </DrawerItem>

          <Gutter size="md" />

          <DrawerTitle>Namespace Resource Whitelist</DrawerTitle>
          <DrawerItem name="Allowed Namespace Resources">
            {renderTable(spec.namespaceResourceWhitelist ?? [], ["Group", "Kind"], (resource) => [
              resource.group ?? "*",
              resource.kind ?? "*",
            ])}
          </DrawerItem>

          <Gutter size="md" />

          <DrawerTitle>Cluster Resource Blacklist</DrawerTitle>
          <DrawerItem name="Blocked Cluster Resources">
            {renderTable(spec.clusterResourceBlacklist ?? [], ["Group", "Kind"], (resource) => [
              resource.group ?? "*",
              resource.kind ?? "*",
            ])}
          </DrawerItem>

          <Gutter size="md" />

          <DrawerTitle>Namespace Resource Blacklist</DrawerTitle>
          <DrawerItem name="Blocked Namespace Resources">
            {renderTable(spec.namespaceResourceBlacklist ?? [], ["Group", "Kind"], (resource) => [
              resource.group ?? "*",
              resource.kind ?? "*",
            ])}
          </DrawerItem>

          <Gutter size="md" />

          <DrawerTitle>Roles</DrawerTitle>
          <DrawerItem name="Role Definitions">
            {renderTable(spec.roles ?? [], ["Name", "Description", "Groups", "Policies", "JWT Tokens"], (role) => {
              const jwtTokens = Array.isArray(role.jwtTokens) ? role.jwtTokens : [];

              return [
                role.name ?? "N/A",
                role.description ?? "N/A",
                renderStringList(role.groups),
                renderStringList(role.policies),
                jwtTokens.length > 0 ? jwtTokens.map((token: any) => formatJwtToken(token)).join(", ") : "None",
              ];
            })}
          </DrawerItem>

          <Gutter size="md" />

          <DrawerTitle>Sync Windows</DrawerTitle>
          <DrawerItem name="Window Rules">
            {renderTable(
              spec.syncWindows ?? [],
              ["Kind", "Schedule", "Duration", "Applications", "Manual Sync", "Timezone"],
              (window) => [
                window.kind ?? "N/A",
                window.schedule ?? "N/A",
                window.duration ?? "N/A",
                renderStringList(window.applications),
                window.manualSync ? "true" : "false",
                window.timeZone ?? "N/A",
              ],
            )}
          </DrawerItem>

          <Gutter size="md" />

          <DrawerTitle>Source Namespaces</DrawerTitle>
          <DrawerItem name="Allowed Source Namespaces">{renderStringList(spec.sourceNamespaces)}</DrawerItem>

          <Gutter size="md" />

          <DrawerTitle>Orphaned Resources</DrawerTitle>
          <DrawerItem name="Warning Enabled">
            {spec.orphanedResources?.warn === undefined ? "N/A" : spec.orphanedResources.warn ? "true" : "false"}
          </DrawerItem>
          <DrawerItem name="Ignored Resources">
            {renderTable(spec.orphanedResources?.ignore ?? [], ["Group", "Kind", "Name"], (resource) => [
              resource.group ?? "*",
              resource.kind ?? "*",
              resource.name ?? "*",
            ])}
          </DrawerItem>
        </div>
      </>
    );
  }),
);
