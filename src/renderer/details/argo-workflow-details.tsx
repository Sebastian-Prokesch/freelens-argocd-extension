import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { argoWorkflowResubmitOptionsDialogStore } from "../components/workflow-resubmit-options";
import { withErrorPage } from "../components/error-page";
import {
  type ArgoWorkflow,
  canResubmitWorkflow,
  canResumeWorkflow,
  canRetryWorkflow,
  canSuspendWorkflow,
  canTerminateWorkflow,
  getArgoWorkflowDuration,
  getArgoWorkflowProgress,
  getArgoWorkflowStatusReason,
  getErrorMessage,
  getArgoWorkflowStore,
  getResumeWorkflowPatch,
  getSuspendWorkflowPatch,
  getTerminateWorkflowPatch,
  getWorkflowPhase,
  requestWorkflowAction,
} from "../k8s/workflows";

const {
  Component: { Button, DrawerItem, DrawerTitle, Notifications, WithTooltip },
} = Renderer;

export interface ArgoWorkflowDetailsProps extends Renderer.Component.KubeObjectDetailsProps<ArgoWorkflow> {
  extension: Renderer.LensExtension;
}

export const ArgoWorkflowDetails = observer((props: ArgoWorkflowDetailsProps) =>
  withErrorPage(props, () => {
    const { object } = props;
    const workflowStore = getArgoWorkflowStore();
    const workflowName = object.getName?.() ?? object.metadata?.name ?? "workflow";

    const suspendWorkflow = async () => {
      try {
        await workflowStore.patch(object, getSuspendWorkflowPatch(), "merge");
        Notifications.ok(`Suspend requested for ${workflowName}`);
      } catch (error) {
        Notifications.error(getErrorMessage(error, "Failed to suspend workflow."));
      }
    };

    const resumeWorkflow = async () => {
      try {
        await workflowStore.patch(object, getResumeWorkflowPatch(), "merge");
        Notifications.ok(`Resume requested for ${workflowName}`);
      } catch (error) {
        Notifications.error(getErrorMessage(error, "Failed to resume workflow."));
      }
    };

    const terminateWorkflow = async () => {
      try {
        await workflowStore.patch(object, getTerminateWorkflowPatch(), "merge");
        Notifications.ok(`Terminate requested for ${workflowName}`);
      } catch (error) {
        Notifications.error(getErrorMessage(error, "Failed to terminate workflow."));
      }
    };

    const retryWorkflow = async () => {
      try {
        await requestWorkflowAction(workflowStore, object, "retry");
        Notifications.ok(`Retry requested for ${workflowName}`);
      } catch (error) {
        Notifications.error(getErrorMessage(error, "Failed to retry workflow."));
      }
    };

    const resubmitWorkflow = async () => {
      try {
        await requestWorkflowAction(workflowStore, object, "resubmit");
        Notifications.ok(`Resubmit requested for ${workflowName}`);
      } catch (error) {
        Notifications.error(getErrorMessage(error, "Failed to resubmit workflow."));
      }
    };

    const openResubmitWithOptionsDialog = () => {
      argoWorkflowResubmitOptionsDialogStore.open(object);
    };

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
        {canSuspendWorkflow(object) ||
        canResumeWorkflow(object) ||
        canTerminateWorkflow(object) ||
        canRetryWorkflow(object) ||
        canResubmitWorkflow(object) ? (
          <DrawerItem name="Actions">
            {canSuspendWorkflow(object) ? <Button onClick={suspendWorkflow}>Suspend</Button> : null}
            {canResumeWorkflow(object) ? <Button onClick={resumeWorkflow}>Resume</Button> : null}
            {canTerminateWorkflow(object) ? <Button onClick={terminateWorkflow}>Terminate</Button> : null}
            {canRetryWorkflow(object) ? <Button onClick={retryWorkflow}>Retry</Button> : null}
            {canResubmitWorkflow(object) ? <Button onClick={resubmitWorkflow}>Resubmit</Button> : null}
            {canResubmitWorkflow(object) ? (
              <Button onClick={openResubmitWithOptionsDialog}>Resubmit with options</Button>
            ) : null}
          </DrawerItem>
        ) : null}
      </>
    );
  }),
);
