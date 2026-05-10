import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { ArgoAnalysisTemplateDetailContent } from "./argo-analysis-template-detail-content";
import { withErrorPage } from "../components/error-page";
import { type ArgoClusterAnalysisTemplate } from "../k8s/rollouts";

export interface ArgoClusterAnalysisTemplateDetailsProps
  extends Renderer.Component.KubeObjectDetailsProps<ArgoClusterAnalysisTemplate> {
  extension: Renderer.LensExtension;
}

export const ArgoClusterAnalysisTemplateDetails = observer((props: ArgoClusterAnalysisTemplateDetailsProps) =>
  withErrorPage(props, () => {
    const { object } = props;

    return (
      <>
        <ArgoAnalysisTemplateDetailContent title="ClusterAnalysisTemplate" spec={object.spec} />
      </>
    );
  }),
);
