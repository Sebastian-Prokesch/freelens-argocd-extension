import { useMemo, useState } from "react";

export interface ArgoApiListFilterable {
  getName?: () => string;
  getNs?: () => string | undefined;
  metadata?: { name?: string; namespace?: string };
  getSearchFields?: () => Array<string | undefined | null>;
}

function getObjectName(object: ArgoApiListFilterable): string {
  return object.getName?.() || object.metadata?.name || "";
}

function getObjectNamespace(object: ArgoApiListFilterable): string {
  return object.getNs?.() || object.metadata?.namespace || "";
}

function matchesSearch(object: ArgoApiListFilterable, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const fields = [
    getObjectName(object),
    getObjectNamespace(object),
    ...(object.getSearchFields?.() ?? []),
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  return fields.some((field) => field.includes(normalized));
}

export function useArgoApiListFilters<T extends ArgoApiListFilterable>(items: T[]) {
  const [search, setSearch] = useState("");
  const [namespace, setNamespace] = useState("");

  const namespaces = useMemo(() => {
    const unique = new Set<string>();
    for (const item of items) {
      const ns = getObjectNamespace(item);
      if (ns) unique.add(ns);
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filteredItems = useMemo((): T[] => {
    return items.filter((item) => {
      if (namespace && getObjectNamespace(item) !== namespace) {
        return false;
      }
      return matchesSearch(item, search);
    });
  }, [items, namespace, search]);

  return {
    search,
    setSearch,
    namespace,
    setNamespace,
    namespaces,
    filteredItems,
    totalCount: items.length,
    filteredCount: filteredItems.length,
  };
}
