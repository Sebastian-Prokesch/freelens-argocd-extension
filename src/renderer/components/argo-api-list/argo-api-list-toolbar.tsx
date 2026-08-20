import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import type { ReactNode } from "react";
import styles from "../../pages/argo-api-list.module.scss";

const {
  Component: { Input },
} = Renderer;

export interface ArgoApiListToolbarProps {
  title: string;
  search: string;
  onSearchChange: (value: string) => void;
  namespace: string;
  onNamespaceChange: (value: string) => void;
  namespaces: string[];
  filteredCount: number;
  totalCount: number;
  searchPlaceholder?: string;
  extraFilters?: ReactNode;
}

export const ArgoApiListToolbar = observer(
  ({
    title,
    search,
    onSearchChange,
    namespace,
    onNamespaceChange,
    namespaces,
    filteredCount,
    totalCount,
    searchPlaceholder = "Search...",
    extraFilters,
  }: ArgoApiListToolbarProps) => {
    return (
      <div className={styles.toolbar}>
        <div className={styles.toolbarTitleRow}>
          <h5 className={styles.toolbarTitle}>{title}</h5>
          <span className={styles.toolbarCount}>
            {filteredCount === totalCount ? `${totalCount} items` : `${filteredCount} of ${totalCount} items`}
          </span>
        </div>
        <div className={styles.toolbarFilters}>
          <div className={styles.searchField}>
            <Input placeholder={searchPlaceholder} value={search} onChange={onSearchChange} trim />
          </div>
          <label className={styles.namespaceField}>
            <span className={styles.namespaceLabel}>Namespace</span>
            <select
              className={styles.namespaceSelect}
              value={namespace}
              onChange={(event) => onNamespaceChange(event.target.value)}
              aria-label="Filter by namespace"
            >
              <option value="">All namespaces</option>
              {namespaces.map((ns) => (
                <option key={ns} value={ns}>
                  {ns}
                </option>
              ))}
            </select>
          </label>
          {extraFilters}
        </div>
      </div>
    );
  },
);
