import {
  buildArgoCdRequestUrl,
  createArgoCdApiError,
  normalizeArgoCdServerUrl,
  normalizeCustomCaPem,
  normalizeHttpsProxyUrl,
  parseArgoCdErrorBody,
} from "../index";

describe("argocd-api url helpers", () => {
  it("normalizes server URLs and strips trailing slashes", () => {
    expect(normalizeArgoCdServerUrl("argocd.example.com")).toBe("https://argocd.example.com");
    expect(normalizeArgoCdServerUrl("https://argocd.example.com/")).toBe("https://argocd.example.com");
    expect(normalizeArgoCdServerUrl("http://localhost:8080/argo/")).toBe("http://localhost:8080/argo");
  });

  it("rejects empty or unsupported server URLs", () => {
    expect(() => normalizeArgoCdServerUrl("")).toThrow("required");
    expect(() => normalizeArgoCdServerUrl("ftp://argocd.example.com")).toThrow("http or https");
  });

  it("builds request URLs with query parameters", () => {
    const url = buildArgoCdRequestUrl("https://argocd.example.com", "/api/v1/applications/demo", {
      appNamespace: "argocd",
      refresh: "hard",
      unused: undefined,
    });

    expect(url.toString()).toBe("https://argocd.example.com/api/v1/applications/demo?appNamespace=argocd&refresh=hard");
  });

  it("normalizes optional HTTPS proxy URLs", () => {
    expect(normalizeHttpsProxyUrl("")).toBeUndefined();
    expect(normalizeHttpsProxyUrl("proxy.example.com:8080")).toBe("http://proxy.example.com:8080");
    expect(normalizeHttpsProxyUrl("http://user:pass@proxy:3128/")).toBe("http://user:pass@proxy:3128");
    expect(() => normalizeHttpsProxyUrl("ftp://proxy")).toThrow("http or https");
  });
});

describe("argocd-api errors", () => {
  it("parses message and error fields from JSON bodies", () => {
    expect(parseArgoCdErrorBody(JSON.stringify({ message: "token expired" }))).toBe("token expired");
    expect(parseArgoCdErrorBody(JSON.stringify({ error: "forbidden" }))).toBe("forbidden");
  });

  it("maps auth failures to a clear preference hint", () => {
    expect(createArgoCdApiError(401, "").message).toContain("rejected the token");
    expect(createArgoCdApiError(404, JSON.stringify({ message: "not found" })).message).toBe("not found");
  });
});

describe("argocd-api custom CA", () => {
  it("accepts PEM and rejects non-PEM input", () => {
    expect(normalizeCustomCaPem("  -----BEGIN CERTIFICATE-----\nX\n-----END CERTIFICATE-----  ")).toContain(
      "BEGIN CERTIFICATE",
    );
    expect(normalizeCustomCaPem("")).toBeUndefined();
    expect(() => normalizeCustomCaPem("not-a-cert")).toThrow("PEM");
  });
});
