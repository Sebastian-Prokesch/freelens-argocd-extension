import { Common } from "@freelensapp/extensions";
import { action, makeObservable, observable } from "mobx";

import type { ArgoCdConnectionMode } from "../argocd-api";

export interface ArgoCdServerConnection {
  id: string;
  name: string;
  apiServerUrl: string;
  apiToken: string;
  insecureSkipTlsVerify: boolean;
  customCaPem: string;
  /** Optional HTTP(S) proxy URL for this Argo CD API connection. */
  httpsProxy: string;
}

export interface ArgoPreferencesModel {
  connectionMode: ArgoCdConnectionMode;
  apiConnections: ArgoCdServerConnection[];
  activeApiConnectionId: string;
  /**
   * Legacy single-connection fields. Still written from the active connection so older
   * builds and failed array loads can recover after restart.
   */
  apiServerUrl?: string;
  apiToken?: string;
  insecureSkipTlsVerify?: boolean;
  customCaPem?: string;
}

const defaultPreferences: ArgoPreferencesModel = {
  connectionMode: "cluster",
  apiConnections: [],
  activeApiConnectionId: "",
  apiServerUrl: "",
  apiToken: "",
  insecureSkipTlsVerify: false,
  customCaPem: "",
};

export function createArgoCdServerConnectionId(): string {
  return `argo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyArgoCdServerConnection(
  overrides: Partial<ArgoCdServerConnection> = {},
): ArgoCdServerConnection {
  return {
    id: createArgoCdServerConnectionId(),
    name: "",
    apiServerUrl: "",
    apiToken: "",
    insecureSkipTlsVerify: false,
    customCaPem: "",
    httpsProxy: "",
    ...overrides,
  };
}

function asPlainConnection(connection: ArgoCdServerConnection): ArgoCdServerConnection {
  return {
    id: connection.id,
    name: connection.name ?? "",
    apiServerUrl: connection.apiServerUrl ?? "",
    apiToken: connection.apiToken ?? "",
    insecureSkipTlsVerify: connection.insecureSkipTlsVerify === true,
    customCaPem: connection.customCaPem ?? "",
    httpsProxy: connection.httpsProxy ?? "",
  };
}

function normalizeConnection(raw: unknown): ArgoCdServerConnection | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Partial<ArgoCdServerConnection>;
  const id = typeof record.id === "string" && record.id.trim() ? record.id.trim() : createArgoCdServerConnectionId();
  return asPlainConnection({
    id,
    name: typeof record.name === "string" ? record.name : "",
    apiServerUrl: typeof record.apiServerUrl === "string" ? record.apiServerUrl : "",
    apiToken: typeof record.apiToken === "string" ? record.apiToken : "",
    insecureSkipTlsVerify: record.insecureSkipTlsVerify === true,
    customCaPem: typeof record.customCaPem === "string" ? record.customCaPem : "",
    httpsProxy: typeof record.httpsProxy === "string" ? record.httpsProxy : "",
  });
}

function parseConnections(raw: unknown): ArgoCdServerConnection[] {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => normalizeConnection(item)).filter((item): item is ArgoCdServerConnection => item != null);
}

function migrateLegacyConnection(data: Partial<ArgoPreferencesModel>): ArgoCdServerConnection | null {
  const apiServerUrl = typeof data.apiServerUrl === "string" ? data.apiServerUrl : "";
  const apiToken = typeof data.apiToken === "string" ? data.apiToken : "";
  if (!apiServerUrl.trim() && !apiToken.trim()) {
    return null;
  }

  return createEmptyArgoCdServerConnection({
    name: "Default",
    apiServerUrl,
    apiToken,
    insecureSkipTlsVerify: data.insecureSkipTlsVerify === true,
    customCaPem: typeof data.customCaPem === "string" ? data.customCaPem : "",
  });
}

export class ArgoPreferencesStore extends Common.Store.ExtensionStore<ArgoPreferencesModel> {
  connectionMode: ArgoCdConnectionMode = defaultPreferences.connectionMode;
  apiConnections: ArgoCdServerConnection[] = [];
  activeApiConnectionId = "";

  constructor() {
    super({
      configName: "argo-preferences-store",
      defaults: defaultPreferences,
    });
    makeObservable(this, {
      connectionMode: observable,
      apiConnections: observable,
      activeApiConnectionId: observable,
      addApiConnection: action,
      removeApiConnection: action,
      selectApiConnection: action,
      updateApiConnection: action,
      fromStore: action,
    });
  }

  getActiveApiConnection(): ArgoCdServerConnection | null {
    if (this.apiConnections.length === 0) {
      return null;
    }

    return (
      this.apiConnections.find((connection) => connection.id === this.activeApiConnectionId) ??
      this.apiConnections[0] ??
      null
    );
  }

  addApiConnection(seed?: Partial<ArgoCdServerConnection>): ArgoCdServerConnection {
    const connection = createEmptyArgoCdServerConnection({
      name: `Argo CD ${this.apiConnections.length + 1}`,
      ...seed,
    });
    this.apiConnections = [...this.apiConnections.map(asPlainConnection), asPlainConnection(connection)];
    this.activeApiConnectionId = connection.id;
    return connection;
  }

  removeApiConnection(connectionId: string): void {
    const next = this.apiConnections.filter((connection) => connection.id !== connectionId).map(asPlainConnection);
    this.apiConnections = next;
    this.activeApiConnectionId = next.some((connection) => connection.id === this.activeApiConnectionId)
      ? this.activeApiConnectionId
      : (next[0]?.id ?? "");
  }

  selectApiConnection(connectionId: string): void {
    if (!this.apiConnections.some((connection) => connection.id === connectionId)) {
      return;
    }
    this.activeApiConnectionId = connectionId;
  }

  updateApiConnection(connectionId: string, patch: Partial<Omit<ArgoCdServerConnection, "id">>): void {
    this.apiConnections = this.apiConnections.map((connection) => {
      if (connection.id !== connectionId) {
        return asPlainConnection(connection);
      }
      return asPlainConnection({
        ...connection,
        ...patch,
        id: connection.id,
      });
    });
  }

  fromStore(data: Partial<ArgoPreferencesModel> = {}): void {
    this.connectionMode = data.connectionMode === "api" ? "api" : "cluster";

    const fromList = parseConnections(data.apiConnections);
    const connections =
      fromList.length > 0
        ? fromList
        : (() => {
            const migrated = migrateLegacyConnection(data);
            return migrated ? [migrated] : [];
          })();

    this.apiConnections = connections.map(asPlainConnection);

    const preferredActive = typeof data.activeApiConnectionId === "string" ? data.activeApiConnectionId : "";
    this.activeApiConnectionId = connections.some((connection) => connection.id === preferredActive)
      ? preferredActive
      : (connections[0]?.id ?? "");
  }

  toJSON(): ArgoPreferencesModel {
    const connections = this.apiConnections.map(asPlainConnection);
    const active =
      connections.find((connection) => connection.id === this.activeApiConnectionId) ?? connections[0] ?? null;

    // Deep-clone for conf/IPC: avoid leaking MobX proxies into electron-store.
    const plainConnections = JSON.parse(JSON.stringify(connections)) as ArgoCdServerConnection[];

    return {
      connectionMode: this.connectionMode,
      apiConnections: plainConnections,
      activeApiConnectionId: active?.id ?? "",
      // Mirror active connection into legacy fields as a restart safety net.
      apiServerUrl: active?.apiServerUrl ?? "",
      apiToken: active?.apiToken ?? "",
      insecureSkipTlsVerify: active?.insecureSkipTlsVerify === true,
      customCaPem: active?.customCaPem ?? "",
    };
  }
}
