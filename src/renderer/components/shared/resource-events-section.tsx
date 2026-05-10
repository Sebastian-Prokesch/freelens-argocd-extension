import { Renderer } from "@freelensapp/extensions";

const {
  Component: { DrawerTitle, Events },
} = Renderer;

interface InvolvedObjectRef {
  uid?: string;
  name?: string;
  namespace?: string;
  kind?: string;
  apiVersion?: string;
}

export interface ResourceEventsSectionProps {
  resource: InvolvedObjectRef;
  title?: string;
  compactLimit?: number;
}

const normalizeValue = (value?: string): string | undefined => value?.trim().toLowerCase();

const valueMatches = (expected?: string, actual?: string): boolean => {
  if (!expected) {
    return true;
  }

  return normalizeValue(expected) === normalizeValue(actual);
};

export function matchesResourceEvent(resource: InvolvedObjectRef, event: Renderer.K8sApi.KubeEvent): boolean {
  const involvedObject = event?.involvedObject;
  if (!involvedObject) {
    return false;
  }

  const uid = normalizeValue(resource.uid);
  if (uid) {
    return uid === normalizeValue(involvedObject.uid);
  }

  return (
    valueMatches(resource.name, involvedObject.name) &&
    valueMatches(resource.namespace, involvedObject.namespace) &&
    valueMatches(resource.kind, involvedObject.kind) &&
    valueMatches(resource.apiVersion, involvedObject.apiVersion)
  );
}

export function filterEventsForResource(
  resource: InvolvedObjectRef,
  events: Renderer.K8sApi.KubeEvent[],
): Renderer.K8sApi.KubeEvent[] {
  return events.filter((event) => matchesResourceEvent(resource, event));
}

export function ResourceEventsSection({ resource, title = "Events", compactLimit = 200 }: ResourceEventsSectionProps) {
  return (
    <>
      <DrawerTitle>{title}</DrawerTitle>
      <Events
        compact
        hideFilters
        compactLimit={compactLimit}
        filterItems={[(events) => filterEventsForResource(resource, events)]}
      />
    </>
  );
}
