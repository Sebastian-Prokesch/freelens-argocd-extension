import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { ArgoAnalysisTemplateDetailContent } from "./argo-analysis-template-detail-content";
import { withErrorPage } from "../components/error-page";
import { type ArgoAnalysisTemplate } from "../k8s/rollouts";

export interface ArgoAnalysisTemplateDetailsProps
  extends Renderer.Component.KubeObjectDetailsProps<ArgoAnalysisTemplate> {
  extension: Renderer.LensExtension;
}

export const ArgoAnalysisTemplateDetails = observer((props: ArgoAnalysisTemplateDetailsProps) =>
  withErrorPage(props, () => {
    const { object } = props;

    return (
      <>
        <ArgoAnalysisTemplateDetailContent title="AnalysisTemplate" spec={object.spec} />
      </>
    );
  }),
);
