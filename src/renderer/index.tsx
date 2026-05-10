/**
 * Copyright (c) Sebastian Prokesch. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";
import { computed } from "mobx";
import { ArgoPreferencesStore } from "../common/store";
import { ArgoConfigDialog } from "./components/argo-config";
import { ArgoAnalysisRunDetails } from "./details/argo-analysis-run-details";
import { ArgoAnalysisTemplateDetails } from "./details/argo-analysis-template-details";
import { ArgoApplicationDetails } from "./details/argo-application-details";
import { ArgoApplicationSetDetails } from "./details/argo-applicationset-details";
import { ArgoAppProjectDetails } from "./details/argo-appproject-details";
import { ArgoClusterAnalysisTemplateDetails } from "./details/argo-cluster-analysis-template-details";
import { ArgoClusterWorkflowTemplateDetails } from "./details/argo-cluster-workflow-template-details";
import { ArgoConfigDetails } from "./details/argo-config-details";
import { ArgoCronWorkflowDetails } from "./details/argo-cron-workflow-details";
import { ArgoExperimentDetails } from "./details/argo-experiment-details";
import { ArgoRolloutDetails } from "./details/argo-rollout-details";
import { ArgoWorkflowDetails } from "./details/argo-workflow-details";
import { ArgoWorkflowTemplateDetails } from "./details/argo-workflow-template-details";
import { ArgoApplication, ArgoApplicationSet, ArgoAppProject } from "./k8s/argocd";
import {
  ArgoAnalysisRun,
  ArgoAnalysisTemplate,
  ArgoClusterAnalysisTemplate,
  ArgoExperiment,
  ArgoRollout,
} from "./k8s/rollouts";
import { ArgoClusterWorkflowTemplate, ArgoCronWorkflow, ArgoWorkflow, ArgoWorkflowTemplate } from "./k8s/workflows";
import {
  ArgoConfigMenuItem,
  ArgoRolloutAbortMenuItem,
  ArgoRolloutPromoteFullMenuItem,
  ArgoRolloutPromoteMenuItem,
  ArgoRolloutPromoteSkipAllMenuItem,
  ArgoRolloutPromoteSkipCurrentMenuItem,
  ArgoRolloutRetryMenuItem,
  ArgoSyncMenuItem,
  ArgoTerminateMenuItem,
} from "./menus";
import { ArgoPreferenceHint, ArgoPreferenceInput } from "./preferences";
import { buildClusterPageMenus, buildClusterPages } from "./registration/cluster-registration";
import {
  createKubeObjectDetailRegistration,
  createKubeObjectMenuRegistration,
} from "./registration/kube-object-registration";

export default class ArgoRenderer extends Renderer.LensExtension {
  clusterFrameComponents = [
    {
      id: "argocd-config-dialog",
      Component: ArgoConfigDialog,
      shouldRender: computed(() => true),
    },
  ];
  async onActivate() {
    ArgoPreferencesStore.getInstanceOrCreate().loadExtension(this);
  }

  appPreferences = [
    {
      title: "Argo Preferences",
      components: {
        Input: () => <ArgoPreferenceInput />,
        Hint: () => <ArgoPreferenceHint />,
      },
    },
  ];

  kubeObjectDetailItems = [
    createKubeObjectDetailRegistration({
      kind: ArgoApplication.kind,
      apiVersions: ArgoApplication.crd.apiVersions,
      extension: this,
      Details: ArgoApplicationDetails,
    }),
    createKubeObjectDetailRegistration({
      kind: ArgoApplicationSet.kind,
      apiVersions: ArgoApplicationSet.crd.apiVersions,
      extension: this,
      Details: ArgoApplicationSetDetails,
    }),
    createKubeObjectDetailRegistration({
      kind: ArgoAppProject.kind,
      apiVersions: ArgoAppProject.crd.apiVersions,
      extension: this,
      Details: ArgoAppProjectDetails,
    }),
    createKubeObjectDetailRegistration({
      kind: ArgoRollout.kind,
      apiVersions: ArgoRollout.crd.apiVersions,
      extension: this,
      Details: ArgoRolloutDetails,
    }),
    createKubeObjectDetailRegistration({
      kind: ArgoAnalysisTemplate.kind,
      apiVersions: ArgoAnalysisTemplate.crd.apiVersions,
      extension: this,
      Details: ArgoAnalysisTemplateDetails,
    }),
    createKubeObjectDetailRegistration({
      kind: ArgoClusterAnalysisTemplate.kind,
      apiVersions: ArgoClusterAnalysisTemplate.crd.apiVersions,
      extension: this,
      Details: ArgoClusterAnalysisTemplateDetails,
    }),
    createKubeObjectDetailRegistration({
      kind: ArgoAnalysisRun.kind,
      apiVersions: ArgoAnalysisRun.crd.apiVersions,
      extension: this,
      Details: ArgoAnalysisRunDetails,
    }),
    createKubeObjectDetailRegistration({
      kind: ArgoExperiment.kind,
      apiVersions: ArgoExperiment.crd.apiVersions,
      extension: this,
      Details: ArgoExperimentDetails,
    }),
    createKubeObjectDetailRegistration({
      kind: ArgoWorkflow.kind,
      apiVersions: ArgoWorkflow.crd.apiVersions,
      extension: this,
      Details: ArgoWorkflowDetails,
    }),
    createKubeObjectDetailRegistration({
      kind: ArgoCronWorkflow.kind,
      apiVersions: ArgoCronWorkflow.crd.apiVersions,
      extension: this,
      Details: ArgoCronWorkflowDetails,
    }),
    createKubeObjectDetailRegistration({
      kind: ArgoWorkflowTemplate.kind,
      apiVersions: ArgoWorkflowTemplate.crd.apiVersions,
      extension: this,
      Details: ArgoWorkflowTemplateDetails,
    }),
    createKubeObjectDetailRegistration({
      kind: ArgoClusterWorkflowTemplate.kind,
      apiVersions: ArgoClusterWorkflowTemplate.crd.apiVersions,
      extension: this,
      Details: ArgoClusterWorkflowTemplateDetails,
    }),
    createKubeObjectDetailRegistration({
      kind: "Secret",
      apiVersions: ["v1"],
      priority: 50,
      extension: this,
      Details: ArgoConfigDetails,
    }),
    createKubeObjectDetailRegistration({
      kind: "ConfigMap",
      apiVersions: ["v1"],
      priority: 50,
      extension: this,
      Details: ArgoConfigDetails,
    }),
  ];

  clusterPages = buildClusterPages(this);

  clusterPageMenus = buildClusterPageMenus();

  kubeObjectMenuItems = [
    createKubeObjectMenuRegistration({
      kind: ArgoApplication.kind,
      apiVersions: ArgoApplication.crd.apiVersions,
      extension: this,
      MenuItem: ArgoSyncMenuItem,
    }),
    createKubeObjectMenuRegistration({
      kind: ArgoApplication.kind,
      apiVersions: ArgoApplication.crd.apiVersions,
      extension: this,
      MenuItem: ArgoTerminateMenuItem,
    }),
    createKubeObjectMenuRegistration({
      kind: ArgoRollout.kind,
      apiVersions: ArgoRollout.crd.apiVersions,
      extension: this,
      MenuItem: ArgoRolloutPromoteMenuItem,
    }),
    createKubeObjectMenuRegistration({
      kind: ArgoRollout.kind,
      apiVersions: ArgoRollout.crd.apiVersions,
      extension: this,
      MenuItem: ArgoRolloutPromoteFullMenuItem,
    }),
    createKubeObjectMenuRegistration({
      kind: ArgoRollout.kind,
      apiVersions: ArgoRollout.crd.apiVersions,
      extension: this,
      MenuItem: ArgoRolloutPromoteSkipCurrentMenuItem,
    }),
    createKubeObjectMenuRegistration({
      kind: ArgoRollout.kind,
      apiVersions: ArgoRollout.crd.apiVersions,
      extension: this,
      MenuItem: ArgoRolloutPromoteSkipAllMenuItem,
    }),
    createKubeObjectMenuRegistration({
      kind: ArgoRollout.kind,
      apiVersions: ArgoRollout.crd.apiVersions,
      extension: this,
      MenuItem: ArgoRolloutAbortMenuItem,
    }),
    createKubeObjectMenuRegistration({
      kind: ArgoRollout.kind,
      apiVersions: ArgoRollout.crd.apiVersions,
      extension: this,
      MenuItem: ArgoRolloutRetryMenuItem,
    }),
    createKubeObjectMenuRegistration({
      kind: "Secret",
      apiVersions: ["v1"],
      extension: this,
      MenuItem: ArgoConfigMenuItem,
    }),
    createKubeObjectMenuRegistration({
      kind: "ConfigMap",
      apiVersions: ["v1"],
      extension: this,
      MenuItem: ArgoConfigMenuItem,
    }),
  ];
}
