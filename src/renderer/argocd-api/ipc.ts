import { Renderer } from "@freelensapp/extensions";

import { setArgoCdApiIpcInvoker } from "./transport";

class ArgoCdIpcRenderer extends Renderer.Ipc {
  constructor(extension: Renderer.LensExtension) {
    super(extension);
  }
}

export function registerArgoCdApiIpc(extension: Renderer.LensExtension): void {
  try {
    const ipc = new ArgoCdIpcRenderer(extension);
    setArgoCdApiIpcInvoker((channel, request) => ipc.invoke(channel, request));
  } catch {
    // Fall back to Node HTTPS in the renderer if IPC registration is unavailable.
    setArgoCdApiIpcInvoker(undefined);
  }
}
