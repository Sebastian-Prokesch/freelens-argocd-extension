import { Renderer } from "@freelensapp/extensions";
import { useState } from "react";
import { StatusBadge } from "../components/shared";
import {
  type ApplicationResourceDiagnostic,
  rankDriftHotspots,
  sortDriftHotspots,
} from "../k8s/argocd/application-diagnostics";

const {
  Component: { Button, Table, TableHead, TableRow, TableCell },
} = Renderer;

const DEFAULT_HOTSPOT_LIMIT = 5;

interface ApplicationDriftHotspotsTableProps {
  resources: unknown[];
}

export function ApplicationDriftHotspotsTable({ resources }: ApplicationDriftHotspotsTableProps) {
  const [expanded, setExpanded] = useState(false);
  const ranked = rankDriftHotspots(resources, { limit: DEFAULT_HOTSPOT_LIMIT });
  const allHotspots = sortDriftHotspots(resources);
  const visibleHotspots = expanded ? allHotspots : ranked.hotspots;

  if (ranked.totalDriftCount === 0) {
    return <span>No drift detected</span>;
  }

  return (
    <>
      <Table tableId="drift-hotspots" scrollable={false} sortSyncWithUrl={false}>
        <TableHead flat sticky={false}>
          <TableCell>Name</TableCell>
          <TableCell>Kind</TableCell>
          <TableCell>Sync Status</TableCell>
          <TableCell>Health</TableCell>
        </TableHead>
        {visibleHotspots.map((resource: ApplicationResourceDiagnostic, index) => (
          <TableRow key={`${resource.kind}-${resource.name}-${index}`}>
            <TableCell>{resource.name}</TableCell>
            <TableCell>{resource.kind}</TableCell>
            <TableCell>
              <StatusBadge status={resource.syncStatus} fallbackLabel="Unknown" />
            </TableCell>
            <TableCell>
              <StatusBadge status={resource.healthStatus} fallbackLabel="N/A" />
            </TableCell>
          </TableRow>
        ))}
      </Table>
      {ranked.hasMore ? (
        <Button className="mt-2" onClick={() => setExpanded((value) => !value)}>
          {expanded ? `Show top ${DEFAULT_HOTSPOT_LIMIT}` : `Show all ${ranked.totalDriftCount} hotspots`}
        </Button>
      ) : null}
    </>
  );
}
