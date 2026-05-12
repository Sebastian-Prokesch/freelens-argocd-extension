import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import React from "react";
import { argoConfigDialogStore } from "../components/argo-config";
import { withErrorPage } from "../components/error-page";
import {
  getArgoSecretType,
  getSecretField,
  isArgoConfigMap,
  isArgoNotificationsConfigMap,
  isArgoNotificationsSecret,
  type LabeledObject,
  parseClusterConnection,
  parseRepoConnection,
  summarizeNotificationsData,
} from "../k8s/argocd";
import styles from "./argo-config-page.module.scss";
import stylesInline from "./argo-config-page.module.scss?inline";

const {
  Component: { KubeObjectAge, KubeObjectListLayout, Tab, Tabs, WithTooltip },
  K8sApi: { configMapStore, secretsStore },
} = Renderer;

type ArgoConfigTab = "repositories" | "repo-creds" | "clusters" | "configmaps" | "notifications";

const tabOptions: { id: ArgoConfigTab; label: string }[] = [
  { id: "repositories", label: "Repositories" },
  { id: "repo-creds", label: "Repo Credentials" },
  { id: "clusters", label: "Clusters" },
  { id: "notifications", label: "Notifications" },
  { id: "configmaps", label: "ArgoCD Config" },
];

const renderAgeCell = (object: LabeledObject) => <KubeObjectAge object={object as any} key="age" />;

const renderConfigMapList = (configMaps: any[]) => (
  <KubeObjectListLayout<any, any>
    tableId="argocdConfigMaps"
    isConfigurable
    className={styles.page}
    store={configMapStore}
    items={configMaps}
    sortingCallbacks={{
      name: (object) => object.getName(),
      namespace: (object) => object.getNs(),
      keys: (object) => Object.keys(object.data ?? {}).length,
      age: (object) => object.getCreationTimestamp(),
    }}
    searchFilters={[(object) => object.getSearchFields()]}
    renderHeaderTitle="ArgoCD ConfigMaps"
    renderTableHeader={[
      { id: "name", title: "Name", sortBy: "name" },
      { id: "namespace", title: "Namespace", sortBy: "namespace", className: styles.tableCellSmall },
      { id: "keys", title: "Keys", sortBy: "keys", className: styles.tableCellSmall },
      { id: "age", title: "Age", sortBy: "age", className: styles.tableCellSmall },
    ]}
    renderTableContents={(object) => [
      <WithTooltip>{object.getName()}</WithTooltip>,
      <WithTooltip>{object.getNs()}</WithTooltip>,
      <WithTooltip>{Object.keys(object.data ?? {}).length}</WithTooltip>,
      renderAgeCell(object),
    ]}
  />
);

const renderRepoList = (secrets: any[], title: string) => {
  const safeTitle = title.replace(/\s+/g, "");

  return (
    <KubeObjectListLayout<any, any>
      tableId={`argocd${safeTitle}Secrets`}
      isConfigurable
      className={styles.page}
      store={secretsStore}
      items={secrets}
      sortingCallbacks={{
        name: (object) => object.getName(),
        namespace: (object) => object.getNs(),
        url: (object) => getSecretField(object, "url") ?? "",
        host: (object) => parseRepoConnection(object).host,
        protocol: (object) => parseRepoConnection(object).protocol,
        type: (object) => getSecretField(object, "type") ?? "",
        auth: (object) => parseRepoConnection(object).authMethod,
        tls: (object) => Number(parseRepoConnection(object).hasTlsClientConfig),
        project: (object) => getSecretField(object, "project") ?? "",
        age: (object) => object.getCreationTimestamp(),
      }}
      searchFilters={[(object) => object.getSearchFields()]}
      renderHeaderTitle={`ArgoCD ${title}`}
      renderTableHeader={[
        { id: "name", title: "Name", sortBy: "name" },
        { id: "namespace", title: "Namespace", sortBy: "namespace", className: styles.tableCellSmall },
        { id: "url", title: "URL", sortBy: "url", className: styles.tableCellLarge },
        { id: "host", title: "Host", sortBy: "host", className: styles.tableCellSmall },
        { id: "protocol", title: "Protocol", sortBy: "protocol", className: styles.tableCellSmall },
        { id: "type", title: "Type", sortBy: "type", className: styles.tableCellSmall },
        { id: "auth", title: "Auth", sortBy: "auth", className: styles.tableCellSmall },
        { id: "tls", title: "TLS", sortBy: "tls", className: styles.tableCellSmall },
        { id: "project", title: "Project", sortBy: "project", className: styles.tableCellSmall },
        { id: "age", title: "Age", sortBy: "age", className: styles.tableCellSmall },
      ]}
      renderTableContents={(object) => {
        const connection = parseRepoConnection(object);
        const authLabel = connection.authMethod === "githubApp" ? "GitHub App" : connection.authMethod.toUpperCase();
        return [
          <WithTooltip>{object.getName()}</WithTooltip>,
          <WithTooltip>{object.getNs()}</WithTooltip>,
          <WithTooltip>{getSecretField(object, "url") ?? "N/A"}</WithTooltip>,
          <WithTooltip>{connection.host}</WithTooltip>,
          <WithTooltip>{connection.protocol}</WithTooltip>,
          <WithTooltip>{getSecretField(object, "type") ?? "N/A"}</WithTooltip>,
          <WithTooltip>{authLabel}</WithTooltip>,
          <WithTooltip>{connection.hasTlsClientConfig ? "enabled" : "disabled"}</WithTooltip>,
          <WithTooltip>{getSecretField(object, "project") ?? "N/A"}</WithTooltip>,
          renderAgeCell(object),
        ];
      }}
      addRemoveButtons={{
        onAdd: () => argoConfigDialogStore.openCreate(title === "Repositories" ? "repository" : "repo-creds"),
      }}
    />
  );
};

