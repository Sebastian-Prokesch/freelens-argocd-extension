import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import React from "react";
import { argoConfigDialogStore } from "../components/argo-config";
import { withErrorPage } from "../components/error-page";
import { getArgoSecretType, getSecretField, isArgoConfigMap, type LabeledObject } from "../k8s/argocd";
import styles from "./argo-config-page.module.scss";
import stylesInline from "./argo-config-page.module.scss?inline";

const {
  Component: { KubeObjectAge, KubeObjectListLayout, Tab, Tabs, WithTooltip },
  K8sApi: { configMapStore, secretsStore },
} = Renderer;

type ArgoConfigTab = "repositories" | "repo-creds" | "clusters" | "configmaps";

const tabOptions: { id: ArgoConfigTab; label: string }[] = [
  { id: "repositories", label: "Repositories" },
  { id: "repo-creds", label: "Repo Credentials" },
  { id: "clusters", label: "Clusters" },
  { id: "configmaps", label: "ArgoCD Config" },
];

const renderAgeCell = (object: LabeledObject) => <KubeObjectAge object={object as any} key="age" />;

const renderConfigMapList = (configMaps: any[]) => (
  <KubeObjectListLayout<any, any>
    tableId="argocdConfigMaps"
    className={styles.listLayout}
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
      { title: "Name", sortBy: "name" },
      { title: "Namespace", sortBy: "namespace", className: styles.tableCellSmall },
      { title: "Keys", sortBy: "keys", className: styles.tableCellSmall },
      { title: "Age", sortBy: "age", className: styles.tableCellSmall },
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
      className={styles.listLayout}
      store={secretsStore}
      items={secrets}
      sortingCallbacks={{
        name: (object) => object.getName(),
        namespace: (object) => object.getNs(),
        url: (object) => getSecretField(object, "url") ?? "",
        type: (object) => getSecretField(object, "type") ?? "",
        project: (object) => getSecretField(object, "project") ?? "",
        age: (object) => object.getCreationTimestamp(),
      }}
      searchFilters={[(object) => object.getSearchFields()]}
      renderHeaderTitle={`ArgoCD ${title}`}
      renderTableHeader={[
        { title: "Name", sortBy: "name" },
        { title: "Namespace", sortBy: "namespace", className: styles.tableCellSmall },
        { title: "URL", sortBy: "url", className: styles.tableCellLarge },
        { title: "Type", sortBy: "type", className: styles.tableCellSmall },
        { title: "Project", sortBy: "project", className: styles.tableCellSmall },
        { title: "Age", sortBy: "age", className: styles.tableCellSmall },
      ]}
      renderTableContents={(object) => [
        <WithTooltip>{object.getName()}</WithTooltip>,
        <WithTooltip>{object.getNs()}</WithTooltip>,
        <WithTooltip>{getSecretField(object, "url") ?? "N/A"}</WithTooltip>,
        <WithTooltip>{getSecretField(object, "type") ?? "N/A"}</WithTooltip>,
        <WithTooltip>{getSecretField(object, "project") ?? "N/A"}</WithTooltip>,
        renderAgeCell(object),
      ]}
      addRemoveButtons={{
        onAdd: () => argoConfigDialogStore.openCreate(title === "Repositories" ? "repository" : "repo-creds"),
      }}
    />
  );
};

const renderClusterList = (secrets: any[]) => (
  <KubeObjectListLayout<any, any>
    tableId="argocdClusterSecrets"
    className={styles.listLayout}
    store={secretsStore}
    items={secrets}
    sortingCallbacks={{
      name: (object) => object.getName(),
      namespace: (object) => object.getNs(),
      clusterName: (object) => getSecretField(object, "name") ?? "",
      server: (object) => getSecretField(object, "server") ?? "",
      project: (object) => getSecretField(object, "project") ?? "",
      age: (object) => object.getCreationTimestamp(),
    }}
    searchFilters={[(object) => object.getSearchFields()]}
    renderHeaderTitle="ArgoCD Clusters"
    renderTableHeader={[
      { title: "Name", sortBy: "name" },
      { title: "Namespace", sortBy: "namespace", className: styles.tableCellSmall },
      { title: "Cluster Name", sortBy: "clusterName", className: styles.tableCellSmall },
      { title: "Server", sortBy: "server", className: styles.tableCellLarge },
      { title: "Project", sortBy: "project", className: styles.tableCellSmall },
      { title: "Age", sortBy: "age", className: styles.tableCellSmall },
    ]}
    renderTableContents={(object) => [
      <WithTooltip>{object.getName()}</WithTooltip>,
      <WithTooltip>{object.getNs()}</WithTooltip>,
      <WithTooltip>{getSecretField(object, "name") ?? "N/A"}</WithTooltip>,
      <WithTooltip>{getSecretField(object, "server") ?? "N/A"}</WithTooltip>,
      <WithTooltip>{getSecretField(object, "project") ?? "N/A"}</WithTooltip>,
      renderAgeCell(object),
    ]}
    addRemoveButtons={{
      onAdd: () => argoConfigDialogStore.openCreate("cluster"),
    }}
  />
);

export interface ArgoConfigPageProps {
  extension: Renderer.LensExtension;
}

export const ArgoConfigTabContent = observer(() => {
  const [activeTab, setActiveTab] = React.useState<ArgoConfigTab>("repositories");
  const [isLoaded, setIsLoaded] = React.useState(false);
  const watches = React.useRef<(() => void)[]>([]);

  React.useEffect(() => {
    let isMounted = true;

    (async () => {
      const { namespaceStore } = Renderer.K8sApi;
      await namespaceStore.loadAll({ namespaces: [] });
      watches.current.push(namespaceStore.subscribe());

      const namespaces = namespaceStore.items.map((ns) => ns.getName());
      await Promise.all([secretsStore.loadAll({ namespaces }), configMapStore.loadAll({ namespaces })]);

      watches.current.push(secretsStore.subscribe());
      watches.current.push(configMapStore.subscribe());

      if (isMounted) {
        setIsLoaded(true);
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
  const configMaps = configMapItems.filter((item) => isArgoConfigMap(item as LabeledObject));

  return (
    <>
      <style>{stylesInline}</style>
      <div className={styles.page}>
        <Tabs className={styles.tabs} value={activeTab} onChange={(value) => setActiveTab(value as ArgoConfigTab)}>
          {tabOptions.map((tab) => (
            <Tab key={tab.id} value={tab.id} label={tab.label} />
          ))}
        </Tabs>
        {!isLoaded ? (
          <WithTooltip>Loading ArgoCD config resources...</WithTooltip>
        ) : (
          <>
            {activeTab === "repositories" && renderRepoList(repositorySecrets, "Repositories")}
            {activeTab === "repo-creds" && renderRepoList(repoCredsSecrets, "Repo Credentials")}
            {activeTab === "clusters" && renderClusterList(clusterSecrets)}
            {activeTab === "configmaps" && renderConfigMapList(configMaps)}
          </>
        )}
      </div>
    </>
  );
});

export const ArgoConfigPage = observer((props: ArgoConfigPageProps) =>
  withErrorPage(props, () => <ArgoConfigTabContent />),
);
