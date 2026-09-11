export const ARGOCD_API_HTTP_CHANNEL = "argocd-api-http";

export type ArgoCdHttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface ArgoCdHttpRequest {
  serverUrl: string;
  token: string;
  insecureSkipTlsVerify?: boolean;
  /** Optional PEM (one or more CA certs) trusted in addition to Node defaults. */
  customCaPem?: string;
  /**
   * Optional HTTP(S) proxy URL for this request (CONNECT for HTTPS targets).
   * Example: http://proxy.example.com:8080 or http://user:pass@proxy:3128
   */
  httpsProxy?: string;
  method: ArgoCdHttpMethod;
  path: string;
  query?: Record<string, string | undefined>;
  body?: unknown;
  timeoutMs?: number;
}

export interface ArgoCdHttpResponse {
  status: number;
  bodyText: string;
}

export type ArgoCdConnectionMode = "cluster" | "api";

/**
 * Renderer -> main IPC request.
 *
 * Security: main must not trust renderer-supplied credentials. The renderer must
 * only reference a saved connection by `connectionId`; secrets (token/TLS/proxy)
 * are resolved in the main process.
 */
export interface ArgoCdIpcRequest {
  connectionId: string;
  method: ArgoCdHttpMethod;
  path: string;
  query?: Record<string, string | undefined>;
  body?: unknown;
  timeoutMs?: number;
}

export interface ArgoCdApiConnection {
  connectionId: string;
}

export type ArgoCdDataSource = "cluster" | "api" | "api-misconfigured";
