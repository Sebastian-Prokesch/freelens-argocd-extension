import { isKubeNotFoundError, patchStatusSubresource } from "../kube-patch-transport";

const resourceApiUrl = "/apis/argoproj.io/v1alpha1/namespaces/ns/rollouts/demo";

function mockObject(partial: { getName?: () => string; getNs?: () => string | undefined } = {}) {
  return {
    getName: () => "demo",
    getNs: () => "ns",
    ...partial,
  };
}

describe("isKubeNotFoundError", () => {
  it("returns false for non-objects", () => {
    expect(isKubeNotFoundError(undefined)).toBe(false);
    expect(isKubeNotFoundError(null)).toBe(false);
    expect(isKubeNotFoundError("404")).toBe(false);
  });

  it("detects code 404", () => {
    expect(isKubeNotFoundError({ code: 404 })).toBe(true);
  });

  it("detects response.status 404", () => {
    expect(isKubeNotFoundError({ response: { status: 404 } })).toBe(true);
  });

  it("detects reason NotFound", () => {
    expect(isKubeNotFoundError({ reason: "NotFound" })).toBe(true);
  });

  it("detects cause.code 404", () => {
    expect(isKubeNotFoundError({ cause: { code: 404 } })).toBe(true);
  });

  it("returns false for other errors", () => {
    expect(isKubeNotFoundError({ code: 403 })).toBe(false);
    expect(isKubeNotFoundError(new Error("boom"))).toBe(false);
  });
});

describe("patchStatusSubresource", () => {
  it("patches /status with merge-patch content type and returns true", async () => {
    const requestPatch = jest.fn().mockResolvedValue({});
    const store = {
      api: {
        formatUrlForNotListing: jest.fn(() => resourceApiUrl),
        request: { patch: requestPatch },
      },
    };
    const object = mockObject();
    const data = { status: { abort: true } };

    await expect(patchStatusSubresource(store, object, data)).resolves.toBe(true);

    expect(store.api.formatUrlForNotListing).toHaveBeenCalledWith({
      namespace: "ns",
      name: "demo",
    });
    expect(requestPatch).toHaveBeenCalledWith(
      `${resourceApiUrl}/status`,
      { data },
      expect.objectContaining({
        headers: { "content-type": "application/merge-patch+json" },
      }),
    );
  });

  it("returns false when request.patch is missing", async () => {
    const store = {
      api: {
        formatUrlForNotListing: () => resourceApiUrl,
      },
    };

    await expect(patchStatusSubresource(store, mockObject(), { status: {} })).resolves.toBe(false);
  });

  it("returns false when formatUrlForNotListing is missing", async () => {
    const store = {
      api: {
        request: { patch: jest.fn() },
      },
    };

    await expect(patchStatusSubresource(store, mockObject(), { status: {} })).resolves.toBe(false);
  });

  it("returns false when object name is empty", async () => {
    const requestPatch = jest.fn();
    const store = {
      api: {
        formatUrlForNotListing: () => resourceApiUrl,
        request: { patch: requestPatch },
      },
    };

    await expect(patchStatusSubresource(store, mockObject({ getName: () => "" }), { status: {} })).resolves.toBe(false);
    expect(requestPatch).not.toHaveBeenCalled();
  });

  it("returns false when getName is missing", async () => {
    const requestPatch = jest.fn();
    const store = {
      api: {
        formatUrlForNotListing: () => resourceApiUrl,
        request: { patch: requestPatch },
      },
    };
    const object = { getNs: () => "ns" } as any;

    await expect(patchStatusSubresource(store, object, { status: {} })).resolves.toBe(false);
    expect(requestPatch).not.toHaveBeenCalled();
  });

  it("uses empty namespace string when getNs returns undefined", async () => {
    const requestPatch = jest.fn().mockResolvedValue({});
    const formatUrlForNotListing = jest.fn(() => resourceApiUrl);
    const store = {
      api: {
        formatUrlForNotListing,
        request: { patch: requestPatch },
      },
    };

    await expect(patchStatusSubresource(store, mockObject({ getNs: () => undefined }), { status: {} })).resolves.toBe(
      true,
    );

    expect(formatUrlForNotListing).toHaveBeenCalledWith({
      namespace: "",
      name: "demo",
    });
  });

  it("rethrows 404 errors from request.patch", async () => {
    const error = { code: 404 };
    const store = {
      api: {
        formatUrlForNotListing: () => resourceApiUrl,
        request: { patch: jest.fn().mockRejectedValueOnce(error) },
      },
    };

    await expect(patchStatusSubresource(store, mockObject(), { status: {} })).rejects.toEqual(error);
  });

  it("rethrows non-404 errors from request.patch", async () => {
    const error = { code: 403 };
    const store = {
      api: {
        formatUrlForNotListing: () => resourceApiUrl,
        request: { patch: jest.fn().mockRejectedValueOnce(error) },
      },
    };

    await expect(patchStatusSubresource(store, mockObject(), { status: {} })).rejects.toEqual(error);
  });
});
