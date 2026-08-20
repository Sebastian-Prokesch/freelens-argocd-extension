import { action, makeObservable, observable } from "mobx";

import type { ArgoAppProject } from "../../k8s/argocd/appproject";

class ArgoApiAppProjectDrawerStore {
  isOpen = false;
  project: ArgoAppProject | null = null;

  constructor() {
    makeObservable(this, {
      isOpen: observable,
      project: observable,
      open: action,
      close: action,
    });
  }

  open(project: ArgoAppProject) {
    this.isOpen = true;
    this.project = project;
  }

  close() {
    this.isOpen = false;
    this.project = null;
  }
}

export const argoApiAppProjectDrawerStore = new ArgoApiAppProjectDrawerStore();
