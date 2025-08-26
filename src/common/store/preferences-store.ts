import { Common } from "@freelensapp/extensions";
import { makeObservable, observable } from "mobx";

export interface ArgoPreferencesModel {
  enabled: boolean;
}

export class ArgoPreferencesStore extends Common.Store.ExtensionStore<ArgoPreferencesModel> {
  @observable accessor enabled = false;

  constructor() {
    super({
      configName: "argo-preferences-store",
      defaults: {
        enabled: false,
      },
    });
    console.log("[ARGO-PREFERENCES-STORE] constructor");
    makeObservable(this);
  }

  fromStore({ enabled }: ArgoPreferencesModel): void {
    console.log(`[ARGO-PREFERENCES-STORE] set ${enabled}`);

    this.enabled = enabled;
  }

  toJSON(): ArgoPreferencesModel {
    const enabled = this.enabled;
    console.log(`[ARGO-PREFERENCES-STORE] get ${enabled}`);
    return {
      enabled,
    };
  }
}
