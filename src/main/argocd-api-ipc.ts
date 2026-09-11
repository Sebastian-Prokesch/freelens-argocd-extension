import { createHash } from "node:crypto";
import { ipcMain } from "electron";
import { ARGOCD_API_HTTP_CHANNEL, performArgoCdHttpRequest } from "../common/argocd-api";
import { ArgoPreferencesStore } from "../common/store";

import type { Main } from "@freelensapp/extensions";

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

/** Same channel prefixing Freelens `Main.Ipc` / `Renderer.Ipc` use. */
function toExtensionIpcChannel(extensionId: string, channel: string): string {
  const prefix = createHash("sha256").update(extensionId).digest("hex");
  return `extensions@${prefix}:${channel}`;
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

let registeredChannel: string | undefined;

/**
 * Register the Argo CD HTTP IPC handler on Electron's ipcMain.
 *
 * Freelens `Main.Ipc` is a Singleton (`createInstance`); relying on it alone has proven
 * brittle across extension reloads. We mirror Freelens channel naming so renderer
 * `Renderer.Ipc.invoke("argocd-api-http", …)` keeps working.
 */
export function registerArgoCdApiIpc(extension: Main.LensExtension): void {
  const channel = toExtensionIpcChannel(extension.id, ARGOCD_API_HTTP_CHANNEL);

  if (registeredChannel && registeredChannel !== channel) {
    ipcMain.removeHandler(registeredChannel);
  }

  // Idempotent: safe if no handler exists yet; required after extension reload.
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, handleArgoCdApiHttpRequest);
  registeredChannel = channel;
}

export function unregisterArgoCdApiIpc(): void {
  if (!registeredChannel) {
    return;
  }
  ipcMain.removeHandler(registeredChannel);
  registeredChannel = undefined;
}
