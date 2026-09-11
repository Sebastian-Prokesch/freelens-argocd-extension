import { useMemo, useState } from "react";
import {
  getApplicationHealthStatus,
  getApplicationProject,
  getApplicationSyncStatus,
  matchesSelectedFacet,
  uniqueSortedValues,
} from "./application-filter-utils";
import { useArgoApiListFilters } from "./use-argo-api-list-filters";

import type { ArgoApplication } from "../../k8s/argocd/applications";

export function useArgoApiApplicationFilters(applications: ArgoApplication[]) {
  const base = useArgoApiListFilters(applications);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedSyncStatuses, setSelectedSyncStatuses] = useState<string[]>([]);
  const [selectedHealthStatuses, setSelectedHealthStatuses] = useState<string[]>([]);

  const projects = useMemo(
    () => uniqueSortedValues(applications.map((app) => getApplicationProject(app))),
    [applications],
  );
  const syncStatuses = useMemo(
    () => uniqueSortedValues(applications.map((app) => getApplicationSyncStatus(app))),
    [applications],
  );
  const healthStatuses = useMemo(
    () => uniqueSortedValues(applications.map((app) => getApplicationHealthStatus(app))),
    [applications],
  );

  const filteredItems = useMemo(() => {
    return base.filteredItems.filter((app) => {
      return (
        matchesSelectedFacet(selectedProjects, getApplicationProject(app)) &&
        matchesSelectedFacet(selectedSyncStatuses, getApplicationSyncStatus(app)) &&
        matchesSelectedFacet(selectedHealthStatuses, getApplicationHealthStatus(app))
      );
    });
  }, [base.filteredItems, selectedHealthStatuses, selectedProjects, selectedSyncStatuses]);

  return {
    ...base,
    filteredItems,
    filteredCount: filteredItems.length,
    projects,
    syncStatuses,
    healthStatuses,
    selectedProjects,
    setSelectedProjects,
    selectedSyncStatuses,
    setSelectedSyncStatuses,
    selectedHealthStatuses,
    setSelectedHealthStatuses,
  };
}
