import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { useState } from "react";
import { ArgoPreferencesStore } from "../../common/store";
import { getArgoCdApiClient } from "../argocd-api";
import styles from "./argo-preference.module.scss";
import stylesInline from "./argo-preference.module.scss?inline";

const {
  Component: { Button, Checkbox, Input },
} = Renderer;

const preferences = ArgoPreferencesStore.getInstanceOrCreate<ArgoPreferencesStore>();

function connectionLabel(connection: { name: string; apiServerUrl: string }): string {
  const name = connection.name.trim();
  const url = connection.apiServerUrl.trim();
  if (name && url) return `${name} — ${url}`;
  return name || url || "Untitled connection";
}

export const ArgoPreferenceInput = observer(() => {
  const [isTesting, setIsTesting] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [testOk, setTestOk] = useState(false);
  const apiMode = preferences.connectionMode === "api";
  const selected = preferences.getActiveApiConnection();

  const testConnection = async () => {
    if (!selected) {
      return;
    }

    setIsTesting(true);
    setTestMessage(null);
    setTestOk(false);

    try {
      const result = await getArgoCdApiClient().testConnection(selected.id);
      const parts = [
        result.username ? `Authenticated as ${result.username}` : "Authentication succeeded",
        result.version ? `Argo CD ${result.version}` : undefined,
      ].filter(Boolean);
      setTestMessage(parts.join(" · "));
      setTestOk(true);
    } catch (error) {
      setTestMessage(error instanceof Error ? error.message : "Failed to connect to Argo CD.");
      setTestOk(false);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <>
      <style>{stylesInline}</style>
      <div className={styles.root}>
        <div className={styles.field}>
          <div className={styles.label}>Data source</div>
          <div className={styles.modeGroup}>
            <label className={styles.modeOption}>
              <input
                type="radio"
                name="argo-connection-mode"
                checked={!apiMode}
                onChange={() => {
                  preferences.connectionMode = "cluster";
                  setTestMessage(null);
                }}
              />
              <span>Current Kubernetes cluster</span>
            </label>
            <label className={styles.modeOption}>
              <input
                type="radio"
                name="argo-connection-mode"
                checked={apiMode}
                onChange={() => {
                  preferences.connectionMode = "api";
                  setTestMessage(null);
                  if (preferences.apiConnections.length === 0) {
                    preferences.addApiConnection({ name: "Argo CD 1" });
                  }
                }}
              />
              <span>Argo CD API (server URL + token)</span>
            </label>
          </div>
        </div>

        {apiMode ? (
          <>
            <div className={styles.field}>
              <div className={styles.label}>Saved connections</div>
              <div className={styles.connectionList}>
                {preferences.apiConnections.length === 0 ? (
                  <div className={styles.helper}>No connections yet. Add one below.</div>
                ) : (
                  preferences.apiConnections.map((connection) => {
                    const isSelected = preferences.activeApiConnectionId === connection.id;
                    return (
                      <div
                        key={connection.id}
                        className={`${styles.connectionRow} ${isSelected ? styles.connectionRowActive : ""}`}
                      >
                        <label className={styles.connectionSelect}>
                          <input
                            type="radio"
                            name="argo-active-connection"
                            checked={isSelected}
                            onChange={() => {
                              preferences.selectApiConnection(connection.id);
                              setTestMessage(null);
                            }}
                            aria-label={`Select ${connectionLabel(connection)}`}
                          />
                          <button
                            type="button"
                            className={styles.connectionNameButton}
                            onClick={() => {
                              preferences.selectApiConnection(connection.id);
                              setTestMessage(null);
                            }}
                          >
                            <span className={styles.connectionName}>
                              {connection.name.trim() || "Untitled"}
                            </span>
                            <span className={styles.connectionUrl}>
                              {connection.apiServerUrl.trim() || "No URL"}
                            </span>
                          </button>
                        </label>
                        <Button
                          onClick={() => {
                            preferences.removeApiConnection(connection.id);
                            setTestMessage(null);
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
              <div className={styles.actions}>
                <Button
                  onClick={() => {
                    preferences.addApiConnection();
                    setTestMessage(null);
                  }}
                >
                  Add connection
                </Button>
              </div>
              <div className={styles.helper}>
                The selected connection is used by ArgoCD pages. Click a row to select and edit it.
              </div>
            </div>

            {selected ? (
              <>
                <div className={styles.field}>
                  <div className={styles.label}>Connection name</div>
                  <Input
                    value={selected.name}
                    placeholder="prod / staging / shared"
                    onChange={(value) => {
                      preferences.updateApiConnection(selected.id, { name: value });
                      setTestMessage(null);
                    }}
                  />
                </div>

                <div className={styles.field}>
                  <div className={styles.label}>Argo CD server URL</div>
                  <Input
                    value={selected.apiServerUrl}
                    placeholder="https://argocd.example.com"
                    onChange={(value) => {
                      preferences.updateApiConnection(selected.id, { apiServerUrl: value });
                      setTestMessage(null);
                    }}
                  />
                </div>

                <div className={styles.field}>
                  <div className={styles.label}>API token</div>
                  <Input
                    type="password"
                    value={selected.apiToken}
                    placeholder="Account or user JWT token"
                    onChange={(value) => {
                      preferences.updateApiConnection(selected.id, { apiToken: value });
                      setTestMessage(null);
                    }}
                  />
                  <div className={styles.helper}>
                    Stored locally in Freelens extension settings. Prefer a least-privilege account token.
                  </div>
                </div>

                <div className={styles.field}>
                  <div className={styles.label}>HTTPS proxy (optional)</div>
                  <Input
                    value={selected.httpsProxy}
                    placeholder="http://proxy.example.com:8080"
                    onChange={(value) => {
                      preferences.updateApiConnection(selected.id, { httpsProxy: value });
                      setTestMessage(null);
                    }}
                  />
                  <div className={styles.helper}>
                    Forward Argo CD API requests through this proxy (same idea as Freelens cluster HTTPS proxy). Leave
                    empty for a direct connection. Supports http://user:pass@host:port.
                  </div>
                </div>

                <div className={styles.field}>
                  <div className={styles.label}>Custom CA certificate (PEM)</div>
                  <Input
                    multiLine
                    rows={6}
                    value={selected.customCaPem}
                    placeholder={"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"}
                    onChange={(value) => {
                      preferences.updateApiConnection(selected.id, { customCaPem: value });
                      setTestMessage(null);
                    }}
                  />
                  <div className={styles.helper}>
                    Preferred over Skip TLS. Paste the corporate issuing/root CA PEM. Leave empty to use Node defaults +
                    system CAs when available.
                  </div>
                </div>

                <Checkbox
                  label="Skip TLS certificate verification"
                  value={selected.insecureSkipTlsVerify}
                  onChange={(value) => {
                    preferences.updateApiConnection(selected.id, { insecureSkipTlsVerify: value });
                    setTestMessage(null);
                  }}
                />
                <div className={styles.helper}>
                  Last resort only. Prefer Custom CA above so the server certificate is still verified.
                </div>

                <div className={styles.actions}>
                  <Button
                    primary
                    disabled={isTesting || !selected.apiServerUrl.trim() || !selected.apiToken.trim()}
                    onClick={testConnection}
                  >
                    {isTesting ? "Testing…" : "Test connection"}
                  </Button>
                </div>

                {testMessage ? (
                  <div
                    className={testOk ? styles.statusOk : styles.statusError}
                    data-testid="argo-preference-test-message"
                  >
                    {testMessage}
                  </div>
                ) : null}
              </>
            ) : null}
          </>
        ) : (
          <div className={styles.helper}>
            Applications, ApplicationSets, AppProjects, and Overview use Argo CRDs in the active cluster.
          </div>
        )}
      </div>
    </>
  );
});

export const ArgoPreferenceHint = () => (
  <span>
    Choose whether ArgoCD pages talk to CRDs in the current cluster or to one of your saved remote Argo CD API
    connections.
  </span>
);
