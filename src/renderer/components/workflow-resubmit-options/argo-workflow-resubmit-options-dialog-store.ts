import { action, makeObservable, observable } from "mobx";
import type { ArgoWorkflow } from "../../k8s/workflows";

export interface ArgoWorkflowResubmitOptionsDialogTarget {
  workflow: ArgoWorkflow;
}

class ArgoWorkflowResubmitOptionsDialogStore {
  isOpen = false;
  target: ArgoWorkflowResubmitOptionsDialogTarget | null = null;

  constructor() {
    makeObservable(this, {
      isOpen: observable,
      target: observable,
      open: action,
      close: action,
    });
  }

  open(workflow: ArgoWorkflow) {
    this.isOpen = true;
    this.target = { workflow };
  }

  close() {
    this.isOpen = false;
    this.target = null;
  }
}

export const argoWorkflowResubmitOptionsDialogStore = new ArgoWorkflowResubmitOptionsDialogStore();
