import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { withErrorPage } from "../components/error-page";

import type { ArgoClusterWorkflowTemplate } from "../k8s/workflows";

const {
  Component: { DrawerItem, DrawerTitle },
} = Renderer;

function getArgumentsOverview(object: ArgoClusterWorkflowTemplate): string {
  const parameters = object.spec?.arguments?.parameters ?? [];
  const artifacts = object.spec?.arguments?.artifacts ?? [];

  const parts: string[] = [];
  if (parameters.length > 0) {
    parts.push(`Parameters: ${parameters.length}`);
  }
  if (artifacts.length > 0) {
    parts.push(`Artifacts: ${artifacts.length}`);
  }

  return parts.length > 0 ? parts.join(" | ") : "N/A";
}

export interface ArgoClusterWorkflowTemplateDetailsProps
  extends Renderer.Component.KubeObjectDetailsProps<ArgoClusterWorkflowTemplate> {
  extension: Renderer.LensExtension;
}

export const ArgoClusterWorkflowTemplateDetails = observer((props: ArgoClusterWorkflowTemplateDetailsProps) =>
  withErrorPage(props, () => {
    const { object } = props;

    return (
      <>
        <DrawerTitle>ClusterWorkflowTemplate</DrawerTitle>
        <DrawerItem name="Entrypoint">{object.spec?.entrypoint ?? "N/A"}</DrawerItem>
        <DrawerItem name="Templates">{String(object.spec?.templates?.length ?? 0)}</DrawerItem>
        <DrawerItem name="Arguments">{getArgumentsOverview(object)}</DrawerItem>
        <DrawerItem name="Service Account">{object.spec?.serviceAccountName ?? "N/A"}</DrawerItem>
        <DrawerItem name="Pod GC">{object.spec?.podGC?.strategy ?? "N/A"}</DrawerItem>
      </>
    );
  }),
);
