/**
 * Copyright (c) Sebastian Prokesch. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";
import { computed } from "mobx";
import { ArgoPreferencesStore } from "../common/store";
import { ArgoConfigDialog } from "./components/argo-config";
import { ArgoApplicationDetails } from "./details/argo-application-details";
import { ArgoApplicationSetDetails } from "./details/argo-applicationset-details";
import { ArgoAppProjectDetails } from "./details/argo-appproject-details";
import { ArgoConfigDetails } from "./details/argo-config-details";
import { ArgoApplication, ArgoApplicationSet, ArgoAppProject } from "./k8s/argocd";
import {
  ArgoConfigMenuItem,
  ArgoRollbackMenuItem,
  type ArgoRollbackMenuItemProps,
  ArgoSyncMenuItem,
  type ArgoSyncMenuItemProps,
  ArgoTerminateMenuItem,
  type ArgoTerminateMenuItemProps,
} from "./menus";
import { ArgoPreferenceHint, ArgoPreferenceInput } from "./preferences";
import { buildClusterPageMenus, buildClusterPages } from "./registration/cluster-registration";

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
    {
      kind: ArgoApplication.kind,
      apiVersions: ArgoApplication.crd.apiVersions,
      priority: 10,
      components: {
        Details: (props: Renderer.Component.KubeObjectDetailsProps<any>) => (
          <ArgoApplicationDetails {...props} extension={this} />
        ),
      },
    },
    {
      kind: ArgoApplicationSet.kind,
      apiVersions: ArgoApplicationSet.crd.apiVersions,
      priority: 10,
      components: {
        Details: (props: Renderer.Component.KubeObjectDetailsProps<any>) => (
          <ArgoApplicationSetDetails {...props} extension={this} />
        ),
      },
    },
    {
      kind: ArgoAppProject.kind,
      apiVersions: ArgoAppProject.crd.apiVersions,
      priority: 10,
      components: {
        Details: (props: Renderer.Component.KubeObjectDetailsProps<any>) => (
          <ArgoAppProjectDetails {...props} extension={this} />
        ),
      },
    },
    {
      kind: "Secret",
      apiVersions: ["v1"],
      priority: 50,
      components: {
        Details: (props: Renderer.Component.KubeObjectDetailsProps<any>) => (
          <ArgoConfigDetails {...props} extension={this} />
        ),
      },
    },
    {
      kind: "ConfigMap",
      apiVersions: ["v1"],
      priority: 50,
      components: {
        Details: (props: Renderer.Component.KubeObjectDetailsProps<any>) => (
          <ArgoConfigDetails {...props} extension={this} />
        ),
      },
    },
  ];

  clusterPages = buildClusterPages(this);

  clusterPageMenus = buildClusterPageMenus();

  kubeObjectMenuItems = [
    {
      kind: ArgoApplication.kind,
      apiVersions: ArgoApplication.crd.apiVersions,
      components: {
        MenuItem: (props: ArgoSyncMenuItemProps) => <ArgoSyncMenuItem {...props} extension={this} />,
      },
    },
    {
      kind: ArgoApplication.kind,
      apiVersions: ArgoApplication.crd.apiVersions,
      components: {
        MenuItem: (props: ArgoTerminateMenuItemProps) => <ArgoTerminateMenuItem {...props} extension={this} />,
      },
    },
    {
      kind: ArgoApplication.kind,
      apiVersions: ArgoApplication.crd.apiVersions,
      components: {
        MenuItem: (props: ArgoRollbackMenuItemProps) => <ArgoRollbackMenuItem {...props} extension={this} />,
      },
    },
    {
      kind: "Secret",
      apiVersions: ["v1"],
      components: {
        MenuItem: (props: Renderer.Component.KubeObjectMenuProps<any>) => (
          <ArgoConfigMenuItem {...props} extension={this} />
        ),
      },
    },
    {
      kind: "ConfigMap",
      apiVersions: ["v1"],
      components: {
        MenuItem: (props: Renderer.Component.KubeObjectMenuProps<any>) => (
          <ArgoConfigMenuItem {...props} extension={this} />
        ),
      },
    },
  ];
}
