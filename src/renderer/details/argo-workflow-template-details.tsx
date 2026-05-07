import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { withErrorPage } from "../components/error-page";

import type { ArgoWorkflowTemplate } from "../k8s/workflows";

const {
  Component: { DrawerItem, DrawerTitle },
} = Renderer;

export interface ArgoWorkflowTemplateDetailsProps
  extends Renderer.Component.KubeObjectDetailsProps<ArgoWorkflowTemplate> {
  extension: Renderer.LensExtension;
}

export const ArgoWorkflowTemplateDetails = observer((props: ArgoWorkflowTemplateDetailsProps) =>
  withErrorPage(props, () => {
    const { object } = props;

    return (
      <>
        <DrawerTitle>WorkflowTemplate</DrawerTitle>
        <DrawerItem name="Entrypoint">{object.spec?.entrypoint ?? "N/A"}</DrawerItem>
        <DrawerItem name="Service Account">{object.spec?.serviceAccountName ?? "N/A"}</DrawerItem>
        <DrawerItem name="Pod GC">{object.spec?.podGC?.strategy ?? "N/A"}</DrawerItem>
      </>
    );
  }),
);
