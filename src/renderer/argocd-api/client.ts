import type { ArgoCdApiConnection, ArgoCdHttpRequest } from "../../common/argocd-api";
import type { ApplicationSyncOptions } from "../endpoints/application-sync-options";
import { DEFAULT_APPLICATION_SYNC_OPTIONS } from "../endpoints/application-sync-options";
import type { ApplicationHistoryEntry } from "../endpoints/argo-application-endpoints";
import type { ArgoApplication } from "../k8s/argocd/applications";
import { ArgoApplication as ArgoApplicationCtor } from "../k8s/argocd/applications";
import type { ArgoApplicationSet } from "../k8s/argocd/applicationset";
import { ArgoApplicationSet as ArgoApplicationSetCtor } from "../k8s/argocd/applicationset";
import type { ArgoAppProject } from "../k8s/argocd/appproject";
import { ArgoAppProject as ArgoAppProjectCtor } from "../k8s/argocd/appproject";
import { getArgoCdApiConnection } from "./connection";
import { createKubeLikeObject, normalizeArgoCdApiItem } from "./hydrate";
import { sendArgoCdHttpJson } from "./transport";

export interface ArgoCdApplicationRef {
  name: string;
  appNamespace?: string;
}

export function getArgoCdApplicationRef(application: {
  getName?: () => string;
  getNs?: () => string | undefined;
  metadata?: { name?: string; namespace?: string };
}): ArgoCdApplicationRef {
  const name = application.getName?.() ?? application.metadata?.name ?? "";
  const appNamespace = application.getNs?.() ?? application.metadata?.namespace;
  return {
    name,
    appNamespace: appNamespace || undefined,
  };
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
}

function listItems(payload: unknown): Record<string, unknown>[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  return asRecordArray((payload as { items?: unknown }).items);
}

export class ArgoCdApiClient {
  constructor(private readonly getConnection: () => ArgoCdApiConnection = getArgoCdApiConnection) {}

  private async request(
    partial: Omit<
      ArgoCdHttpRequest,
      "serverUrl" | "token" | "insecureSkipTlsVerify" | "customCaPem" | "httpsProxy"
    >,
  ): Promise<unknown> {
    const connection = this.getConnection();
    return sendArgoCdHttpJson({
      ...partial,
      serverUrl: connection.apiServerUrl,
      token: connection.apiToken,
      insecureSkipTlsVerify: connection.insecureSkipTlsVerify,
      customCaPem: connection.customCaPem,
      httpsProxy: connection.httpsProxy,
    });
  }

  async testConnection(connection: ArgoCdApiConnection): Promise<{ username?: string; version?: string }> {
    // Argo CD exposes version at /api/version (not /api/v1/version).
    const versionPayload = (await sendArgoCdHttpJson({
      serverUrl: connection.apiServerUrl,
      token: connection.apiToken,
      insecureSkipTlsVerify: connection.insecureSkipTlsVerify,
      customCaPem: connection.customCaPem,
      httpsProxy: connection.httpsProxy,
      method: "GET",
      path: "/api/version",
    })) as { Version?: string };

    let username: string | undefined;
    try {
      const userInfo = (await sendArgoCdHttpJson({
        serverUrl: connection.apiServerUrl,
        token: connection.apiToken,
        insecureSkipTlsVerify: connection.insecureSkipTlsVerify,
        customCaPem: connection.customCaPem,
        httpsProxy: connection.httpsProxy,
        method: "GET",
        path: "/api/v1/session/userinfo",
      })) as { username?: string };
      username = userInfo.username;
    } catch {
      // userinfo is optional; version already validated reachability.
    }

    return {
      version: versionPayload.Version,
      username,
    };
  }

  async listApplications(): Promise<ArgoApplication[]> {
    const payload = await this.request({ method: "GET", path: "/api/v1/applications" });
    return listItems(payload).map((item) =>
      createKubeLikeObject(ArgoApplicationCtor, normalizeArgoCdApiItem(item, "Application")),
    );
  }

  async getApplication(name: string, appNamespace?: string): Promise<ArgoApplication> {
    const payload = (await this.request({
      method: "GET",
      path: `/api/v1/applications/${encodeURIComponent(name)}`,
      query: { appNamespace },
    })) as Record<string, unknown>;

    return createKubeLikeObject(ArgoApplicationCtor, normalizeArgoCdApiItem(payload, "Application"));
  }

