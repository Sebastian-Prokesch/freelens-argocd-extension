import { getAnalysisRunsForRollout } from "../related";

describe("rollout related analysis runs", () => {
  it("filters analysis runs by owner reference kind and uid", () => {
    const rollout = {
      metadata: { uid: "uid-1", name: "demo", namespace: "default" },
      getName: () => "demo",
      getNs: () => "default",
    };

    const runs = [
      {
        getNs: () => "default",
        metadata: {
          ownerReferences: [{ kind: "Rollout", uid: "uid-1", name: "demo" }],
        },
      },
      {
        getNs: () => "default",
        metadata: {
          ownerReferences: [{ kind: "ReplicaSet", uid: "rs-1", name: "demo-rs" }],
        },
      },
      {
        getNs: () => "other",
        metadata: {
          ownerReferences: [{ kind: "Rollout", uid: "uid-1", name: "demo" }],
        },
      },
    ] as any;

    const related = getAnalysisRunsForRollout(rollout, runs);

    expect(related).toHaveLength(1);
  });
});