const renderClusterList = (secrets: any[]) => (
  <KubeObjectListLayout<any, any>
    tableId="argocdClusterSecrets"
    isConfigurable
    className={styles.page}
    store={secretsStore}
    items={secrets}
    sortingCallbacks={{
      name: (object) => object.getName(),
      namespace: (object) => object.getNs(),
      clusterName: (object) => getSecretField(object, "name") ?? "",
      server: (object) => getSecretField(object, "server") ?? "",
      host: (object) => parseClusterConnection(object).host,
      protocol: (object) => parseClusterConnection(object).protocol,
      scope: (object) => parseClusterConnection(object).namespaceScope,
      tls: (object) => Number(parseClusterConnection(object).hasTlsClientConfig),
      project: (object) => getSecretField(object, "project") ?? "",
      age: (object) => object.getCreationTimestamp(),
    }}
    searchFilters={[(object) => object.getSearchFields()]}
    renderHeaderTitle="ArgoCD Clusters"
    renderTableHeader={[
      { id: "name", title: "Name", sortBy: "name" },
      { id: "namespace", title: "Namespace", sortBy: "namespace", className: styles.tableCellSmall },
      { id: "clusterName", title: "Cluster Name", sortBy: "clusterName", className: styles.tableCellSmall },
      { id: "server", title: "Server", sortBy: "server", className: styles.tableCellLarge },
      { id: "host", title: "Host", sortBy: "host", className: styles.tableCellSmall },
      { id: "protocol", title: "Protocol", sortBy: "protocol", className: styles.tableCellSmall },
      { id: "scope", title: "Scope", sortBy: "scope", className: styles.tableCellSmall },
      { id: "tls", title: "TLS", sortBy: "tls", className: styles.tableCellSmall },
      { id: "project", title: "Project", sortBy: "project", className: styles.tableCellSmall },
      { id: "age", title: "Age", sortBy: "age", className: styles.tableCellSmall },
    ]}
    renderTableContents={(object) => {
      const connection = parseClusterConnection(object);
      return [
        <WithTooltip>{object.getName()}</WithTooltip>,
        <WithTooltip>{object.getNs()}</WithTooltip>,
        <WithTooltip>{getSecretField(object, "name") ?? "N/A"}</WithTooltip>,
        <WithTooltip>{getSecretField(object, "server") ?? "N/A"}</WithTooltip>,
        <WithTooltip>{connection.host}</WithTooltip>,
        <WithTooltip>{connection.protocol}</WithTooltip>,
        <WithTooltip>{connection.namespaceScope}</WithTooltip>,
        <WithTooltip>{connection.hasTlsClientConfig ? "enabled" : "disabled"}</WithTooltip>,
        <WithTooltip>{getSecretField(object, "project") ?? "N/A"}</WithTooltip>,
        renderAgeCell(object),
      ];
    }}
    addRemoveButtons={{
      onAdd: () => argoConfigDialogStore.openCreate("cluster"),
    }}
  />
);

const getNotificationsKind = (object: LabeledObject): string =>
  isArgoNotificationsSecret(object) ? "Secret" : "ConfigMap";

const getNotificationsSource = (object: LabeledObject): string =>
  isArgoNotificationsSecret(object) ? "argocd-notifications-secret" : "argocd-notifications-cm";

const getNotificationEntryCount = (object: LabeledObject): number => {
  if (isArgoNotificationsSecret(object)) {
    return Object.keys(object.data ?? object.stringData ?? {}).length;
  }

  const summary = summarizeNotificationsData(object.data ?? {});
  return summary.triggerKeys.length + summary.templateKeys.length + summary.subscriptionEntries.length;
};

