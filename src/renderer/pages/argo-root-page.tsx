import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { ArgoApplicationsTabContent } from "./argo-applications-page";
import { ArgoOverviewTabContent } from "./argo-overview-page";

const {
  Component: { TabLayout },
} = Renderer;

export const ArgoRootPage = observer(() => {
  const tabs = [
    {
      id: "overview",
      title: "Overview",
      routePath: "/argocd/overview",
      component: ArgoOverviewTabContent,
      exact: true,
    },
    {
      id: "applications",
      title: "Applications",
      routePath: "/argocd/applications",
      component: ArgoApplicationsTabContent,
      exact: true,
    },
  ];

  return (
    <TabLayout tabs={tabs} />
  );
});
