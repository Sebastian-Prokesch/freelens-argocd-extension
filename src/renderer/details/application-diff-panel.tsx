import { Renderer } from "@freelensapp/extensions";
import { useEffect } from "react";
import { StatusBadge } from "../components/shared";
import {
  type ApplicationResourceDiagnostic,
  buildApplicationResourceKey,
  getApplicationResourceRowElementId,
  groupDiffResourcesByNamespaceAndKind,
} from "../k8s/argocd/application-diagnostics";
import styles from "./application-diff-panel.module.scss";

const {
  Component: { Table, TableHead, TableRow, TableCell },
} = Renderer;

interface ApplicationDiffPanelProps {
  resources: unknown[];
  defaultNamespace?: string;
  highlightedResourceKey?: string;
}

export function ApplicationDiffPanel({
  resources,
  defaultNamespace,
  highlightedResourceKey,
}: ApplicationDiffPanelProps) {
  const groups = groupDiffResourcesByNamespaceAndKind(resources, { defaultNamespace });

  useEffect(() => {
    if (!highlightedResourceKey) {
      return;
    }

    const element = document.getElementById(getApplicationResourceRowElementId(highlightedResourceKey));
    element?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  }, [highlightedResourceKey, groups]);

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
                {kindGroup.resources.map((resource: ApplicationResourceDiagnostic, index) => {
                  const resourceKey = buildApplicationResourceKey(resource, defaultNamespace);
                  const isHighlighted = highlightedResourceKey === resourceKey;
                  const rowElementId = getApplicationResourceRowElementId(resourceKey);
                  const rowHighlightClass = isHighlighted ? styles.highlightedRow : undefined;

                  return (
                    <TableRow key={`${resource.name}-${index}`}>
                      <TableCell>
                        <span id={rowElementId} className={rowHighlightClass}>
                          {resource.name}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={rowHighlightClass}>
                          <StatusBadge status={resource.syncStatus} fallbackLabel="Unknown" />
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={rowHighlightClass}>
                          <StatusBadge status={resource.healthStatus} fallbackLabel="N/A" />
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </Table>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