  async listProjects(): Promise<ArgoAppProject[]> {
    const payload = await this.request({ method: "GET", path: "/api/v1/projects" });
    return listItems(payload).map((item) =>
      createKubeLikeObject(ArgoAppProjectCtor, normalizeArgoCdApiItem(item, "AppProject")),
    );
  }

  async listApplicationSets(): Promise<ArgoApplicationSet[]> {
    const payload = await this.request({ method: "GET", path: "/api/v1/applicationsets" });
    return listItems(payload).map((item) =>
      createKubeLikeObject(ArgoApplicationSetCtor, normalizeArgoCdApiItem(item, "ApplicationSet")),
    );
  }

  async syncApplication(
    application: ArgoApplication,
    options: ApplicationSyncOptions = DEFAULT_APPLICATION_SYNC_OPTIONS,
  ): Promise<void> {
    const ref = getArgoCdApplicationRef(application);
    const syncStrategy = options.syncStrategy ?? "hook";
    const strategyBody = options.force ? { force: true } : {};

    await this.request({
      method: "POST",
      path: `/api/v1/applications/${encodeURIComponent(ref.name)}/sync`,
      query: { appNamespace: ref.appNamespace },
      body: {
        prune: options.prune || undefined,
        dryRun: options.dryRun || undefined,
        revision: options.revision?.trim() || undefined,
        strategy: {
          [syncStrategy]: strategyBody,
        },
        syncOptions: options.syncOptions && options.syncOptions.length > 0 ? { items: options.syncOptions } : undefined,
        appNamespace: ref.appNamespace,
      },
    });
  }

  async refreshApplication(application: ArgoApplication, mode: "normal" | "hard"): Promise<void> {
    const ref = getArgoCdApplicationRef(application);
    await this.request({
      method: "GET",
      path: `/api/v1/applications/${encodeURIComponent(ref.name)}`,
      query: {
        appNamespace: ref.appNamespace,
        refresh: mode,
      },
    });
  }

  async terminateApplicationOperation(application: ArgoApplication): Promise<void> {
    const ref = getArgoCdApplicationRef(application);
    await this.request({
      method: "DELETE",
      path: `/api/v1/applications/${encodeURIComponent(ref.name)}/operation`,
      query: { appNamespace: ref.appNamespace },
    });
  }

  async rollbackApplication(application: ArgoApplication, entry: ApplicationHistoryEntry): Promise<void> {
    const ref = getArgoCdApplicationRef(application);
    if (entry.id == null) {
      throw new Error("Rollback requires a history entry id from Argo CD.");
    }

    await this.request({
      method: "POST",
      path: `/api/v1/applications/${encodeURIComponent(ref.name)}/rollback`,
      query: { appNamespace: ref.appNamespace },
      body: {
        id: entry.id,
        name: ref.name,
        appNamespace: ref.appNamespace,
      },
    });
  }

  async updateApplicationSpec(
    application: ArgoApplication,
    spec: Record<string, unknown>,
  ): Promise<ArgoApplication> {
    const ref = getArgoCdApplicationRef(application);
    const payload = (await this.request({
      method: "PUT",
      path: `/api/v1/applications/${encodeURIComponent(ref.name)}/spec`,
      query: { appNamespace: ref.appNamespace },
      body: spec,
    })) as Record<string, unknown>;

    // UpdateSpec may return Application or ApplicationSpec depending on Argo CD version.
    const applicationPayload =
      payload && typeof payload === "object" && "metadata" in payload
        ? payload
        : {
            apiVersion: "argoproj.io/v1alpha1",
            kind: "Application",
            metadata: {
              name: ref.name,
              namespace: ref.appNamespace,
            },
            spec: payload,
            status: (application as { status?: unknown }).status,
          };

    return createKubeLikeObject(
      ArgoApplicationCtor,
      normalizeArgoCdApiItem(applicationPayload as Record<string, unknown>, "Application"),
    );
  }
}

let client: ArgoCdApiClient | undefined;

export function getArgoCdApiClient(): ArgoCdApiClient {
  if (!client) {
    client = new ArgoCdApiClient();
  }
  return client;
}

export function setArgoCdApiClientForTests(next: ArgoCdApiClient | undefined): void {
  client = next;
}
