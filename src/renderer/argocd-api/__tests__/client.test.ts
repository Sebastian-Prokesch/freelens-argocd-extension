import { ArgoCdApiClient } from "../client";
import { setArgoCdApiIpcInvoker } from "../transport";

import type { ArgoCdHttpResponse, ArgoCdIpcRequest } from "../../../common/argocd-api";

describe("ArgoCdApiClient", () => {
  afterEach(() => {
    setArgoCdApiIpcInvoker(undefined);
  });

  it("lists applications and maps them to kube-like objects", async () => {
    const requests: ArgoCdIpcRequest[] = [];
    setArgoCdApiIpcInvoker(async (_channel, request) => {
      requests.push(request);
      const response: ArgoCdHttpResponse = {
        status: 200,
        bodyText: JSON.stringify({
          items: [
            {
              metadata: { name: "demo", namespace: "argocd" },
              spec: { project: "default" },
              status: { sync: { status: "Synced" } },
            },
          ],
        }),
      };
      return response;
    });

    const client = new ArgoCdApiClient(() => ({ connectionId: "c1" }));

    const applications = await client.listApplications();

    expect(requests).toEqual([
      expect.objectContaining({
        method: "GET",
        path: "/api/v1/applications",
        connectionId: "c1",
      }),
    ]);
    expect(applications).toHaveLength(1);
    expect(applications[0]?.getName()).toBe("demo");
    expect(applications[0]?.spec?.project).toBe("default");
  });

  it("posts sync and refresh requests with appNamespace", async () => {
    const requests: ArgoCdIpcRequest[] = [];
    setArgoCdApiIpcInvoker(async (_channel, request) => {
      requests.push(request);
      return { status: 200, bodyText: "{}" };
    });

    const client = new ArgoCdApiClient(() => ({ connectionId: "c1" }));
    const application = {
      getName: () => "demo",
      getNs: () => "argocd",
      metadata: { name: "demo", namespace: "argocd" },
    } as any;

    await client.syncApplication(application, { prune: true, syncStrategy: "apply", force: true });
    await client.refreshApplication(application, "hard");
    await client.terminateApplicationOperation(application);
    await client.rollbackApplication(application, { id: 3, revision: "abc" });

    expect(requests.map((item) => `${item.method} ${item.path}`)).toEqual([
      "POST /api/v1/applications/demo/sync",
      "GET /api/v1/applications/demo",
      "DELETE /api/v1/applications/demo/operation",
      "POST /api/v1/applications/demo/rollback",
    ]);
    expect(requests[0]?.query).toEqual({ appNamespace: "argocd" });
    expect(requests[0]?.body).toEqual(
      expect.objectContaining({
        prune: true,
        strategy: { apply: { force: true } },
        appNamespace: "argocd",
      }),
    );
    expect(requests[1]?.query).toEqual({ appNamespace: "argocd", refresh: "hard" });
  });

  it("tests connection against /api/version", async () => {
    const requests: ArgoCdIpcRequest[] = [];
    setArgoCdApiIpcInvoker(async (_channel, request) => {
      requests.push(request);
      if (request.path === "/api/version") {
        return { status: 200, bodyText: JSON.stringify({ Version: "v2.9.5" }) };
      }
      if (request.path === "/api/v1/session/userinfo") {
        return { status: 200, bodyText: JSON.stringify({ username: "admin" }) };
      }
      return { status: 404, bodyText: "Not Found" };
    });

    const client = new ArgoCdApiClient(() => ({ connectionId: "c1" }));

    await expect(
      client.testConnection("c1"),
    ).resolves.toEqual({ version: "v2.9.5", username: "admin" });

    expect(requests[0]?.path).toBe("/api/version");
  });
});
