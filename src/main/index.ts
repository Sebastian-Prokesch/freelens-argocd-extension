import { Main } from "@freelensapp/extensions";
import { ArgoPreferencesStore } from "../common/store";
import { ensureArgoResourceTemplates } from "./argo-resource-templates";

export default class ArgoExtensionMain extends Main.LensExtension {
  async onActivate() {
    await ArgoPreferencesStore.getInstanceOrCreate().loadExtension(this);
    await ensureArgoResourceTemplates();
  }
}
