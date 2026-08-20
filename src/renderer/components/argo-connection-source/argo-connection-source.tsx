import { observer } from "mobx-react";
import { getActiveArgoCdServerConnection, getArgoCdDataSource, getArgoPreferences } from "../../argocd-api";
import styles from "./argo-connection-source.module.scss";
import stylesInline from "./argo-connection-source.module.scss?inline";

export const ArgoConnectionSourceBanner = observer(() => {
  const source = getArgoCdDataSource();
  if (source !== "api") {
    return null;
  }

  const preferences = getArgoPreferences();
  const active = getActiveArgoCdServerConnection();
  const connections = preferences.apiConnections;

  return (
    <>
      <style>{stylesInline}</style>
      <div className={styles.banner} data-testid="argo-connection-source-banner">
        <span className={styles.bannerStrong}>Argo CD API</span>
        {connections.length > 1 ? (
          <label className={styles.bannerSwitcher}>
            <span className={styles.bannerSwitcherLabel}>Connection</span>
            <select
              className={styles.bannerSelect}
              value={active?.id ?? ""}
              aria-label="Active Argo CD connection"
              onChange={(event) => preferences.selectApiConnection(event.target.value)}
            >
              {connections.map((connection) => (
                <option key={connection.id} value={connection.id}>
                  {connection.name.trim() || connection.apiServerUrl.trim() || "Untitled"}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span>{active?.name.trim() || "Argo CD"}</span>
        )}
        <span>{active?.apiServerUrl.trim()}</span>
        {active?.httpsProxy?.trim() ? <span>via proxy</span> : null}
        {active?.insecureSkipTlsVerify ? <span>TLS verify skipped</span> : null}
      </div>
    </>
  );
});

export const ArgoCdApiMisconfiguredNotice = observer(() => {
  return (
    <>
      <style>{stylesInline}</style>
      <div className={styles.error} data-testid="argo-api-misconfigured-notice">
        Argo CD API mode is enabled, but the active connection is missing a server URL or token. Set them under
        Preferences → Argo CD Connection.
      </div>
    </>
  );
});

export const ArgoCdApiConfigClusterOnlyNotice = () => {
  return (
    <>
      <style>{stylesInline}</style>
      <div className={styles.hint} data-testid="argo-api-config-cluster-only-notice">
        Config (repositories, clusters, ConfigMaps) is still read from the current Kubernetes cluster. Switch the data
        source to Current cluster in Preferences to manage these resources, or keep using Applications / Projects via
        the Argo CD API.
      </div>
    </>
  );
};
