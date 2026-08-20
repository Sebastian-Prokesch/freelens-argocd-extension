import { Main } from "@freelensapp/extensions";
import { ArgoPreferencesStore } from "../common/store";
import { registerArgoCdApiIpc } from "./argocd-api-ipc";
import { ensureArgoResourceTemplates } from "./argo-resource-templates";

export default class ArgoExtensionMain extends Main.LensExtension {
  async onActivate() {
    await ArgoPreferencesStore.getInstanceOrCreate().loadExtension(this);
    registerArgoCdApiIpc(this);
    await ensureArgoResourceTemplates();
  }
}
