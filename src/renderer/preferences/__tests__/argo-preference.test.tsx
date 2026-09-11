import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArgoPreferencesStore } from "../../../common/store";
import { ArgoPreferenceInput } from "../argo-preference";

jest.mock("../../argocd-api", () => {
  const actual = jest.requireActual("../../argocd-api");
  return {
    ...actual,
    getArgoCdApiClient: () => ({
      testConnection: jest.fn(async () => ({ username: "admin", version: "v3.5.0" })),
    }),
  };
});

describe("ArgoPreferenceInput", () => {
  beforeEach(() => {
    const preferences = ArgoPreferencesStore.getInstanceOrCreate<ArgoPreferencesStore>();
    preferences.fromStore({
      connectionMode: "cluster",
      apiConnections: [],
      activeApiConnectionId: "",
    });
  });

  it("creates a connection when Argo CD API mode is selected", async () => {
    const user = userEvent.setup();
    render(<ArgoPreferenceInput />);

    await user.click(screen.getByLabelText("Argo CD API (server URL + token)"));

    expect(screen.getByPlaceholderText("prod / staging / shared")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("https://argocd.example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Account or user JWT token")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add connection" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Test connection" })).toBeDisabled();
  });

  it("tests the selected Argo CD API connection", async () => {
    const user = userEvent.setup();
    const preferences = ArgoPreferencesStore.getInstanceOrCreate<ArgoPreferencesStore>();
    preferences.fromStore({
      connectionMode: "api",
      activeApiConnectionId: "c1",
      apiConnections: [
        {
          id: "c1",
          name: "prod",
          apiServerUrl: "https://argocd.example.com",
          apiToken: "token",
          insecureSkipTlsVerify: false,
          customCaPem: "",
          httpsProxy: "",
        },
      ],
    });

    render(<ArgoPreferenceInput />);

    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Test connection" }));
    });

    expect(await screen.findByTestId("argo-preference-test-message")).toHaveTextContent(
      "Authenticated as admin · Argo CD v3.5.0",
    );
  });
});
