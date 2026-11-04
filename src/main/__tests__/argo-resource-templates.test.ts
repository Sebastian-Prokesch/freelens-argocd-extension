const accessMock = vi.fn();
const mkdirMock = vi.fn();
const writeFileMock = vi.fn();

vi.mock("node:fs/promises", () => ({
  access: (...args: any[]) => accessMock(...args),
  mkdir: (...args: any[]) => mkdirMock(...args),
  writeFile: (...args: any[]) => writeFileMock(...args),
}));

vi.mock("node:os", () => ({
  homedir: () => "/home/tester",
}));

import { ensureArgoResourceTemplates } from "../argo-resource-templates";

describe("ensureArgoResourceTemplates", () => {
  beforeEach(() => {
    accessMock.mockReset();
    mkdirMock.mockReset();
    writeFileMock.mockReset();
    mkdirMock.mockResolvedValue(undefined);
    writeFileMock.mockResolvedValue(undefined);
  });

  it("creates templates directory and writes missing template files", async () => {
    accessMock.mockRejectedValue(new Error("not found"));

    await ensureArgoResourceTemplates();

    expect(mkdirMock).toHaveBeenCalledWith("/home/tester/.freelens/templates/argocd", { recursive: true });
    expect(writeFileMock).toHaveBeenCalled();
  });

  it("keeps existing template files untouched", async () => {
    accessMock.mockResolvedValue(undefined);

    await ensureArgoResourceTemplates();

    expect(writeFileMock).not.toHaveBeenCalled();
  });
});
