import { Main } from "@freelensapp/extensions";
import { ArgoPreferencesStore } from "../common/store";

export default class ArgoExtensionMain extends Main.LensExtension {
  async onActivate() {
    await ArgoPreferencesStore.getInstanceOrCreate().loadExtension(this);
  }
}
