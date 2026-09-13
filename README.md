# Freelens Argo Extension

[![Freelens](https://img.shields.io/badge/freelens.app-02a7a0?style=flat-square)](https://www.freelens.app)
[![npm](https://img.shields.io/npm/v/@sebastian-prokesch/freelens-argo-extension?style=flat-square)](https://www.npmjs.com/package/@sebastian-prokesch/freelens-argo-extension)
[![License](https://img.shields.io/github/license/Sebastian-Prokesch/freelens-argocd-extension?style=flat-square)](https://opensource.org/licenses/MIT)
[![CI](https://img.shields.io/github/actions/workflow/status/Sebastian-Prokesch/freelens-argocd-extension/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/Sebastian-Prokesch/freelens-argocd-extension/actions/workflows/ci.yml)

Bring your Argo workloads into [Freelens](https://www.freelens.app). This extension adds a dedicated **Argo** section to the cluster sidebar with pages, detail views, and actions for **ArgoCD** and **Argo Rollouts**, plus early support for **Argo Workflows** — so you can monitor application health, sync state, and rollout progress without leaving your Kubernetes IDE.

## Screenshots

### ArgoCD Overview

Application health and sync status at a glance, alongside recent cluster events:

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/ArgoCD-Overview.png">
  <source media="(prefers-color-scheme: light)" srcset="docs/screenshots/ArgoCD-Overview-light.png">
  <img alt="ArgoCD Overview page in Freelens showing application health and sync status donut charts, summary cards, and recent cluster events" src="docs/screenshots/ArgoCD-Overview-light.png">
</picture>

### Rollout actions

Manage rollouts directly from the list — promote, abort, or edit paused canary and blue-green deployments:

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/ArgoRollouts-Promote.png">
  <source media="(prefers-color-scheme: light)" srcset="docs/screenshots/ArgoRollouts-Promote-light.png">
  <img alt="Argo Rollouts list in Freelens with the context menu open on a paused canary rollout, offering Promote, Promote full, and Abort actions" src="docs/screenshots/ArgoRollouts-Promote-light.png">
</picture>

## Features

- Argo sidebar hub with grouped sections for ArgoCD, Argo Workflows, and Argo Rollouts.
- ArgoCD overview and list pages for `Application`, `ApplicationSet`, and `AppProject`, plus a Config page for Argo ConfigMaps and Secrets.
- Optional **Argo CD API** connection in Preferences — save one or more named Argo CD servers and switch the active one — so Applications / AppProjects / ApplicationSets / Overview and sync actions can work against a remote Argo CD instead of relying on CRDs in the current cluster.
- Argo Rollouts pages for `Rollout`, `AnalysisRun`, `Experiment`, `AnalysisTemplate`, and `ClusterAnalysisTemplate`.
- Argo Workflows pages for `Workflow`, `CronWorkflow`, `WorkflowTemplate`, and `ClusterWorkflowTemplate` (read-only; no lifecycle actions yet).
- Resource detail drawers with diagnostics: sync/health status, Drift Hotspots, operation timeline, resource diff, and Sync History with rollback (when auto-sync is disabled).
- Application details Sync Policy toggle: Automated sync (and Prune / Self Heal / Allow Empty), like the Argo CD web UI.
- Context-menu actions:
  - ArgoCD: refresh, hard refresh, sync, sync with options (adv sync), and terminate (while an operation is running).
  - Rollouts: promote, promote full, promote skip current, promote skip all, abort, retry.
  - Argo config helpers for `Secret` and `ConfigMap`.

All resources are served from the `argoproj.io/v1alpha1` API group when using the current cluster. In Argo CD API mode, Application / ApplicationSet / AppProject data comes from the Argo CD HTTP API instead.

## Status and known limitations

ArgoCD and Argo Rollouts pages and actions are stable for day-to-day use. Argo Workflows pages are present but still early and may evolve quickly. Feature behavior depends on your cluster RBAC and installed resource schemas — see the [CHANGELOG](CHANGELOG.md) for release history.

Known limitations:

- Argo Workflows pages are read-only — there are no submit, retry, or terminate actions yet.
- The Config page (ConfigMaps/Secrets) always stays cluster-backed, even in Argo CD API mode — repositories and cluster secrets are not manageable via the Argo CD API yet.
- Resource diff and the resource-relationship view are CRD-only summaries today; there is no API-backed line-level diff or resource-tree view yet.
- Testing repository or cluster secrets from the Config UI (the way Argo CD's own UI can) isn't implemented yet — only the extension's own Argo CD API connection has a **Test connection** action.

## Requirements

- Freelens `^1.9.0`
- Kubernetes >= 1.32
- The cluster must have the Argo APIs you want to manage installed (Argo CD for Applications; Rollouts and Workflows only if those controllers are present).
- Argo CD `3.4` and `3.5` are the versions this extension is validated against (see [dev-cluster](dev-cluster/README.md), pinned to chart `10.3.0` / app `v3.5.0`). Argo CD 3.5's Helm 4 OCI flags (`enableOCI`, `insecureOCIForceHttp`) are supported in the Config page's repository secret details, including a warning when `insecure` and `insecureOCIForceHttp` conflict. Other versions likely work but aren't actively tested.

## Install

### From npm

1. Open Freelens and go to **Extensions** (`Ctrl`+`Shift`+`E` or `Cmd`+`Shift`+`E`).
2. Enter the package name in the install field: `@sebastian-prokesch/freelens-argo-extension`

See the package on [npm](https://www.npmjs.com/package/@sebastian-prokesch/freelens-argo-extension).

### From GitHub release

1. Download the latest `.tgz` from the [GitHub Releases](https://github.com/Sebastian-Prokesch/freelens-argocd-extension/releases) page.
2. Open Freelens → **Extensions** (`Ctrl`+`Shift`+`E` or `Cmd`+`Shift`+`E`).
3. Load the tarball path, or drag and drop the `.tgz` into the Freelens window.

## Security and permissions

- Mutating actions (sync, promote, config edits) run with your current cluster identity and are limited by Kubernetes RBAC — prefer read-only permissions where mutation is not required.
- When using **Argo CD API** mode, mutations use the configured bearer token instead of Kubernetes RBAC. Prefer least-privilege account tokens. The token is stored locally in Freelens extension settings.
- Secret updates are submitted through Kubernetes `stringData`; grant edit access only to trusted operators.

## Argo CD API connection

By default the extension reads Argo CD CRDs from the active Kubernetes cluster. To talk to one or more remote Argo CD servers instead:

1. Open Freelens **Preferences** (`Ctrl+,` / `Cmd+,`).
2. Open **Argo CD Connection**.
3. Choose **Argo CD API (server URL + token)**.
4. Use **Add connection** to save each Argo CD server (name, URL, token, optional Custom CA).
5. Click a connection in the list to select it — that connection is the active one for ArgoCD pages.
6. Optionally set **HTTPS proxy** per connection if Argo CD is only reachable through a corporate proxy.
7. Prefer **Custom CA certificate (PEM)** for corporate TLS: paste the issuing/root CA PEM so verification stays on. The same connection form also has a **Skip TLS certificate verification** checkbox — use it only as a last resort, since it disables certificate validation entirely.
8. Click **Test connection**, then open an ArgoCD page in any cluster frame.

With multiple connections, the ArgoCD page banner also has a dropdown to switch the active server without opening Preferences.

### Trusting a corporate CA

Freelens/Node often does not use the macOS Keychain trust store.

1. Open **Keychain Access** → search for `Foo Bar Issuing`.
2. Export the certificate as `.pem` / `.cer` (PEM text).
3. Paste the full `-----BEGIN CERTIFICATE-----` … block into **Custom CA certificate** in Preferences.
4. Leave **Skip TLS** unchecked and run **Test connection**.

In API mode, Applications, ApplicationSets, AppProjects, and Overview come from the Argo CD API. Sync, refresh, terminate, and rollback use the API as well. Config, Rollouts, and Workflows remain cluster-backed.

## Build from source

Requires Node.js >= 24 (see [`.nvmrc`](.nvmrc)) and pnpm `11.15.1` (pinned via `packageManager` in [`package.json`](package.json)).

```sh
corepack install
pnpm i
pnpm build
pnpm pack
```

`corepack install` reads the `packageManager` pin and installs the exact pnpm version; run `nvm use` first if you manage Node versions with nvm.

The tarball is generated in the project root. In Freelens, open Extensions and provide the tarball path, or drag and drop the `.tgz` into the Freelens window.

For checks, tests, and PR expectations see [CONTRIBUTING.md](CONTRIBUTING.md). A local Kind-based demo cluster with Argo CD, Rollouts, and Workflows preinstalled is available under [dev-cluster](dev-cluster/README.md).

### Integration tests

`pnpm test:integration` runs a smoke test that installs the extension into a real Freelens build and checks that the ArgoCD Overview page renders. It requires two environment variables:

- One of `FREELENS_EXECUTABLE_PATH`, `FREELENS_PATH`, or `FREELENS_BINARY` — path to a Freelens executable.
- `EXTENSION_PATH` — path to the built extension (e.g. the `.tgz` from `pnpm pack`, or the `out/` directory).

If either is missing, the test is skipped silently (`it.skip`) rather than failing — this is expected when running locally without a Freelens build available. CI does not currently run integration tests; they're a local/manual verification step only.

## Contributing

Contributions are welcome.

- **Bug reports and ideas** — open an [issue](https://github.com/Sebastian-Prokesch/freelens-argocd-extension/issues) with steps to reproduce, expected behavior, and your Freelens/Kubernetes setup when relevant.
- **Code changes** — open a [pull request](https://github.com/Sebastian-Prokesch/freelens-argocd-extension/pulls) against `main` with a short description of what changed and why. For larger changes, open an issue first so we can align on approach.

See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup and verification steps, and the [CHANGELOG](CHANGELOG.md) for release history.

## AI assistance

Parts of this extension were developed with help from an AI coding assistant. All changes are reviewed and maintained by the project authors.

## License

Copyright (c) 2026 Freelens Authors & Sebastian Prokesch.

[MIT License](https://opensource.org/licenses/MIT)
