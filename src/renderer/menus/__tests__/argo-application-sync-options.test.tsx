import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { applicationSyncDialogStore } from "../../components/application-sync";
import { ArgoSyncWithOptionsMenuItem } from "../argo-application-sync-options";

const extension = { name: "argocd-test-extension" } as any;

describe("ArgoSyncWithOptionsMenuItem", () => {
  beforeEach(() => {
    applicationSyncDialogStore.close();
  });

  it("renders Adv sync action for application", () => {
    render(<ArgoSyncWithOptionsMenuItem object={{} as any} extension={extension} />);

    expect(screen.getByText("Adv sync")).toBeInTheDocument();
  });

  it("opens sync options dialog when clicked", async () => {
    const user = userEvent.setup();
    const object = {
      getName: () => "demo-app",
      spec: {
        source: { targetRevision: "main" },
        syncPolicy: {},
      },
    } as any;

    render(<ArgoSyncWithOptionsMenuItem object={object} extension={extension} />);

    await user.click(screen.getByText("Adv sync"));

    expect(applicationSyncDialogStore.isOpen).toBe(true);
    expect(applicationSyncDialogStore.application?.getName?.()).toBe("demo-app");
  });
});
