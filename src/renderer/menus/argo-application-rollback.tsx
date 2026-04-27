import { Renderer } from "@freelensapp/extensions";
import { withErrorPage } from "../components/error-page";
import { ArgoApplication, getArgoApplicationStore } from "../k8s/argocd";

const {
  Component: { ConfirmDialog, Icon, MenuItem, Notifications },
} = Renderer;

type RevisionHistory = any;

export interface ArgoRollbackMenuItemProps extends Renderer.Component.KubeObjectMenuProps<ArgoApplication> {
  extension: Renderer.LensExtension;
}

const getRevisionLabel = (entry: RevisionHistory, index: number) => {
  const revision = entry?.revision ?? "unknown";
  const by = entry?.initiatedBy?.username ?? (entry?.initiatedBy?.automated ? "automated" : "unknown");
  return `${index + 1}. ${revision} (id=${entry?.id ?? "n/a"}, by=${by})`;
};

const pickHistoryEntry = (history: RevisionHistory[]) => {
  const choices = history.map((entry, index) => getRevisionLabel(entry, index)).join("\n");
  const response = window.prompt(`Select a rollback target by number:\n${choices}`);

  if (!response) return null;

  const pickedIndex = Number.parseInt(response, 10) - 1;

  if (Number.isNaN(pickedIndex) || pickedIndex < 0 || pickedIndex >= history.length) {
    return undefined;
  }

  return history[pickedIndex];
};

export const ArgoRollbackMenuItem = (props: ArgoRollbackMenuItemProps) =>
  withErrorPage(props, () => {
    const { object, toolbar } = props;

    if (!object) return <></>;

    const history = object.status?.history ?? [];
    if (!history.length) return <></>;

    const store = getArgoApplicationStore();

    const rollback = async () => {
      const appName = object.getName?.() ?? object.metadata?.name ?? "application";
      const selectedHistoryEntry = pickHistoryEntry(history as RevisionHistory[]);

      if (selectedHistoryEntry === undefined) {
        Notifications.error("Invalid rollback selection");
        return;
      }

      if (!selectedHistoryEntry) return;

      const selectedRevision = selectedHistoryEntry.revision;
      if (!selectedRevision) {
        Notifications.error("Selected history entry does not contain a revision");
        return;
      }

      const confirmed = await ConfirmDialog.confirm({
        message: `Rollback ${appName} to revision ${selectedRevision}?`,
      });

      if (!confirmed) {
        return;
      }

      try {
        await store.patch(
          object,
          {
            operation: {
              initiatedBy: {
                username: "LensApp",
              },
              sync: {
                revision: selectedRevision,
              },
            },
          },
          "merge",
        );

        Notifications.ok(`Rollback started for revision ${selectedRevision}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to start rollback.";
        Notifications.error(message);
      }
    };

    return (
      <MenuItem onClick={rollback}>
        <Icon material="history" interactive={toolbar} title="Rollback" />
        <span className="title">Rollback</span>
      </MenuItem>
    );
  });
