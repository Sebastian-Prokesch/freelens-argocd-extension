import { action, makeObservable, observable } from "mobx";
import type { ArgoApplication } from "../../k8s/argocd/applications";

class ApplicationSyncDialogStore {
  isOpen = false;
  application: ArgoApplication | null = null;

  constructor() {
    makeObservable(this, {
      isOpen: observable,
      application: observable,
      open: action,
      close: action,
    });
  }

  open(application: ArgoApplication) {
    this.isOpen = true;
    this.application = application;
  }

  close() {
    this.isOpen = false;
    this.application = null;
  }
}

export const applicationSyncDialogStore = new ApplicationSyncDialogStore();
