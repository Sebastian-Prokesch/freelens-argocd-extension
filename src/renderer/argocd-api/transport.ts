import {
  ARGOCD_API_HTTP_CHANNEL,
  createArgoCdApiError,
  type ArgoCdHttpResponse,
  type ArgoCdIpcRequest,
} from "../../common/argocd-api";

type ArgoCdApiInvoker = (channel: string, request: ArgoCdIpcRequest) => Promise<ArgoCdHttpResponse>;

let ipcInvoker: ArgoCdApiInvoker | undefined;

export function setArgoCdApiIpcInvoker(invoker: ArgoCdApiInvoker | undefined): void {
  ipcInvoker = invoker;
}

export async function sendArgoCdHttpRequest(request: ArgoCdIpcRequest): Promise<ArgoCdHttpResponse> {
  if (!ipcInvoker) {
    throw new Error("Argo CD API IPC unavailable.");
  }

  return ipcInvoker(ARGOCD_API_HTTP_CHANNEL, request);
}

export async function sendArgoCdHttpJson(request: ArgoCdIpcRequest): Promise<unknown> {
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
