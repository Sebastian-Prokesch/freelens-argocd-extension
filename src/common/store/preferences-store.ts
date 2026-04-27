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
    makeObservable(this);
  }

  fromStore({ enabled }: ArgoPreferencesModel): void {
    this.enabled = enabled;
  }

  toJSON(): ArgoPreferencesModel {
    const enabled = this.enabled;
    return {
      enabled,
    };
  }
}
