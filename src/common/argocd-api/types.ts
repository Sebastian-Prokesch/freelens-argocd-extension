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

export interface ArgoCdApiConnection {
  apiServerUrl: string;
  apiToken: string;
  insecureSkipTlsVerify: boolean;
  customCaPem: string;
  httpsProxy: string;
}

export type ArgoCdDataSource = "cluster" | "api" | "api-misconfigured";
