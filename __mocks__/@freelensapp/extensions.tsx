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
  ({ children, title }: AnyRecord) => (
    <span data-testid={name}>
      {children ?? title}
    </span>
  );

// Jest-callable components we want to introspect in tests if needed
export const PieChart = jest.fn(({ data }: AnyRecord) => (
  <div data-testid="PieChart" data-labels={JSON.stringify(data?.labels ?? [])}>
    PieChart
  </div>
));

export const Renderer = {
  LensExtension: class {},
  Component: {
    // charts
    PieChart,

    // overview page
    Events: passthrough("Events"),
    NamespaceSelectFilter: passthrough("NamespaceSelectFilter"),
    TabLayout: passthrough("TabLayout"),
    Tabs: ({ children }: AnyRecord) => <div data-testid="Tabs">{children}</div>,
    Tab: ({ label }: AnyRecord) => <div data-testid="Tab">{label}</div>,

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

    // dialog & inputs
    Dialog: ({ children }: AnyRecord) => <div data-testid="Dialog">{children}</div>,
    Input: ({ value, onChange, ...props }: AnyRecord) => (
      <input
        data-testid="Input"
        value={value ?? ""}
        onChange={(event) => onChange?.(event.target.value, event)}
        {...props}
      />
    ),
    Button: ({ onClick, children }: AnyRecord) => (
      <button type="button" data-testid="Button" onClick={onClick}>
        {children}
      </button>
    ),
    Notifications: {
      ok: jest.fn(),
      error: jest.fn(),
    },
    ConfirmDialog: {
      confirm: jest.fn(async () => true),
    },

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
    configMapStore: {
      items: [],
      contextItems: [],
      loadAll: async () => {},
      subscribe: () => noop,
      create: jest.fn(),
      patch: jest.fn(),
      remove: jest.fn(),
    },
    secretsStore: {
      items: [],
      contextItems: [],
      loadAll: async () => {},
      subscribe: () => noop,
      create: jest.fn(),
      patch: jest.fn(),
      remove: jest.fn(),
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

