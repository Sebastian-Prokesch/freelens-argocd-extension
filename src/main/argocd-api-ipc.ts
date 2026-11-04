import { Main } from "@freelensapp/extensions";
import { ARGOCD_API_HTTP_CHANNEL } from "../common/argocd-api";
import { ArgoPreferencesStore } from "../common/store";
import { performArgoCdHttpRequest } from "./argocd-api-http";

import type { ArgoCdHttpMethod, ArgoCdHttpResponse, ArgoCdIpcRequest } from "../common/argocd-api";

function isAllowedArgoCdApiPath(path: string): boolean {
  // Allow only Argo CD API endpoints. This prevents renderer from turning the main process
  // into a generic authenticated proxy.
  if (!/^\/api(?:\/|$)/.test(path)) {
    return false;
  }
  // Basic hardening: reject path traversal patterns.
  if (path.includes("..") || path.includes("\0")) {
    return false;
  }
  return true;
}

function isAllowedArgoCdHttpMethod(method: unknown): method is ArgoCdHttpMethod {
  return method === "GET" || method === "POST" || method === "PUT" || method === "DELETE";
}

export async function handleArgoCdApiHttpRequest(
  _event: unknown,
  request: ArgoCdIpcRequest,
): Promise<ArgoCdHttpResponse> {
  if (!request || typeof request !== "object") {
    return { status: 400, bodyText: "Invalid IPC payload." };
  }

  if (typeof request.connectionId !== "string" || !request.connectionId.trim()) {
    return { status: 400, bodyText: "Missing connectionId." };
  }

  if (!isAllowedArgoCdHttpMethod(request.method)) {
    return { status: 400, bodyText: "Invalid HTTP method." };
  }

  if (typeof request.path !== "string" || !isAllowedArgoCdApiPath(request.path)) {
    return { status: 403, bodyText: "Forbidden: destination path is not an allowed Argo CD API endpoint." };
  }

  const preferences = ArgoPreferencesStore.getInstanceOrCreate<ArgoPreferencesStore>();
  const connection = preferences.apiConnections.find((c) => c.id === request.connectionId) ?? null;
  if (!connection) {
    return { status: 403, bodyText: "Forbidden: unknown Argo CD API connectionId." };
  }

  // Resolve secrets in main process (token/TLS/proxy are stored in preferences).
  return performArgoCdHttpRequest({
    serverUrl: connection.apiServerUrl,
    token: connection.apiToken,
    insecureSkipTlsVerify: connection.insecureSkipTlsVerify,
    customCaPem: connection.customCaPem,
    httpsProxy: connection.httpsProxy,
    method: request.method,
    path: request.path,
    query: request.query,
    body: request.body,
    timeoutMs: request.timeoutMs,
  });
}

/**
 * Main side of the extension IPC. Freelens prefixes the channel with an id derived from the
 * extension and removes the handler when the extension is disabled or uninstalled, so a
 * renderer of this extension is the only caller that can reach it.
 */
class ArgoCdIpcMain extends Main.Ipc {
  constructor(extension: Main.LensExtension) {
    super(extension);
    this.handle(ARGOCD_API_HTTP_CHANNEL, handleArgoCdApiHttpRequest);
  }
}

/** Registers the Argo CD HTTP handler. Safe to call again after an extension reload. */
export function registerArgoCdApiIpc(extension: Main.LensExtension): void {
  ArgoCdIpcMain.resetInstance();
  ArgoCdIpcMain.createInstance(extension);
}

export function unregisterArgoCdApiIpc(): void {
  ArgoCdIpcMain.resetInstance();
}
