import { Main } from "@freelensapp/extensions";

import { ARGOCD_API_HTTP_CHANNEL, performArgoCdHttpRequest } from "../common/argocd-api";

import type { ArgoCdHttpRequest, ArgoCdHttpResponse } from "../common/argocd-api";

export async function handleArgoCdApiHttpRequest(
  _event: unknown,
  request: ArgoCdHttpRequest,
): Promise<ArgoCdHttpResponse> {
  return performArgoCdHttpRequest(request);
}

export class ArgoCdIpcMain extends Main.Ipc {
  constructor(extension: Main.LensExtension) {
    super(extension);
    this.handle(ARGOCD_API_HTTP_CHANNEL, handleArgoCdApiHttpRequest);
  }
}

export function registerArgoCdApiIpc(extension: Main.LensExtension): void {
  new ArgoCdIpcMain(extension);
}
