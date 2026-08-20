import http from "node:http";
import https from "node:https";
import tls from "node:tls";
import { HttpProxyAgent, HttpsProxyAgent } from "hpagent";

import { createArgoCdApiError } from "./errors";
import type { ArgoCdHttpRequest, ArgoCdHttpResponse } from "./types";
import { buildArgoCdRequestUrl, normalizeHttpsProxyUrl } from "./url";

const DEFAULT_TIMEOUT_MS = 30_000;

let didTrySystemCa = false;

function tryUseSystemCaCertificates(): void {
  if (didTrySystemCa) {
    return;
  }
  didTrySystemCa = true;

  try {
    const tlsApi = tls as typeof tls & {
      getCACertificates?: (type?: string) => string[];
      setDefaultCACertificates?: (certs: string[]) => void;
    };
    if (typeof tlsApi.getCACertificates !== "function" || typeof tlsApi.setDefaultCACertificates !== "function") {
      return;
    }

    const defaults = tlsApi.getCACertificates("default");
    const system = tlsApi.getCACertificates("system");
    tlsApi.setDefaultCACertificates([...defaults, ...system]);
  } catch {
    // Older Node/Electron runtimes may not expose system CA helpers.
  }
}

export function normalizeCustomCaPem(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return undefined;
  }
  if (!trimmed.includes("BEGIN CERTIFICATE")) {
    throw new Error(
      "Custom CA must be PEM text containing -----BEGIN CERTIFICATE----- (export the corporate CA, not the leaf server cert).",
    );
  }
  return trimmed;
}

function buildTlsAgentOptions(request: ArgoCdHttpRequest): {
  rejectUnauthorized: boolean;
  ca?: Array<string | Buffer>;
} {
  const rejectUnauthorized = request.insecureSkipTlsVerify !== true;
  const customCa = normalizeCustomCaPem(request.customCaPem);

  if (!rejectUnauthorized) {
    return { rejectUnauthorized: false };
  }

  if (!customCa) {
    return { rejectUnauthorized: true };
  }

  // Passing `ca` replaces Node defaults unless we include rootCertificates.
  return {
    rejectUnauthorized: true,
    ca: [...tls.rootCertificates, customCa],
  };
}

function buildRequestAgent(request: ArgoCdHttpRequest, isHttps: boolean): http.Agent | https.Agent | undefined {
  const tlsOptions = buildTlsAgentOptions(request);
  const proxy = normalizeHttpsProxyUrl(request.httpsProxy);

  if (proxy) {
    // Same approach as Freelens (`hpagent` HttpsProxyAgent / HttpProxyAgent).
    if (isHttps) {
      return new HttpsProxyAgent({
        proxy,
        ...tlsOptions,
      });
    }
    return new HttpProxyAgent({
      proxy,
      ...tlsOptions,
    });
  }

  if (!isHttps) {
    return undefined;
  }

  return new https.Agent(tlsOptions);
}

function isTlsCertificateError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const err = error as { code?: string; message?: string };
  if (
    err.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
    err.code === "CERT_HAS_EXPIRED" ||
    err.code === "DEPTH_ZERO_SELF_SIGNED_CERT"
  ) {
    return true;
  }
  return typeof err.message === "string" && /certificate|SSL|TLS|UNABLE_TO_VERIFY/i.test(err.message);
}

function wrapRequestError(error: unknown): Error {
  if (isTlsCertificateError(error)) {
    const detail = error instanceof Error ? error.message : String(error);
    return new Error(
      `${detail}. Paste your corporate CA PEM under Preferences → Custom CA certificate (recommended), or enable Skip TLS verification.`,
    );
  }
  return error instanceof Error ? error : new Error(String(error));
}

export async function performArgoCdHttpRequest(request: ArgoCdHttpRequest): Promise<ArgoCdHttpResponse> {
  if (request.insecureSkipTlsVerify !== true) {
    tryUseSystemCaCertificates();
  }

  const url = buildArgoCdRequestUrl(request.serverUrl, request.path, request.query);
  const isHttps = url.protocol === "https:";
  const timeoutMs = request.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const payload = request.body === undefined ? undefined : JSON.stringify(request.body);
  const agent = buildRequestAgent(request, isHttps);

  try {
    return await new Promise<ArgoCdHttpResponse>((resolve, reject) => {
      const options: https.RequestOptions = {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        method: request.method,
        headers: {
          authorization: `Bearer ${request.token}`,
          accept: "application/json",
          ...(payload
            ? {
                "content-type": "application/json",
                "content-length": Buffer.byteLength(payload),
              }
            : {}),
        },
        agent,
      };

      const transport = isHttps ? https : http;
      const req = transport.request(options, (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 0,
            bodyText: Buffer.concat(chunks).toString("utf8"),
          });
        });
      });

      req.on("error", reject);
      req.setTimeout(timeoutMs, () => {
        req.destroy(new Error("Argo CD API request timed out."));
      });

      if (payload) {
        req.write(payload);
      }
      req.end();
    });
  } catch (error) {
    throw wrapRequestError(error);
  }
}

export async function performArgoCdHttpJson(request: ArgoCdHttpRequest): Promise<unknown> {
  const response = await performArgoCdHttpRequest(request);
  if (response.status >= 400) {
    throw createArgoCdApiError(response.status, response.bodyText);
  }

  if (!response.bodyText.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(response.bodyText);
  } catch {
    throw new Error("Argo CD API returned a non-JSON response.");
  }
}