const renderNotificationsList = (items: LabeledObject[]) => (
  <KubeObjectListLayout<any, any>
    tableId="argocdNotificationsResources"
    isConfigurable
    className={styles.page}
    store={configMapStore}
    items={items}
    sortingCallbacks={{
      kind: (object) => getNotificationsKind(object),
      name: (object) => object.getName(),
      namespace: (object) => object.getNs(),
      source: (object) => getNotificationsSource(object),
      entries: (object) => getNotificationEntryCount(object),
      age: (object) => object.getCreationTimestamp(),
    }}
    searchFilters={[(object) => object.getSearchFields()]}
    renderHeaderTitle="ArgoCD Notifications"
    renderTableHeader={[
      { id: "kind", title: "Kind", sortBy: "kind", className: styles.tableCellSmall },
      { id: "name", title: "Name", sortBy: "name" },
      { id: "namespace", title: "Namespace", sortBy: "namespace", className: styles.tableCellSmall },
      { id: "source", title: "Source", sortBy: "source", className: styles.tableCellLarge },
      { id: "entries", title: "Entries", sortBy: "entries", className: styles.tableCellSmall },
      { id: "age", title: "Age", sortBy: "age", className: styles.tableCellSmall },
    ]}
    renderTableContents={(object) => [
      <WithTooltip>{getNotificationsKind(object)}</WithTooltip>,
      <WithTooltip>{object.getName()}</WithTooltip>,
      <WithTooltip>{object.getNs()}</WithTooltip>,
      <WithTooltip>{getNotificationsSource(object)}</WithTooltip>,
      <WithTooltip>{getNotificationEntryCount(object)}</WithTooltip>,
      renderAgeCell(object),
    ]}
  />
);

export interface ArgoConfigPageProps {
  extension: Renderer.LensExtension;
}

export const ArgoConfigTabContent = observer(() => {
  const [activeTab, setActiveTab] = React.useState<ArgoConfigTab>("repositories");
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const watches = React.useRef<(() => void)[]>([]);

  React.useEffect(() => {
    let isMounted = true;

    (async () => {
      const { namespaceStore } = Renderer.K8sApi;
      try {
        setLoadError(null);
        await namespaceStore.loadAll({ namespaces: [] });
        watches.current.push(namespaceStore.subscribe());

        const namespaces = namespaceStore.items.map((ns) => ns.getName());
        await Promise.all([secretsStore.loadAll({ namespaces }), configMapStore.loadAll({ namespaces })]);

        watches.current.push(secretsStore.subscribe());
        watches.current.push(configMapStore.subscribe());

        if (isMounted) {
          setIsLoaded(true);
        }
      } catch (error) {
        if (isMounted) {
          const message = error instanceof Error ? error.message : "Failed to load ArgoCD config resources.";
          setLoadError(message);
        }
      }
    })();

    return () => {
      isMounted = false;
      for (const unsubscribe of watches.current) {
        unsubscribe();
      }
      watches.current = [];
    };
  }, []);

  const secretItems = secretsStore.contextItems as any[];
  const configMapItems = configMapStore.contextItems as any[];

  const repositorySecrets = secretItems.filter((item) => getArgoSecretType(item as LabeledObject) === "repository");
  const repoCredsSecrets = secretItems.filter((item) => getArgoSecretType(item as LabeledObject) === "repo-creds");
  const clusterSecrets = secretItems.filter((item) => getArgoSecretType(item as LabeledObject) === "cluster");
  const notificationsConfigMaps = configMapItems.filter((item) => isArgoNotificationsConfigMap(item as LabeledObject));
  const notificationsSecrets = secretItems.filter((item) => isArgoNotificationsSecret(item as LabeledObject));
  const notificationsResources = [...notificationsConfigMaps, ...notificationsSecrets];
  const configMaps = configMapItems.filter(
    (item) => isArgoConfigMap(item as LabeledObject) && !isArgoNotificationsConfigMap(item as LabeledObject),
  );

  return (
    <>
      <style>{stylesInline}</style>
      <div className={styles.root}>
        <div className={styles.header}>
          <Tabs
            className={styles.tabs}
            withBorder
            wrap
            value={activeTab}
            onChange={(value) => setActiveTab(value as ArgoConfigTab)}
          >
            {tabOptions.map((tab) => (
              <Tab key={tab.id} value={tab.id} label={tab.label} />
            ))}
          </Tabs>
        </div>

        <div className={styles.scrollBody}>
          {!isLoaded ? (
            <div className={styles.loading}>
              <WithTooltip>Loading ArgoCD config resources...</WithTooltip>
            </div>
          ) : null}
          {loadError ? (
            <div className={styles.loading}>
              <WithTooltip>{loadError}</WithTooltip>
            </div>
          ) : isLoaded ? (
            <>
              {activeTab === "repositories" && renderRepoList(repositorySecrets, "Repositories")}
              {activeTab === "repo-creds" && renderRepoList(repoCredsSecrets, "Repo Credentials")}
              {activeTab === "clusters" && renderClusterList(clusterSecrets)}
              {activeTab === "notifications" && renderNotificationsList(notificationsResources)}
              {activeTab === "configmaps" && renderConfigMapList(configMaps)}
            </>
          ) : null}
        </div>
      </div>
    </>
  );
});

export const ArgoConfigPage = observer((props: ArgoConfigPageProps) =>
  withErrorPage(props, () => <ArgoConfigTabContent />),
);
