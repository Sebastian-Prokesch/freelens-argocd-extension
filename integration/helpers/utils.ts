import { readFileSync } from "node:fs";
import { join } from "node:path";

import { _electron as electron } from "playwright";

import type { ElectronApplication, Page } from "playwright";

export interface StartResult {
  app: ElectronApplication;
  window: Page;
  cleanup: () => Promise<void>;
}

function getFreelensExecutablePath(): string {
  const executablePath =
    process.env.FREELENS_EXECUTABLE_PATH || process.env.FREELENS_PATH || process.env.FREELENS_BINARY || "";

  if (!executablePath) {
    throw new Error(
      [
        "Missing Freelens executable path.",
        "Set one of:",
        "- FREELENS_EXECUTABLE_PATH",
        "- FREELENS_PATH",
        "- FREELENS_BINARY",
      ].join("\n"),
    );
  }

  return executablePath;
}

export async function start(): Promise<StartResult> {
  const executablePath = getFreelensExecutablePath();

  const app = await electron.launch({
    executablePath,
    args: [],
    env: {
      ...process.env,
    },
  });

  const firstWindow = await app.firstWindow();
  await firstWindow.waitForLoadState("domcontentloaded");

  // Freelens often shows a splash window first and then opens the real app in another window.
  let window: Page = firstWindow;

  if (firstWindow.url().includes("splash.html")) {
    try {
      const nextWindow = await app.waitForEvent("window", { timeout: 30_000 });
      await nextWindow.waitForLoadState("domcontentloaded");
      window = nextWindow;
    } catch {
      window = firstWindow;
    }
  }

  const cleanup = async () => {
    await app.close();
  };

  return { app, window, cleanup };
}

export async function clickWelcomeButton(window: Page): Promise<void> {
  // Best-effort: different Freelens versions have slightly different welcome flows.
  const candidates = [
    window.getByRole("button", { name: /get started/i }),
    window.getByRole("button", { name: /continue/i }),
    window.getByRole("button", { name: /close/i }),
  ];

  for (const candidate of candidates) {
    try {
      if (await candidate.isVisible({ timeout: 1000 })) {
        await candidate.click();
        return;
      }
    } catch {
      // ignore
    }
  }
}

export async function navigateToExtensionsPage(app: ElectronApplication): Promise<void> {
  await app.evaluate(async ({ app }) => {
    await app.applicationMenu
      ?.getMenuItemById(process.platform === "darwin" ? "mac" : "file")
      ?.submenu?.getMenuItemById("navigate-to-extensions")
      ?.click();
  });
}

export async function installExtension(window: Page, extensionPath: string): Promise<void> {
  const textbox = window.getByPlaceholder("Name or file path or URL");
  await textbox.waitFor({ state: "visible", timeout: 30_000 });
  await textbox.fill(extensionPath);

  const installButtonSelector = 'button[class*="Button install-module__button--"]';
  await window.click(`${installButtonSelector}[data-waiting=false]`, { timeout: 60_000 });
}

export async function closeNotifications(window: Page): Promise<void> {
  // Best-effort: ignore failures if selectors change.
  const selectors = [
    'i[data-testid*="close-notification-for-notification_"]',
    'div[class*="close-button-module__closeButton--"][aria-label="Close"]',
  ];

  for (const selector of selectors) {
    try {
      await window.click(selector, { timeout: 1500 });
    } catch {
      // ignore
    }
  }
}

export function getWorkspaceExtensionName(): string {
  const packageJsonPath = join(__dirname, "..", "..", "package.json");
  const raw = readFileSync(packageJsonPath, "utf8");
  const parsed = JSON.parse(raw) as { name?: string };

  if (!parsed.name) {
    throw new Error(`Could not read extension name from ${packageJsonPath}`);
  }

  return parsed.name;
}

export async function waitForExtensionInstalled(window: Page, extensionName: string): Promise<void> {
  const installedNameSelector = 'div[class*="installed-extensions-module__extensionName--"]';
  const enabledSelector = 'div[class*="installed-extensions-module__enabled--"]';

  await window.waitForSelector(installedNameSelector, { timeout: 60_000 });
  await window.getByText(extensionName, { exact: true }).waitFor({ state: "visible", timeout: 60_000 });
  await window.waitForSelector(enabledSelector, { timeout: 60_000 });
}

