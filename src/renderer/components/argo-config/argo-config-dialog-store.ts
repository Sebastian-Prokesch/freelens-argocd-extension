import { action, makeObservable, observable } from "mobx";
import { type ArgoSecretType, getArgoSecretType, isArgoConfigMap, type LabeledObject } from "../../k8s/argocd";

export type ArgoConfigKind = ArgoSecretType | "configmap";
export type ArgoConfigDialogMode = "create" | "edit";

export interface ArgoConfigDialogTarget {
  kind: ArgoConfigKind;
  object?: LabeledObject;
}

class ArgoConfigDialogStore {
  isOpen = false;
  mode: ArgoConfigDialogMode = "create";
  target: ArgoConfigDialogTarget | null = null;

  constructor() {
    makeObservable(this, {
      isOpen: observable,
      mode: observable,
      target: observable,
      openCreate: action,
      openEdit: action,
      close: action,
    });
  }

  openCreate(kind: ArgoConfigKind) {
    this.isOpen = true;
    this.mode = "create";
    this.target = { kind };
  }

  openEdit(object: LabeledObject) {
    const secretType = getArgoSecretType(object);
    const isConfigMap = isArgoConfigMap(object);

    if (!secretType && !isConfigMap) {
      return;
    }

    this.isOpen = true;
    this.mode = "edit";
    this.target = { kind: secretType ?? "configmap", object };
  }

  close() {
    this.isOpen = false;
    this.mode = "create";
    this.target = null;
  }
}

export const argoConfigDialogStore = new ArgoConfigDialogStore();
