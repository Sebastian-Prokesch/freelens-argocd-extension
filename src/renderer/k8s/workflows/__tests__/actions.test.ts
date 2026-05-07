import {
  canResubmitWorkflow,
  canResumeCronWorkflow,
  canResumeWorkflow,
  canRetryWorkflow,
  canSuspendCronWorkflow,
  canSuspendWorkflow,
  canTerminateWorkflow,
  getResumeCronWorkflowPatch,
  getResumeWorkflowPatch,
  getSuspendCronWorkflowPatch,
  getSuspendWorkflowPatch,
  getTerminateWorkflowPatch,
  requestWorkflowAction,
} from "../actions";

describe("workflow action helpers", () => {
  it("returns merge patch payloads for workflow actions", () => {
    expect(getSuspendWorkflowPatch()).toEqual({ spec: { suspend: true } });
    expect(getResumeWorkflowPatch()).toEqual({ spec: { suspend: false } });
    expect(getTerminateWorkflowPatch()).toEqual({ spec: { shutdown: "Terminate" } });
  });

  it("returns merge patch payloads for cron workflow actions", () => {
    expect(getSuspendCronWorkflowPatch()).toEqual({ spec: { suspend: true } });
    expect(getResumeCronWorkflowPatch()).toEqual({ spec: { suspend: false } });
  });

  it("derives workflow action visibility from phase and suspend flag", () => {
    expect(canSuspendWorkflow({ spec: { suspend: false }, status: { phase: "Running" } } as any)).toBe(true);
    expect(canResumeWorkflow({ spec: { suspend: true } } as any)).toBe(true);
    expect(canTerminateWorkflow({ status: { phase: "Running" } } as any)).toBe(true);
    expect(canRetryWorkflow({ status: { phase: "Failed" } } as any)).toBe(true);
    expect(canResubmitWorkflow({ status: { phase: "Succeeded" }, spec: { suspend: false } } as any)).toBe(true);
  });

  it.each([
    [{ status: { phase: "Running" }, spec: { suspend: false } }, false],
    [{ status: { phase: "Pending" }, spec: { suspend: false } }, false],
    [{ status: { phase: "Succeeded" }, spec: { suspend: false } }, true],
    [{ status: { phase: "Failed" }, spec: { suspend: false } }, true],
    [{ status: { phase: "Error" }, spec: { suspend: false } }, true],
    [{ status: {}, spec: { suspend: false } }, false],
    [{ status: { phase: "Succeeded" }, spec: { suspend: true } }, false],
  ])("calculates resubmit visibility for %j", (workflow, expected) => {
    expect(canResubmitWorkflow(workflow as any)).toBe(expected);
  });

  it("derives cron workflow action visibility from suspend flag", () => {
    expect(canSuspendCronWorkflow({ spec: { suspend: false } } as any)).toBe(true);
    expect(canResumeCronWorkflow({ spec: { suspend: true } } as any)).toBe(true);
  });

  it("requests workflow action through put api client when available", async () => {
    const put = jest.fn().mockResolvedValue({});
    const post = jest.fn().mockResolvedValue({});
    const store = {
      api: {
        formatUrlForNotListing: ({ namespace, name }: { namespace: string; name: string }) =>
          `/apis/argoproj.io/v1alpha1/namespaces/${namespace}/workflows/${name}`,
        request: { put, post },
      },
    };
    const workflow = {
      getName: () => "demo",
      getNs: () => "argocd",
    };

    await requestWorkflowAction(store as any, workflow as any, "retry");

    expect(put).toHaveBeenCalledWith("/apis/argoproj.io/v1alpha1/namespaces/argocd/workflows/demo/retry", {
      data: {},
    });
    expect(post).not.toHaveBeenCalled();
  });

  it("creates a new workflow object when resubmitting", async () => {
    const create = jest.fn().mockResolvedValue({});
    const store = {
      create,
      api: {
        formatUrlForNotListing: ({ namespace, name }: { namespace: string; name: string }) =>
          `/apis/argoproj.io/v1alpha1/namespaces/${namespace}/workflows/${name}`,
      },
    };
    const workflow = {
      getName: () => "demo",
      getNs: () => "argocd",
      metadata: {
        name: "demo",
        namespace: "argocd",
        labels: {
          env: "test",
        },
      },
      spec: {
        entrypoint: "main",
      },
    };

    await requestWorkflowAction(store as any, workflow as any, "resubmit");

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(
      {
        namespace: "argocd",
        name: expect.stringMatching(/^demo-[a-z0-9]+$/),
      },
      expect.objectContaining({
        apiVersion: "argoproj.io/v1alpha1",
        kind: "Workflow",
        metadata: expect.objectContaining({
          namespace: "argocd",
          name: expect.stringMatching(/^demo-[a-z0-9]+$/),
          labels: expect.objectContaining({
            env: "test",
            "workflows.argoproj.io/completed": "false",
          }),
        }),
        spec: {
          entrypoint: "main",
        },
      }),
    );
  });

  it("merges parameter overrides into cloned workflow spec", async () => {
    const create = jest.fn().mockResolvedValue({});
    const store = {
      create,
      api: {
        formatUrlForNotListing: ({ namespace, name }: { namespace: string; name: string }) =>
          `/apis/argoproj.io/v1alpha1/namespaces/${namespace}/workflows/${name}`,
      },
    };
    const workflow = {
      getName: () => "demo",
      getNs: () => "argocd",
      metadata: {
        name: "demo",
        namespace: "argocd",
      },
      spec: {
        entrypoint: "main",
        arguments: {
          parameters: [
            { name: "existing", value: "old" },
            { name: "kept", value: "value" },
          ],
        },
      },
    };

    await requestWorkflowAction(store as any, workflow as any, "resubmit", {
      parameters: [
        { name: "existing", value: "new" },
        { name: "added", value: "fresh" },
      ],
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        namespace: "argocd",
      }),
      expect.objectContaining({
        spec: expect.objectContaining({
          arguments: expect.objectContaining({
            parameters: expect.arrayContaining([
              expect.objectContaining({ name: "existing", value: "new" }),
              expect.objectContaining({ name: "kept", value: "value" }),
              expect.objectContaining({ name: "added", value: "fresh" }),
            ]),
          }),
        }),
      }),
    );
  });

  it("deduplicates newly-added override names when the same key is repeated", async () => {
    const create = jest.fn().mockResolvedValue({});
    const store = {
      create,
      api: {
        formatUrlForNotListing: ({ namespace, name }: { namespace: string; name: string }) =>
          `/apis/argoproj.io/v1alpha1/namespaces/${namespace}/workflows/${name}`,
      },
    };
    const workflow = {
      getName: () => "demo",
      getNs: () => "argocd",
      metadata: {
        name: "demo",
        namespace: "argocd",
      },
      spec: {
        entrypoint: "main",
      },
    };

    await requestWorkflowAction(store as any, workflow as any, "resubmit", {
      parameters: [
        { name: "dup", value: "first" },
        { name: "dup", value: "second" },
      ],
    });

    expect(create).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        spec: expect.objectContaining({
          arguments: expect.objectContaining({
            parameters: [expect.objectContaining({ name: "dup", value: "first" })],
          }),
        }),
      }),
    );
  });

  it("creates arguments.parameters when override is provided on workflow without arguments", async () => {
    const create = jest.fn().mockResolvedValue({});
    const store = {
      create,
      api: {
        formatUrlForNotListing: ({ namespace, name }: { namespace: string; name: string }) =>
          `/apis/argoproj.io/v1alpha1/namespaces/${namespace}/workflows/${name}`,
      },
    };
    const workflow = {
      getName: () => "demo",
      getNs: () => "argocd",
      metadata: {
        name: "demo",
        namespace: "argocd",
      },
      spec: {
        entrypoint: "main",
      },
    };

    await requestWorkflowAction(store as any, workflow as any, "resubmit", {
      parameters: [{ name: "new-param", value: "new-value" }],
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        namespace: "argocd",
      }),
      expect.objectContaining({
        spec: expect.objectContaining({
          arguments: expect.objectContaining({
            parameters: [expect.objectContaining({ name: "new-param", value: "new-value" })],
          }),
        }),
      }),
    );
  });

  it("does not carry shutdown terminate flag into resubmitted workflow spec", async () => {
    const create = jest.fn().mockResolvedValue({});
    const store = {
      create,
      api: {
        formatUrlForNotListing: ({ namespace, name }: { namespace: string; name: string }) =>
          `/apis/argoproj.io/v1alpha1/namespaces/${namespace}/workflows/${name}`,
      },
    };
    const workflow = {
      getName: () => "terminated-workflow",
      getNs: () => "argocd",
      metadata: {
        name: "terminated-workflow",
        namespace: "argocd",
      },
      spec: {
        entrypoint: "main",
        shutdown: "Terminate",
      },
    };

    await requestWorkflowAction(store as any, workflow as any, "resubmit");

    expect(create).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        spec: expect.objectContaining({
          entrypoint: "main",
        }),
      }),
    );
    expect(create.mock.calls[0]?.[1]?.spec?.shutdown).toBeUndefined();
  });

  it("falls back to post when put is unavailable", async () => {
    const post = jest.fn().mockResolvedValue({});
    const store = {
      api: {
        formatUrlForNotListing: ({ namespace, name }: { namespace: string; name: string }) =>
          `/apis/argoproj.io/v1alpha1/namespaces/${namespace}/workflows/${name}`,
        request: { post },
      },
    };
    const workflow = {
      getName: () => "demo",
      getNs: () => "argocd",
    };

    await requestWorkflowAction(store as any, workflow as any, "retry");

    expect(post).toHaveBeenCalledWith("/apis/argoproj.io/v1alpha1/namespaces/argocd/workflows/demo/retry", {
      data: {},
    });
  });

  it("falls back to post when put reports unsupported method", async () => {
    const put = jest.fn().mockRejectedValue({ code: 405 });
    const post = jest.fn().mockResolvedValue({});
    const store = {
      api: {
        formatUrlForNotListing: ({ namespace, name }: { namespace: string; name: string }) =>
          `/apis/argoproj.io/v1alpha1/namespaces/${namespace}/workflows/${name}`,
        request: { put, post },
      },
    };
    const workflow = {
      getName: () => "demo",
      getNs: () => "argocd",
    };

    await requestWorkflowAction(store as any, workflow as any, "retry");

    expect(put).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith("/apis/argoproj.io/v1alpha1/namespaces/argocd/workflows/demo/retry", {
      data: {},
    });
  });

  it("throws when workflow action transport is unavailable", async () => {
    const store = {
      api: {
        formatUrlForNotListing: ({ namespace, name }: { namespace: string; name: string }) =>
          `/apis/argoproj.io/v1alpha1/namespaces/${namespace}/workflows/${name}`,
      },
    };
    const workflow = {
      getName: () => "demo",
      getNs: () => "argocd",
    };

    await expect(requestWorkflowAction(store as any, workflow as any, "resubmit")).rejects.toThrow(
      "Workflow resubmit is not supported by this cluster API client.",
    );
  });
});
