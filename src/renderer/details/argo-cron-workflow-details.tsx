import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { withErrorPage } from "../components/error-page";
import {
  type ArgoCronWorkflow,
  getCronWorkflowActiveCount,
  getCronWorkflowConcurrencyPolicy,
  getCronWorkflowLastScheduled,
  getCronWorkflowNextScheduled,
  getCronWorkflowSchedules,
} from "../k8s/workflows";

const {
  Component: { DrawerItem, DrawerTitle },
} = Renderer;

export interface ArgoCronWorkflowDetailsProps extends Renderer.Component.KubeObjectDetailsProps<ArgoCronWorkflow> {
  extension: Renderer.LensExtension;
}

export const ArgoCronWorkflowDetails = observer((props: ArgoCronWorkflowDetailsProps) =>
  withErrorPage(props, () => {
    const { object } = props;

    return (
      <>
        <DrawerTitle>CronWorkflow</DrawerTitle>
        <DrawerItem name="Schedules">{getCronWorkflowSchedules(object)}</DrawerItem>
        <DrawerItem name="Timezone">{object.spec?.timezone ?? "N/A"}</DrawerItem>
        <DrawerItem name="Concurrency Policy">{getCronWorkflowConcurrencyPolicy(object)}</DrawerItem>
        <DrawerItem name="Suspend">{object.spec?.suspend ? "true" : "false"}</DrawerItem>
        <DrawerItem name="Next Scheduled">{getCronWorkflowNextScheduled(object)}</DrawerItem>
        <DrawerItem name="Last Scheduled">{getCronWorkflowLastScheduled(object)}</DrawerItem>
        <DrawerItem name="Active">{String(getCronWorkflowActiveCount(object))}</DrawerItem>
      </>
    );
  }),
);
