import { Renderer } from "@freelensapp/extensions";
import { getMutationErrorMessage } from "../endpoints/mutation-errors";

export type MutationRisk = "low" | "destructive";

export type GuardedMutationResult = "cancelled" | "success" | "error";

export interface GuardedMutationConfirm {
  title: string;
  message: string;
}

export interface RunGuardedArgoMutationOptions {
  risk: MutationRisk;
  actionLabel: string;
  resourceName: string;
  run: () => Promise<void>;
  successMessage: string;
  failureFallback: string;
  confirm?: GuardedMutationConfirm;
}

const {
  Component: { ConfirmDialog, Notifications },
} = Renderer;

export async function runGuardedArgoMutation(options: RunGuardedArgoMutationOptions): Promise<GuardedMutationResult> {
  const { risk, run, successMessage, failureFallback, confirm } = options;

  if (risk === "destructive") {
    const isConfirmed = await ConfirmDialog.confirm({
      labelOk: confirm?.title ?? options.actionLabel,
      message:
        confirm?.message ?? `${options.actionLabel} ${options.resourceName}? This action has operational impact.`,
    });

    if (!isConfirmed) {
      return "cancelled";
    }
  }

  try {
    await run();
    Notifications.ok(successMessage);
    return "success";
  } catch (error) {
    Notifications.error(getMutationErrorMessage(error, failureFallback));
    return "error";
  }
}
