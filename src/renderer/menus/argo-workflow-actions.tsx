import { Renderer } from "@freelensapp/extensions";
import { withErrorPage } from "../components/error-page";
import {
  type ArgoWorkflow,
  canResubmitWorkflow,
  canResumeWorkflow,
  canRetryWorkflow,
  canSuspendWorkflow,
  canTerminateWorkflow,
  getArgoWorkflowStore,
  getResumeWorkflowPatch,
  getSuspendWorkflowPatch,
  getTerminateWorkflowPatch,
  getErrorMessage,
  requestWorkflowAction,
} from "../k8s/workflows";

const {
  Component: { Icon, MenuItem, Notifications },
} = Renderer;

export interface ArgoWorkflowMenuItemProps extends Renderer.Component.KubeObjectMenuProps<ArgoWorkflow> {
  extension: Renderer.LensExtension;
}

const workflowName = (object: ArgoWorkflow) => object.getName?.() ?? object.metadata?.name ?? "workflow";

export const ArgoWorkflowSuspendMenuItem = (props: ArgoWorkflowMenuItemProps) =>
  withErrorPage(props, () => {
    const { object, toolbar } = props;

    if (!object || !canSuspendWorkflow(object)) {
      return <></>;
    }

    const workflowStore = getArgoWorkflowStore();

    const suspendWorkflow = async () => {
      try {
        await workflowStore.patch(object, getSuspendWorkflowPatch(), "merge");
        Notifications.ok(`Suspend requested for ${workflowName(object)}`);
      } catch (error) {
        Notifications.error(getErrorMessage(error, "Failed to suspend workflow."));
      }
    };

    return (
      <MenuItem onClick={suspendWorkflow}>
        <Icon material="pause_circle" interactive={toolbar} title="Suspend" />
        <span className="title">Suspend</span>
      </MenuItem>
    );
  });

export const ArgoWorkflowResumeMenuItem = (props: ArgoWorkflowMenuItemProps) =>
  withErrorPage(props, () => {
    const { object, toolbar } = props;

    if (!object || !canResumeWorkflow(object)) {
      return <></>;
    }

    const workflowStore = getArgoWorkflowStore();

    const resumeWorkflow = async () => {
      try {
        await workflowStore.patch(object, getResumeWorkflowPatch(), "merge");
        Notifications.ok(`Resume requested for ${workflowName(object)}`);
      } catch (error) {
        Notifications.error(getErrorMessage(error, "Failed to resume workflow."));
      }
    };

    return (
      <MenuItem onClick={resumeWorkflow}>
        <Icon material="play_circle" interactive={toolbar} title="Resume" />
        <span className="title">Resume</span>
      </MenuItem>
    );
  });

export const ArgoWorkflowTerminateMenuItem = (props: ArgoWorkflowMenuItemProps) =>
  withErrorPage(props, () => {
    const { object, toolbar } = props;

    if (!object || !canTerminateWorkflow(object)) {
      return <></>;
    }

    const workflowStore = getArgoWorkflowStore();

    const terminateWorkflow = async () => {
      try {
        await workflowStore.patch(object, getTerminateWorkflowPatch(), "merge");
        Notifications.ok(`Terminate requested for ${workflowName(object)}`);
      } catch (error) {
        Notifications.error(getErrorMessage(error, "Failed to terminate workflow."));
      }
    };

    return (
      <MenuItem onClick={terminateWorkflow}>
        <Icon material="stop_circle" interactive={toolbar} title="Terminate" />
        <span className="title">Terminate</span>
      </MenuItem>
    );
  });

export const ArgoWorkflowRetryMenuItem = (props: ArgoWorkflowMenuItemProps) =>
  withErrorPage(props, () => {
    const { object, toolbar } = props;

    if (!object || !canRetryWorkflow(object)) {
      return <></>;
    }

    const workflowStore = getArgoWorkflowStore();

    const retryWorkflow = async () => {
      try {
        await requestWorkflowAction(workflowStore, object, "retry");
        Notifications.ok(`Retry requested for ${workflowName(object)}`);
      } catch (error) {
        Notifications.error(getErrorMessage(error, "Failed to retry workflow."));
      }
    };

    return (
      <MenuItem onClick={retryWorkflow}>
        <Icon material="refresh" interactive={toolbar} title="Retry" />
        <span className="title">Retry</span>
      </MenuItem>
    );
  });

export const ArgoWorkflowResubmitMenuItem = (props: ArgoWorkflowMenuItemProps) =>
  withErrorPage(props, () => {
    const { object, toolbar } = props;

    if (!object || !canResubmitWorkflow(object)) {
      return <></>;
    }

    const workflowStore = getArgoWorkflowStore();

    const resubmitWorkflow = async () => {
      try {
        await requestWorkflowAction(workflowStore, object, "resubmit");
        Notifications.ok(`Resubmit requested for ${workflowName(object)}`);
      } catch (error) {
        Notifications.error(getErrorMessage(error, "Failed to resubmit workflow."));
      }
    };

    return (
      <MenuItem onClick={resubmitWorkflow}>
        <Icon material="restart_alt" interactive={toolbar} title="Resubmit" />
        <span className="title">Resubmit</span>
      </MenuItem>
    );
  });
