import { observer } from "mobx-react";
import { ArgoPageLink } from "../components/link";
import { ArgoPageIds } from "../routes/argo-page-ids";
import styles from "./argo-landing-page.module.scss";

/**
 * Top-level Argo hub: links into product areas (ArgoCD, Workflows, Rollouts).
 */
export const ArgoLandingPage = observer(() => {
  return (
    <div className={styles.root}>
      <h1 className={styles.title}>Argo</h1>
      <p className={styles.lead}>Choose a product area to open its cluster pages.</p>
      <ul className={styles.list}>
        <li>
          <ArgoPageLink pageId={ArgoPageIds.argocdOverview}>ArgoCD</ArgoPageLink>
          <span className={styles.hint}> — Applications, AppProjects, config, overview</span>
        </li>
        <li>
          <ArgoPageLink pageId={ArgoPageIds.workflowsRoot}>Argo Workflows</ArgoPageLink>
          <span className={styles.hint}> — Workflows, CronWorkflows, and templates</span>
        </li>
        <li>
          <ArgoPageLink pageId={ArgoPageIds.rolloutsOverview}>Argo Rollouts</ArgoPageLink>
          <span className={styles.hint}>
            {" "}
            — Rollouts overview, Rollouts, AnalysisRuns, AnalysisTemplates, ClusterAnalysisTemplates, and Experiments
          </span>
        </li>
      </ul>
    </div>
  );
});
