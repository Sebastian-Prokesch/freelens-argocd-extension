/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";
import { ArgoPreferencesStore } from "../common/store";
// import { ExampleDetails } from "./details/example-details";
import { ExampleIcon } from "./icons";
import { ArgoApplication } from "./k8s/argocd";
import { ArgoSyncMenuItem, type ArgoSyncMenuItemProps } from "./menus";
import { ArgoPreferenceHint, ArgoPreferenceInput } from "./preferences";
import { ArgoApplicationsPage } from "./pages";
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
      id: ArgoApplication.crd.plural,
      components: {
        Page: () => <ArgoApplicationsPage extension={this} />,
      },
    },
  ];

  clusterPageMenus = [
    {
      id: ArgoApplication.crd.plural,
      title: ArgoApplication.crd.title,
      target: { pageId: ArgoApplication.crd.plural },
      components: {
        Icon: ExampleIcon,
      },
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
