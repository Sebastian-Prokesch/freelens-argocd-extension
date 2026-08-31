import { Renderer } from "@freelensapp/extensions";
import { setArgoCdApiIpcInvoker } from "./transport";

class ArgoCdIpcRenderer extends Renderer.Ipc {
  constructor(extension: Renderer.LensExtension) {
    super(extension);
  }
}

type IpcSingleton = {
  createInstance: (extension: Renderer.LensExtension) => ArgoCdIpcRenderer;
};

export function registerArgoCdApiIpc(extension: Renderer.LensExtension): void {
  try {
    // Freelens Ipc is a Singleton — must use createInstance(), not `new`.
    const ipc = (ArgoCdIpcRenderer as unknown as IpcSingleton).createInstance(extension);
    setArgoCdApiIpcInvoker((channel, request) => ipc.invoke(channel, request));
  } catch (error) {
    // Don't fall back to direct renderer HTTPS. Without IPC the main process can't
    // resolve secrets safely, so API calls must fail with a visible error.
    setArgoCdApiIpcInvoker(undefined);
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`[argo] failed to register Argo CD API IPC: ${detail}`);
  }
}
