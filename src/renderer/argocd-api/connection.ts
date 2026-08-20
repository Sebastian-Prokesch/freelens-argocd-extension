import { ArgoPreferencesStore } from "../../common/store";

import type { ArgoCdApiConnection, ArgoCdDataSource } from "../../common/argocd-api";
import type { ArgoCdServerConnection } from "../../common/store/preferences-store";

export function getArgoPreferences(): ArgoPreferencesStore {
  return ArgoPreferencesStore.getInstanceOrCreate<ArgoPreferencesStore>();
}

export function getActiveArgoCdServerConnection(): ArgoCdServerConnection | null {
  return getArgoPreferences().getActiveApiConnection();
}

export function getArgoCdApiConnection(): ArgoCdApiConnection {
  const active = getActiveArgoCdServerConnection();
  return {
    apiServerUrl: active?.apiServerUrl ?? "",
    apiToken: active?.apiToken ?? "",
    insecureSkipTlsVerify: active?.insecureSkipTlsVerify === true,
    customCaPem: active?.customCaPem ?? "",
    httpsProxy: active?.httpsProxy ?? "",
  };
}

export function getArgoCdDataSource(): ArgoCdDataSource {
  const preferences = getArgoPreferences();
  if (preferences.connectionMode !== "api") {
    return "cluster";
  }

  const active = preferences.getActiveApiConnection();
  if (!active?.apiServerUrl.trim() || !active.apiToken.trim()) {
    return "api-misconfigured";
  }

  return "api";
}

export function isArgoCdApiMode(): boolean {
  return getArgoCdDataSource() === "api";
}
