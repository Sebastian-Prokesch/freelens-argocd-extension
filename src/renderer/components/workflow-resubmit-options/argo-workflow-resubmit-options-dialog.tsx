import { Renderer } from "@freelensapp/extensions";
import React from "react";
import { getErrorMessage, getArgoWorkflowStore, requestWorkflowAction, type ResubmitWorkflowParameterOverride } from "../../k8s/workflows";
import { argoWorkflowResubmitOptionsDialogStore } from "./argo-workflow-resubmit-options-dialog-store";

const { observer } = global.MobxReact;

const {
  Component: { Button, Dialog, Input, Notifications },
} = Renderer;

function parseParameterOverrides(input: string): ResubmitWorkflowParameterOverride[] {
  const lines = input
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const overrides: ResubmitWorkflowParameterOverride[] = [];

  for (const line of lines) {
    const separatorIndex = line.indexOf("=");

    if (separatorIndex <= 0) {
      throw new Error(`Invalid parameter override "${line}". Use key=value format.`);
    }

    const name = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1);

    if (name.length === 0) {
      throw new Error(`Invalid parameter override "${line}". Parameter name is required.`);
    }

    overrides.push({ name, value });
  }

  return overrides;
}

export const ArgoWorkflowResubmitOptionsDialog = observer(() => {
  const { isOpen, target } = argoWorkflowResubmitOptionsDialogStore;
  const [parametersText, setParametersText] = React.useState("");
  const [error, setError] = React.useState<string | undefined>();
  const workflowStore = getArgoWorkflowStore();
  const workflow = target?.workflow;
  const workflowName = workflow?.getName?.() ?? workflow?.metadata?.name ?? "workflow";

  React.useEffect(() => {
    if (!isOpen) {
      setParametersText("");
      setError(undefined);
    }
  }, [isOpen]);

  if (!workflow) {
    return null;
  }

  const closeDialog = () => argoWorkflowResubmitOptionsDialogStore.close();

  const submitResubmitWithOverrides = async () => {
    try {
      setError(undefined);
      const parameterOverrides = parseParameterOverrides(parametersText);
      await requestWorkflowAction(workflowStore, workflow, "resubmit", { parameters: parameterOverrides });
      Notifications.ok(`Resubmit requested for ${workflowName}`);
      closeDialog();
    } catch (errorValue) {
      const message = getErrorMessage(errorValue, "Failed to resubmit workflow.");
      setError(message);
      Notifications.error(message);
    }
  };

  return (
    <Dialog isOpen={isOpen} close={closeDialog}>
      <div className="flex gaps column">
        <h3>Resubmit with options</h3>
        <p>Clone/create mode supports parameter overrides only.</p>
        {error ? <div>{error}</div> : null}
        <Input
          value={parametersText}
          onChange={(value) => setParametersText(value)}
          multiLine
          placeholder={"my-param=my-value\nanother-param=another-value"}
        />
        <div className="flex gaps">
          <Button onClick={closeDialog}>Cancel</Button>
          <Button primary onClick={submitResubmitWithOverrides}>
            Resubmit
          </Button>
        </div>
      </div>
    </Dialog>
  );
});
