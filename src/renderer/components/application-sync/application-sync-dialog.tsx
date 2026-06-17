import { Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import { useEffect, useState } from "react";
import {
  type ApplicationSyncOptions,
  type ApplicationSyncStrategy,
  buildSelectedSyncOptions,
  getInitialSyncOptionValues,
  getRevisionPlaceholder,
  hasMultipleSources,
  KNOWN_APPLICATION_SYNC_OPTIONS,
  showsForceWarning,
  showsPruneWarning,
  showsReplaceWarning,
} from "../../endpoints/application-sync-options";
import { syncApplication } from "../../endpoints/argo-application-endpoints";
import type { ArgoApplication } from "../../k8s/argocd/applications";
import { getArgoApplicationStore } from "../../k8s/argocd";
import { runGuardedArgoMutation } from "../../mutations";
import styles from "./application-sync-dialog.module.scss";
import stylesInline from "./application-sync-dialog.module.scss?inline";
import { applicationSyncDialogStore } from "./application-sync-dialog-store";

const {
  Component: { Button, Checkbox, Dialog, Input },
} = Renderer;

interface SyncFormState {
  prune: boolean;
  dryRun: boolean;
  force: boolean;
  syncStrategy: ApplicationSyncStrategy;
  revision: string;
  selectedSyncOptions: string[];
}

const emptyFormState = (): SyncFormState => ({
  prune: false,
  dryRun: false,
  force: false,
  syncStrategy: "hook",
  revision: "",
  selectedSyncOptions: [],
});

const buildFormState = (application: ArgoApplication): SyncFormState => ({
  ...emptyFormState(),
  selectedSyncOptions: getInitialSyncOptionValues(application.spec?.syncPolicy?.syncOptions),
});

const toSyncOptions = (form: SyncFormState): ApplicationSyncOptions => ({
  prune: form.prune || undefined,
  dryRun: form.dryRun || undefined,
  force: form.force || undefined,
  syncStrategy: form.syncStrategy,
  revision: form.revision.trim() || undefined,
  syncOptions: buildSelectedSyncOptions(form.selectedSyncOptions),
});

const getApplicationName = (application: ArgoApplication): string =>
  application.getName?.() ?? application.metadata?.name ?? "application";

export const ApplicationSyncDialog = observer(() => {
  const { isOpen, application } = applicationSyncDialogStore;
  const [form, setForm] = useState<SyncFormState>(emptyFormState());

  useEffect(() => {
    if (isOpen && application) {
      setForm(buildFormState(application));
    }
  }, [application, isOpen]);

  if (!isOpen || !application) {
    return null;
  }

  const appName = getApplicationName(application);
  const multiSource = hasMultipleSources(application);
  const revisionPlaceholder = getRevisionPlaceholder(application);
  const selectedOptions = buildSelectedSyncOptions(form.selectedSyncOptions);
  const currentOptions = toSyncOptions(form);
  const showForceWarning = showsForceWarning(currentOptions);
  const showPruneWarning = showsPruneWarning(currentOptions);
  const showReplaceWarning = showsReplaceWarning(selectedOptions);

  const toggleSyncOption = (value: string, checked: boolean) => {
    setForm((current) => ({
      ...current,
      selectedSyncOptions: checked
        ? [...current.selectedSyncOptions, value]
        : current.selectedSyncOptions.filter((item) => item !== value),
    }));
  };

  const handleSubmit = async () => {
    const options = toSyncOptions(form);
    const store = getArgoApplicationStore();
    const actionLabel = form.dryRun ? "Dry run" : "Sync";
    const result = await runGuardedArgoMutation({
      risk: "low",
      actionLabel,
      resourceName: appName,
      run: () => syncApplication(store, application, options),
      successMessage: `${actionLabel} requested for ${appName}`,
      failureFallback: form.dryRun ? "Failed to start dry run." : "Failed to start sync.",
    });

    if (result === "success") {
      applicationSyncDialogStore.close();
    }
  };

  return (
    <Dialog isOpen={isOpen} close={() => applicationSyncDialogStore.close()}>
      <>
        <style>{stylesInline}</style>
        <div className={styles.dialogContent}>
          <h3 className={styles.dialogHeader}>Sync with options — {appName}</h3>

          {(showForceWarning || showPruneWarning || showReplaceWarning) && (
            <div className={styles.dialogSection}>
              {showForceWarning && (
                <div className={styles.dialogWarning}>Force may recreate resources on conflict.</div>
              )}
              {showPruneWarning && (
                <div className={styles.dialogWarning}>Prune will delete cluster resources no longer in Git.</div>
              )}
              {showReplaceWarning && (
                <div className={styles.dialogWarning}>Replace will recreate resources.</div>
              )}
            </div>
          )}

          <div className={styles.dialogSection}>
            <h4 className={styles.dialogSectionTitle}>Operation</h4>
            <Checkbox label="Prune" value={form.prune} onChange={(value) => setForm({ ...form, prune: value })} />
            <Checkbox label="Dry run" value={form.dryRun} onChange={(value) => setForm({ ...form, dryRun: value })} />
            <Checkbox label="Force" value={form.force} onChange={(value) => setForm({ ...form, force: value })} />
          </div>

          <div className={styles.dialogSection}>
            <h4 className={styles.dialogSectionTitle}>Sync strategy</h4>
            <div className={styles.strategyGroup}>
              <label className={styles.strategyOption}>
                <input
                  type="radio"
                  name="sync-strategy"
                  checked={form.syncStrategy === "hook"}
                  onChange={() => setForm({ ...form, syncStrategy: "hook" })}
                />
                Hook
              </label>
              <label className={styles.strategyOption}>
                <input
                  type="radio"
                  name="sync-strategy"
                  checked={form.syncStrategy === "apply"}
                  onChange={() => setForm({ ...form, syncStrategy: "apply" })}
                />
                Apply
              </label>
            </div>
          </div>

          <div className={styles.dialogSection}>
            <h4 className={styles.dialogSectionTitle}>Revision</h4>
            {multiSource ? (
              <div className={styles.dialogHelper}>
                Revision targeting for multi-source apps is not supported in v1.
              </div>
            ) : (
              <Input
                value={form.revision}
                onChange={(value) => setForm({ ...form, revision: value })}
                placeholder={revisionPlaceholder ?? "Use application spec revision"}
              />
            )}
          </div>

          <div className={styles.dialogSection}>
            <h4 className={styles.dialogSectionTitle}>Sync options</h4>
            <div className={styles.syncOptionsGroup}>
              {KNOWN_APPLICATION_SYNC_OPTIONS.map((option) => (
                <Checkbox
                  key={option.value}
                  label={option.label}
                  value={form.selectedSyncOptions.includes(option.value)}
                  onChange={(checked) => toggleSyncOption(option.value, checked)}
                />
              ))}
            </div>
          </div>

          {form.dryRun && <div className={styles.dialogHelper}>No changes will be applied.</div>}

          <div className={styles.dialogActions}>
            <Button onClick={() => applicationSyncDialogStore.close()}>Cancel</Button>
            <Button primary onClick={handleSubmit}>
              {form.dryRun ? "Dry run" : "Sync"}
            </Button>
          </div>
        </div>
      </>
    </Dialog>
  );
});
