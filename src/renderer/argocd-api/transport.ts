import {
  ARGOCD_API_HTTP_CHANNEL,
  createArgoCdApiError,
  performArgoCdHttpRequest,
  type ArgoCdHttpRequest,
  type ArgoCdHttpResponse,
} from "../../common/argocd-api";

type ArgoCdApiInvoker = (channel: string, request: ArgoCdHttpRequest) => Promise<ArgoCdHttpResponse>;

let ipcInvoker: ArgoCdApiInvoker | undefined;

export function setArgoCdApiIpcInvoker(invoker: ArgoCdApiInvoker | undefined): void {
  ipcInvoker = invoker;
}

export async function sendArgoCdHttpRequest(request: ArgoCdHttpRequest): Promise<ArgoCdHttpResponse> {
  if (ipcInvoker) {
    return ipcInvoker(ARGOCD_API_HTTP_CHANNEL, request);
  }

  return performArgoCdHttpRequest(request);
}

export async function sendArgoCdHttpJson(request: ArgoCdHttpRequest): Promise<unknown> {
  const response = await sendArgoCdHttpRequest(request);
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
