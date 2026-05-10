import { Renderer } from "@freelensapp/extensions";
import { StatusBadge } from "./status-badge";

const {
  Component: { DrawerItem, Table, TableCell, TableHead, TableRow, WithTooltip },
} = Renderer;

type ConditionValue = string | undefined;

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const asString = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

const defaultGetType = (condition: unknown): ConditionValue => asString(asRecord(condition).type);
const defaultGetStatus = (condition: unknown): ConditionValue => asString(asRecord(condition).status);
const defaultGetReason = (condition: unknown): ConditionValue => asString(asRecord(condition).reason);
const defaultGetMessage = (condition: unknown): ConditionValue => asString(asRecord(condition).message);
const defaultGetLastTransitionTime = (condition: unknown): ConditionValue =>
  asString(asRecord(condition).lastTransitionTime);

export interface ConditionsListProps<T = unknown> {
  conditions?: T[];
  mode?: "table" | "compact";
  tableId?: string;
  emptyText?: string;
  showReason?: boolean;
  showMessage?: boolean;
  showLastTransitionTime?: boolean;
  getType?: (condition: T) => ConditionValue;
  getStatus?: (condition: T) => ConditionValue;
  getReason?: (condition: T) => ConditionValue;
  getMessage?: (condition: T) => ConditionValue;
  getLastTransitionTime?: (condition: T) => ConditionValue;
}

export function ConditionsList<T = unknown>({
  conditions = [],
  mode = "table",
  tableId = "conditions",
  emptyText = "None",
  showReason = true,
  showMessage = true,
  showLastTransitionTime = false,
  getType = defaultGetType as (condition: T) => ConditionValue,
  getStatus = defaultGetStatus as (condition: T) => ConditionValue,
  getReason = defaultGetReason as (condition: T) => ConditionValue,
  getMessage = defaultGetMessage as (condition: T) => ConditionValue,
  getLastTransitionTime = defaultGetLastTransitionTime as (condition: T) => ConditionValue,
}: ConditionsListProps<T>) {
  if (conditions.length === 0) {
    return mode === "compact" ? <DrawerItem name="Summary">{emptyText}</DrawerItem> : <>{emptyText}</>;
  }

  if (mode === "compact") {
    return (
      <>
        {conditions.map((condition, index) => {
          const type = getType(condition) ?? `Condition ${index + 1}`;
          const status = getStatus(condition) ?? "Unknown";
          const reason = getReason(condition) ?? getMessage(condition) ?? "no details";

          return (
            <DrawerItem key={`${type}-${index}`} name={type}>
              <WithTooltip>
                <StatusBadge status={status} /> - {reason}
              </WithTooltip>
            </DrawerItem>
          );
        })}
      </>
    );
  }

  return (
    <Table tableId={tableId} scrollable={false} sortSyncWithUrl={false}>
      <TableHead flat sticky={false}>
        <TableCell>Type</TableCell>
        <TableCell>Status</TableCell>
        {showReason ? <TableCell>Reason</TableCell> : null}
        {showMessage ? <TableCell>Message</TableCell> : null}
        {showLastTransitionTime ? <TableCell>Last Transition</TableCell> : null}
      </TableHead>
      {conditions.map((condition, index) => (
        <TableRow key={`${getType(condition) ?? "condition"}-${index}`}>
          <TableCell>{getType(condition) ?? "Unknown"}</TableCell>
          <TableCell>
            <StatusBadge status={getStatus(condition)} />
          </TableCell>
          {showReason ? <TableCell>{getReason(condition) ?? "N/A"}</TableCell> : null}
          {showMessage ? <TableCell>{getMessage(condition) ?? "N/A"}</TableCell> : null}
          {showLastTransitionTime ? <TableCell>{getLastTransitionTime(condition) ?? "N/A"}</TableCell> : null}
        </TableRow>
      ))}
    </Table>
  );
}
