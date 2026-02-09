import { argoConfigDialogStore } from "../argo-config-dialog-store";

const makeObject = (labels: Record<string, string>) => ({
  metadata: {
    name: "test",
    namespace: "argocd",
    labels,
  },
  getName: () => "test",
  getNs: () => "argocd",
});

describe("argoConfigDialogStore", () => {
  beforeEach(() => {
    argoConfigDialogStore.close();
  });

  it("opens create mode", () => {
    argoConfigDialogStore.openCreate("repository");

    expect(argoConfigDialogStore.isOpen).toBe(true);
    expect(argoConfigDialogStore.mode).toBe("create");
    expect(argoConfigDialogStore.target?.kind).toBe("repository");
  });

  it("opens edit for labeled secret", () => {
    const secret = makeObject({ "argocd.argoproj.io/secret-type": "cluster" });

    argoConfigDialogStore.openEdit(secret as any);

    expect(argoConfigDialogStore.isOpen).toBe(true);
    expect(argoConfigDialogStore.mode).toBe("edit");
    expect(argoConfigDialogStore.target?.kind).toBe("cluster");
  });

  it("opens edit for labeled configmap", () => {
    const configMap = makeObject({ "app.kubernetes.io/part-of": "argocd" });

    argoConfigDialogStore.openEdit(configMap as any);

    expect(argoConfigDialogStore.isOpen).toBe(true);
    expect(argoConfigDialogStore.target?.kind).toBe("configmap");
  });

  it("ignores edit for unrelated objects", () => {
    const other = makeObject({});

    argoConfigDialogStore.openEdit(other as any);

    expect(argoConfigDialogStore.isOpen).toBe(false);
    expect(argoConfigDialogStore.target).toBeNull();
  });
});

