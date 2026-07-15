import { Renderer } from "@freelensapp/extensions";
import { StatusBadge } from "../components/shared";
import {
  type ApplicationResourceDiagnostic,
  groupDiffResourcesByNamespaceAndKind,
} from "../k8s/argocd/application-diagnostics";
import styles from "./application-diff-panel.module.scss";

const {
  Component: { Table, TableHead, TableRow, TableCell },
} = Renderer;

interface ApplicationDiffPanelProps {
  resources: unknown[];
  defaultNamespace?: string;
}

export function ApplicationDiffPanel({ resources, defaultNamespace }: ApplicationDiffPanelProps) {
  const groups = groupDiffResourcesByNamespaceAndKind(resources, { defaultNamespace });

  if (groups.length === 0) {
    return <span>All resources in sync</span>;
  }

  return (
    <div className={styles.diffPanel}>
      {groups.map((namespaceGroup) => (
        <div key={namespaceGroup.namespace} className={styles.namespaceGroup}>
          <div className={styles.namespaceHeading}>{namespaceGroup.namespace}</div>
          {namespaceGroup.kinds.map((kindGroup) => (
            <div key={`${namespaceGroup.namespace}-${kindGroup.kind}`} className={styles.kindGroup}>
              <div className={styles.kindHeading}>{kindGroup.kind}</div>
              <Table
                tableId={`resource-diff-${namespaceGroup.namespace}-${kindGroup.kind}`}
                scrollable={false}
                sortSyncWithUrl={false}
              >
                <TableHead flat sticky={false}>
                  <TableCell>Name</TableCell>
                  <TableCell>Sync Status</TableCell>
                  <TableCell>Health</TableCell>
                </TableHead>
                {kindGroup.resources.map((resource: ApplicationResourceDiagnostic, index) => (
                  <TableRow key={`${resource.name}-${index}`}>
                    <TableCell>{resource.name}</TableCell>
                    <TableCell>
                      <StatusBadge status={resource.syncStatus} fallbackLabel="Unknown" />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={resource.healthStatus} fallbackLabel="N/A" />
                    </TableCell>
                  </TableRow>
                ))}
              </Table>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
