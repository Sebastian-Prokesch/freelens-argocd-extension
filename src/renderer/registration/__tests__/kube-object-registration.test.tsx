import { createKubeObjectDetailRegistration, createKubeObjectMenuRegistration } from "../kube-object-registration";

describe("kube object registration helpers", () => {
  const extension = { name: "test-extension" } as any;

  it("creates detail registrations with extension injection", () => {
    const Details = ({ extension: currentExtension }: { extension: unknown }) => (
      <div data-testid="detail">{String(!!currentExtension)}</div>
    );

    const registration = createKubeObjectDetailRegistration({
      kind: "Application",
      apiVersions: ["argoproj.io/v1alpha1"],
      extension,
      Details: Details as any,
      priority: 25,
    });

    expect(registration.kind).toBe("Application");
    expect(registration.apiVersions).toEqual(["argoproj.io/v1alpha1"]);
    expect(registration.priority).toBe(25);

    const rendered = registration.components.Details({} as any) as any;
    expect(rendered.props.extension).toBe(extension);
  });

  it("creates menu registrations with extension injection", () => {
    const MenuItem = ({ extension: currentExtension }: { extension: unknown }) => (
      <div data-testid="menu">{String(!!currentExtension)}</div>
    );

    const registration = createKubeObjectMenuRegistration({
      kind: "Rollout",
      apiVersions: ["argoproj.io/v1alpha1"],
      extension,
      MenuItem: MenuItem as any,
    });

    expect(registration.kind).toBe("Rollout");
    expect(registration.apiVersions).toEqual(["argoproj.io/v1alpha1"]);

    const rendered = registration.components.MenuItem({} as any) as any;
    expect(rendered.props.extension).toBe(extension);
  });
});
