import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { ArgoPreferencesStore } from "../../common/store";
import { withErrorPage } from "../components/error-page";
import { ArgoApplication, ArgoApplicationResourceSyncStatus } from "../k8s/argocd";
import { createEnumFromKeys } from "../utils";
import styles from "./argo-application-details.module.scss";
import stylesInline from "./argo-application-details.module.scss?inline";

const {
  Component: { 
    BadgeBoolean,
    DrawerTitle, 
    DrawerItem, 
    MarkdownViewer, 
    Gutter, 
    Table,
    TableHead,
    TableRow,
    TableCell
   },
} = Renderer;

const resourcesSortable = {
  name: (appResourceStatus: ArgoApplicationResourceSyncStatus) => appResourceStatus.name,
  status: (appResourceStatus: ArgoApplicationResourceSyncStatus) => appResourceStatus.status,
  kind: (appResourceStatus: ArgoApplicationResourceSyncStatus) => appResourceStatus.kind,
};

const resourcesSortByNames = createEnumFromKeys(resourcesSortable);
const resourcesSortByDefault: { sortBy: keyof typeof resourcesSortable; orderBy: Renderer.Component.TableOrderBy } = {
  sortBy: resourcesSortByNames.kind,
  orderBy: "desc",
};

export interface ArgoApplicationDetailsProps extends Renderer.Component.KubeObjectDetailsProps<ArgoApplication> {
  extension: Renderer.LensExtension;
}

export const ArgoApplicationDetails = observer((props: ArgoApplicationDetailsProps) =>
  withErrorPage(props, () => {
    const { object } = props;
    const preferences = ArgoPreferencesStore.getInstance<ArgoPreferencesStore>();

    return (
      <>
        <style>{stylesInline}</style>
        <div className={styles.argoApplicationDetails}>
          <Gutter size="md"/>
            <DrawerItem name="Description">
              <MarkdownViewer
                markdown={Array.isArray(object.spec.info)
                  ? object.spec.info.map(item => `- **${item.name}**: ${item.value}`).join("\n")
                  : (object.spec.info ?? "")}
              />
            </DrawerItem>
            <DrawerItem name="ArgoApplication checkbox">
              <BadgeBoolean value={preferences.enabled} />
            </DrawerItem>
            <Gutter size="md"/>
            <DrawerTitle>Resources Sync Status</DrawerTitle>
            <Table 
              tableId="resources"
              key="argo-application-details-ressources-table" 
              sortable={resourcesSortable}
              sortByDefault={resourcesSortByDefault}
              scrollable={false}
              sortSyncWithUrl={false}
            >
                <TableHead flat sticky={false}>
                      <TableCell sortBy={resourcesSortByNames.name}>Name</TableCell>
                      <TableCell sortBy={resourcesSortByNames.status}>Sync Status</TableCell>
                      <TableCell sortBy={resourcesSortByNames.kind}>Kind</TableCell>
                </TableHead>
              {object.status?.resources?.map((resource, index) => (
                  <TableRow key={`${resource.name}-${resource.kind}-${index}`}sortItem={resource}>
                      <TableCell>{resource.name}</TableCell>
                      <TableCell>{resource.status || 'Unknown'}</TableCell>
                      <TableCell>{resource.kind}</TableCell>
                  </TableRow>
                ))}
            </Table>
        </div>
      </>
    );
  }),
);
