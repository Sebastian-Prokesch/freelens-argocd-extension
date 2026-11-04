import { type Common, Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { useEffect, useState } from "react";
import { getArgoCdApiClient } from "../argocd-api";
import { ArgoConnectionSourceBanner } from "../components/argo-connection-source";
import { withErrorPage } from "../components/error-page";
import { ArgoPageLink } from "../components/link";
import { ArgoApplicationDetails } from "../details/argo-application-details";
import { ArgoApplication } from "../k8s/argocd";
import {
  ArgoHardRefreshMenuItem,
  ArgoRefreshMenuItem,
  ArgoSyncMenuItem,
  ArgoSyncWithOptionsMenuItem,
  ArgoTerminateMenuItem,
} from "../menus";
import styles from "./argo-application-api-details-page.module.scss";

export interface ArgoApiApplicationDetailsPageProps {
  extension: Renderer.LensExtension;
  /** Page params declared at registration: `namespace` ("_" for none) and `name`. */
  params: Common.Types.PageComponentProps["params"];
}

export const ArgoApiApplicationDetailsPage = observer((props: ArgoApiApplicationDetailsPageProps) =>
  withErrorPage(props, () => {
    const { extension, params } = props;
    const namespaceParam: string = params.namespace?.get() ?? "_";
    const name: string = params.name?.get() ?? "";
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
        <div className={styles.root}>
          <ArgoConnectionSourceBanner />
          <div className={styles.header}>
            <ArgoPageLink className={styles.backLink} pageId={ArgoApplication.crd.plural}>
              ← Applications
            </ArgoPageLink>
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
