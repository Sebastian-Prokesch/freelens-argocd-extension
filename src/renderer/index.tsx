/**
 * Copyright (c) Sebastian Prokesch. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";
import { ArgoPreferencesStore } from "../common/store";
import { ArgoPlainLogoIcon } from "./icons";
import { ArgoApplication } from "./k8s/argocd";
import { ArgoSyncMenuItem, type ArgoSyncMenuItemProps } from "./menus";
import { ArgoPreferenceHint, ArgoPreferenceInput } from "./preferences";
import { ArgoApplicationsPage, ArgoOverviewPage, ArgoRootPage } from "./pages";
import { ArgoApplicationDetails } from "./details/argo-application-details";

export default class ArgoRenderer extends Renderer.LensExtension {
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
  ];

  clusterPages = [
    {
      id: "argocd-root",
      routePath: "/argocd",
      components: {
        Page: () => <ArgoRootPage />,
      }
    },
    {
      id: "argocd-overview",
      routePath: "/argocd/overview",
      components: {
        Page: () => <ArgoOverviewPage />,
      }
    },
    {
      id: ArgoApplication.crd.plural,
      routePath: "/argocd/applications",
      components: {
        Page: () => <ArgoApplicationsPage extension={this} />,
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
  ];

  kubeObjectMenuItems = [
    {
      kind: ArgoApplication.kind,
      apiVersions: ArgoApplication.crd.apiVersions,
      components: {
        MenuItem: (props: ArgoSyncMenuItemProps) => (
          <ArgoSyncMenuItem {...props} extension={this} />
        ),
      },
    },
  ];
}
