import { Renderer } from "@freelensapp/extensions";
import { withErrorPage } from "../components/error-page";
import {
  type ArgoCronWorkflow,
  canResumeCronWorkflow,
  canSuspendCronWorkflow,
  getArgoCronWorkflowStore,
  getResumeCronWorkflowPatch,
  getSuspendCronWorkflowPatch,
} from "../k8s/workflows";

const {
  Component: { Icon, MenuItem, Notifications },
} = Renderer;

export interface ArgoCronWorkflowMenuItemProps extends Renderer.Component.KubeObjectMenuProps<ArgoCronWorkflow> {
  extension: Renderer.LensExtension;
}

const cronWorkflowName = (object: ArgoCronWorkflow) => object.getName?.() ?? object.metadata?.name ?? "cronworkflow";

export const ArgoCronWorkflowSuspendMenuItem = (props: ArgoCronWorkflowMenuItemProps) =>
  withErrorPage(props, () => {
    const { object, toolbar } = props;

    if (!object || !canSuspendCronWorkflow(object)) {
      return <></>;
    }

    const cronWorkflowStore = getArgoCronWorkflowStore();

    const suspendCronWorkflow = async () => {
      try {
        await cronWorkflowStore.patch(object, getSuspendCronWorkflowPatch(), "merge");
        Notifications.ok(`Suspend requested for ${cronWorkflowName(object)}`);
      } catch (error) {
        Notifications.error(error instanceof Error ? error.message : "Failed to suspend cron workflow.");
      }
    };

    return (
      <MenuItem onClick={suspendCronWorkflow}>
        <Icon material="pause_circle" interactive={toolbar} title="Suspend" />
        <span className="title">Suspend</span>
      </MenuItem>
    );
  });

export const ArgoCronWorkflowResumeMenuItem = (props: ArgoCronWorkflowMenuItemProps) =>
  withErrorPage(props, () => {
    const { object, toolbar } = props;

    if (!object || !canResumeCronWorkflow(object)) {
      return <></>;
    }

    const cronWorkflowStore = getArgoCronWorkflowStore();

    const resumeCronWorkflow = async () => {
      try {
        await cronWorkflowStore.patch(object, getResumeCronWorkflowPatch(), "merge");
        Notifications.ok(`Resume requested for ${cronWorkflowName(object)}`);
      } catch (error) {
        Notifications.error(error instanceof Error ? error.message : "Failed to resume cron workflow.");
      }
    };

    return (
      <MenuItem onClick={resumeCronWorkflow}>
        <Icon material="play_circle" interactive={toolbar} title="Resume" />
        <span className="title">Resume</span>
      </MenuItem>
    );
  });
