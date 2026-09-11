import { action, makeObservable, observable } from "mobx";

import type { ArgoApplication } from "../../k8s/argocd/applications";

class ArgoApiApplicationDrawerStore {
  isOpen = false;
  application: ArgoApplication | null = null;

  constructor() {
    makeObservable(this, {
      isOpen: observable,
      application: observable,
      open: action,
      replace: action,
      close: action,
    });
  }

  open(application: ArgoApplication) {
    this.isOpen = true;
    this.application = application;
  }

  replace(application: ArgoApplication) {
    if (!this.isOpen) {
      return;
    }
    this.application = application;
  }

  close() {
    this.isOpen = false;
    this.application = null;
  }
}

export const argoApiApplicationDrawerStore = new ArgoApiApplicationDrawerStore();
