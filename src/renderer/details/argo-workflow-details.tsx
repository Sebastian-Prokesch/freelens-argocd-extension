import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { Link } from "react-router-dom";
import { withErrorPage } from "../components/error-page";
import {
  type ArgoWorkflow,
  getArgoWorkflowDuration,
  getArgoWorkflowProgress,
  getArgoWorkflowStatusReason,
  getWorkflowPhase,
  getWorkflowPodReferences,
} from "../k8s/workflows";

const {
  Component: { DrawerItem, DrawerTitle, WithTooltip },
  Navigation: { getDetailsUrl },
} = Renderer;

export interface ArgoWorkflowDetailsProps extends Renderer.Component.KubeObjectDetailsProps<ArgoWorkflow> {
  extension: Renderer.LensExtension;
}

export const ArgoWorkflowDetails = observer((props: ArgoWorkflowDetailsProps) =>
  withErrorPage(props, () => {
    const { object } = props;
    const namespace = object.getNs?.() ?? object.metadata?.namespace ?? "default";
    const podReferences = getWorkflowPodReferences(object);

    const getPodDetailsUrl = (podName: string) =>
      getDetailsUrl(`/api/v1/namespaces/${encodeURIComponent(namespace)}/pods/${encodeURIComponent(podName)}`);

    return (
      <>
        <DrawerTitle>Workflow</DrawerTitle>
        <DrawerItem name="Phase">{getWorkflowPhase(object)}</DrawerItem>
        <DrawerItem name="Progress">{getArgoWorkflowProgress(object)}</DrawerItem>
        <DrawerItem name="Started">{object.status?.startedAt ?? "N/A"}</DrawerItem>
        <DrawerItem name="Finished">{object.status?.finishedAt ?? "N/A"}</DrawerItem>
        <DrawerItem name="Duration">{getArgoWorkflowDuration(object)}</DrawerItem>
        <DrawerItem name="Reason">
          <WithTooltip>{getArgoWorkflowStatusReason(object)}</WithTooltip>
        </DrawerItem>
        <DrawerItem name="Suspend">{object.spec?.suspend ? "true" : "false"}</DrawerItem>
        <DrawerItem name="Logs">
          {podReferences.length > 0
            ? podReferences.map((podRef) => (
                <div key={podRef.nodeId}>
                  <Link to={getPodDetailsUrl(podRef.podName)}>
                    <WithTooltip>{podRef.podName}</WithTooltip>
                  </Link>
                  <span>{` - ${podRef.nodeName} (${podRef.phase})`}</span>
                </div>
              ))
            : "No pod logs available yet"}
        </DrawerItem>
      </>
    );
  }),
);
