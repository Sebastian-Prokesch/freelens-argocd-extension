import React from "react";

type AnyRecord = Record<string, any>;

const noop = () => {};

// Component helpers
const passthrough =
  (name: string) =>
  ({ children }: AnyRecord) => (
    <div data-testid={name}>
      {children}
    </div>
  );

const textComponent =
  (name: string) =>
  ({ children }: AnyRecord) => (
    <span data-testid={name}>
      {children}
    </span>
  );

// Jest-callable components we want to introspect in tests if needed
export const PieChart = jest.fn(({ data }: AnyRecord) => (
  <div data-testid="PieChart" data-labels={JSON.stringify(data?.labels ?? [])}>
    PieChart
  </div>
));

export const Renderer = {
  Component: {
    // charts
    PieChart,

    // overview page
    Events: passthrough("Events"),
    NamespaceSelectFilter: passthrough("NamespaceSelectFilter"),
    TabLayout: passthrough("TabLayout"),

    // details page
    BadgeBoolean: ({ value }: { value: boolean }) => (
      <span data-testid="BadgeBoolean">{value ? "true" : "false"}</span>
    ),
    DrawerTitle: textComponent("DrawerTitle"),
    DrawerItem: ({ name, children }: { name: string; children: React.ReactNode }) => (
      <div data-testid="DrawerItem">
        <div data-testid="DrawerItemName">{name}</div>
        <div data-testid="DrawerItemContent">{children}</div>
      </div>
    ),
    Gutter: passthrough("Gutter"),
    Table: passthrough("Table"),
    TableHead: passthrough("TableHead"),
    TableRow: passthrough("TableRow"),
    TableCell: passthrough("TableCell"),
    TableOrderBy: undefined as any,

    // list page (not currently tested, but harmless to include)
    KubeObjectAge: passthrough("KubeObjectAge"),
    KubeObjectListLayout: passthrough("KubeObjectListLayout"),
    WithTooltip: passthrough("WithTooltip"),

    // menu
    MenuItem: ({ onClick, children }: AnyRecord) => (
      <button type="button" data-testid="MenuItem" onClick={onClick}>
        {children}
      </button>
    ),
    Icon: passthrough("Icon"),
  },

  // minimal K8sApi bits for pages using stores
  K8sApi: {
    namespaceStore: {
      items: [],
      loadAll: async () => {},
      subscribe: () => noop,
    },
    apiManager: {
      registerStore: noop,
    },
    namespacesApi: {
      formatUrlForNotListing: ({ name }: { name: string }) => `/api/v1/namespaces/${name}`,
    },
    KubeObjectMetadata: class {},
    LensExtensionKubeObject: class {},
    KubeApi: class {},
    KubeObjectStore: class {},
  },

  Navigation: {
    getDetailsUrl: (url: string) => url,
  },
} as const;

export const Common = {
  logger: {
    error: noop,
  },
  Util: {
    stopPropagation: noop,
  },
} as const;

