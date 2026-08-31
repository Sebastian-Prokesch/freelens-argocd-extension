import { Main } from "@freelensapp/extensions";
import { ArgoPreferencesStore } from "../common/store";
import { ensureArgoResourceTemplates } from "./argo-resource-templates";
import { registerArgoCdApiIpc, unregisterArgoCdApiIpc } from "./argocd-api-ipc";

export default class ArgoExtensionMain extends Main.LensExtension {
  async onActivate() {
    // Register IPC before anything else so API calls work even if later setup fails.
    registerArgoCdApiIpc(this);
    await ArgoPreferencesStore.getInstanceOrCreate().loadExtension(this);
    await ensureArgoResourceTemplates();
  }

  onDeactivate() {
    unregisterArgoCdApiIpc();
  }
}
