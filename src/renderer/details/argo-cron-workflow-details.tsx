import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { withErrorPage } from "../components/error-page";
import {
  type ArgoCronWorkflow,
  canResumeCronWorkflow,
  canSuspendCronWorkflow,
  getArgoCronWorkflowStore,
  getCronWorkflowActiveCount,
  getCronWorkflowLastScheduled,
  getCronWorkflowSchedules,
  getResumeCronWorkflowPatch,
  getSuspendCronWorkflowPatch,
} from "../k8s/workflows";

const {
  Component: { Button, DrawerItem, DrawerTitle, Notifications },
} = Renderer;

export interface ArgoCronWorkflowDetailsProps extends Renderer.Component.KubeObjectDetailsProps<ArgoCronWorkflow> {
  extension: Renderer.LensExtension;
}

export const ArgoCronWorkflowDetails = observer((props: ArgoCronWorkflowDetailsProps) =>
  withErrorPage(props, () => {
    const { object } = props;
    const cronWorkflowStore = getArgoCronWorkflowStore();
    const cronWorkflowName = object.getName?.() ?? object.metadata?.name ?? "cronworkflow";

    const suspendCronWorkflow = async () => {
      try {
        await cronWorkflowStore.patch(object, getSuspendCronWorkflowPatch(), "merge");
        Notifications.ok(`Suspend requested for ${cronWorkflowName}`);
      } catch (error) {
        Notifications.error(error instanceof Error ? error.message : "Failed to suspend cron workflow.");
      }
    };

    const resumeCronWorkflow = async () => {
      try {
        await cronWorkflowStore.patch(object, getResumeCronWorkflowPatch(), "merge");
        Notifications.ok(`Resume requested for ${cronWorkflowName}`);
      } catch (error) {
        Notifications.error(error instanceof Error ? error.message : "Failed to resume cron workflow.");
      }
    };

    return (
      <>
        <DrawerTitle>CronWorkflow</DrawerTitle>
        <DrawerItem name="Schedules">{getCronWorkflowSchedules(object)}</DrawerItem>
        <DrawerItem name="Timezone">{object.spec?.timezone ?? "N/A"}</DrawerItem>
        <DrawerItem name="Suspend">{object.spec?.suspend ? "true" : "false"}</DrawerItem>
        <DrawerItem name="Last Scheduled">{getCronWorkflowLastScheduled(object)}</DrawerItem>
        <DrawerItem name="Active">{String(getCronWorkflowActiveCount(object))}</DrawerItem>
        {canSuspendCronWorkflow(object) || canResumeCronWorkflow(object) ? (
          <DrawerItem name="Actions">
            {canSuspendCronWorkflow(object) ? <Button onClick={suspendCronWorkflow}>Suspend</Button> : null}
            {canResumeCronWorkflow(object) ? <Button onClick={resumeCronWorkflow}>Resume</Button> : null}
          </DrawerItem>
        ) : null}
      </>
    );
  }),
);
