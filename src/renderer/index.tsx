/**
 * Copyright (c) Sebastian Prokesch. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";
import { computed } from "mobx";
import { ArgoPreferencesStore } from "../common/store";
import { ArgoConfigDialog } from "./components/argo-config";
import { ArgoApplicationDetails } from "./details/argo-application-details";
import { ArgoAppProjectDetails } from "./details/argo-appproject-details";
import { ArgoConfigDetails } from "./details/argo-config-details";
import { ArgoPlainLogoIcon } from "./icons";
import { ArgoApplication, ArgoAppProject } from "./k8s/argocd";
import {
  ArgoConfigMenuItem,
  ArgoRollbackMenuItem,
  type ArgoRollbackMenuItemProps,
  ArgoSyncMenuItem,
  type ArgoSyncMenuItemProps,
  ArgoTerminateMenuItem,
  type ArgoTerminateMenuItemProps,
} from "./menus";
import { ArgoApplicationsPage, ArgoAppProjectsPage, ArgoConfigPage, ArgoOverviewPage, ArgoRootPage } from "./pages";
import { ArgoPreferenceHint, ArgoPreferenceInput } from "./preferences";

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

  clusterPages = [
    {
      id: "argocd-root",
      routePath: "/argocd",
      components: {
        Page: () => <ArgoRootPage />,
      },
    },
    {
      id: "argocd-overview",
      routePath: "/argocd/overview",
      components: {
        Page: () => <ArgoOverviewPage />,
      },
    },
    {
      id: ArgoApplication.crd.plural,
      routePath: "/argocd/applications",
      components: {
        Page: () => <ArgoApplicationsPage extension={this} />,
      },
    },
    {
      id: ArgoAppProject.crd.plural,
      routePath: "/argocd/appprojects",
      components: {
        Page: () => <ArgoAppProjectsPage extension={this} />,
      },
    },
    {
      id: "argocd-config",
      routePath: "/argocd/config",
      components: {
        Page: () => <ArgoConfigPage extension={this} />,
      },
    },
  ];

  clusterPageMenus = [
    {
      id: "argocd",
      title: "ArgoCD",
      target: { pageId: "argocd-root" },
      components: {
        Icon: ArgoPlainLogoIcon,
      },
    },
    {
      id: "argocd-overview-menu",
      parentId: "argocd",
      title: "Overview",
      target: { pageId: "argocd-overview" },
      components: {},
    },
    {
      id: ArgoApplication.crd.plural,
      parentId: "argocd",
      title: ArgoApplication.crd.title,
      target: { pageId: ArgoApplication.crd.plural },
      components: {},
    },
    {
      id: ArgoAppProject.crd.plural,
      parentId: "argocd",
      title: ArgoAppProject.crd.title,
      target: { pageId: ArgoAppProject.crd.plural },
      components: {},
    },
    {
      id: "argocd-config-menu",
      parentId: "argocd",
      title: "Config",
      target: { pageId: "argocd-config" },
      components: {},
    },
  ];

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
