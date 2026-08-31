import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getArgoCdApiClient } from "../argocd-api";
import { ArgoConnectionSourceBanner } from "../components/argo-connection-source";
import { withErrorPage } from "../components/error-page";
import { ArgoApplicationDetails } from "../details/argo-application-details";
import {
  ArgoHardRefreshMenuItem,
  ArgoRefreshMenuItem,
  ArgoSyncMenuItem,
  ArgoSyncWithOptionsMenuItem,
  ArgoTerminateMenuItem,
} from "../menus";
import { ArgoRoutes } from "../routes/argo-routes";
import styles from "./argo-application-api-details-page.module.scss";
import stylesInline from "./argo-application-api-details-page.module.scss?inline";

import type { ArgoApplication } from "../k8s/argocd";

export interface ArgoApiApplicationDetailsPageProps {
  extension: Renderer.LensExtension;
}

export const ArgoApiApplicationDetailsPage = observer((props: ArgoApiApplicationDetailsPageProps) =>
  withErrorPage(props, () => {
    const { extension } = props;
    const params = useParams<{ namespace?: string; name?: string }>();
    const namespaceParam = params.namespace ?? "_";
    const name = params.name ?? "";
    const appNamespace = namespaceParam === "_" ? undefined : namespaceParam;
    const [application, setApplication] = useState<ArgoApplication | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      let cancelled = false;

      (async () => {
        if (!name) {
          setError("Application name is missing.");
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        setError(null);

        try {
          const next = await getArgoCdApiClient().getApplication(name, appNamespace);
          if (!cancelled) {
            setApplication(next);
            setIsLoading(false);
          }
        } catch (err) {
          if (!cancelled) {
            setApplication(null);
            setError(err instanceof Error ? err.message : "Failed to load application from Argo CD API.");
            setIsLoading(false);
          }
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [appNamespace, name]);

    return (
      <>
        <style>{stylesInline}</style>
        <div className={styles.root}>
          <ArgoConnectionSourceBanner />
          <div className={styles.header}>
            <Link className={styles.backLink} to={ArgoRoutes.argocd.applications}>
              ← Applications
            </Link>
            <h5 className={styles.title}>{name || "Application"}</h5>
            {application ? (
              <div className={styles.actions}>
                <ArgoRefreshMenuItem object={application} toolbar extension={extension} />
                <ArgoHardRefreshMenuItem object={application} toolbar extension={extension} />
                <ArgoSyncMenuItem object={application} toolbar extension={extension} />
                <ArgoSyncWithOptionsMenuItem object={application} toolbar extension={extension} />
                <ArgoTerminateMenuItem object={application} toolbar extension={extension} />
              </div>
            ) : null}
          </div>

          {isLoading ? <div className={styles.loading}>Loading application...</div> : null}
          {error ? <div className={styles.error}>{error}</div> : null}
          {!isLoading && !error && application ? (
            <div className={styles.body}>
              <ArgoApplicationDetails
                object={application}
                extension={extension}
                onApplicationUpdated={setApplication}
              />
            </div>
          ) : null}
        </div>
      </>
    );
  }),
);
