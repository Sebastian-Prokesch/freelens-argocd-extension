# Freelens ArgoCD Extension

[![Freelens](https://img.shields.io/badge/freelens.app-02a7a0?style=flat-square)](https://www.freelens.app)
[![npm](https://img.shields.io/npm/v/@sebastian-prokesch/freelens-argo-extension?style=flat-square)](https://www.npmjs.com/package/@sebastian-prokesch/freelens-argo-extension)

This extension integrates Argo workloads into [Freelens](https://www.freelens.app), with cluster pages and resource details for ArgoCD and Argo Rollouts, plus early Argo Workflows support.

## Status

Current release: **`0.1.0`** (first stable public release).

- ArgoCD pages are available for Overview, Applications, ApplicationSets, AppProjects, and Config.
- Argo Rollouts pages and actions are available for common rollout operations.
- Argo Workflows pages are present, but still considered early and may evolve quickly.

Pre-release builds remain available on npm as `@sebastian-prokesch/freelens-argo-extension@next`.

### Known limitations

- Workflows pages exist, but workflows-specific UX is still in active iteration.
- Config editing targets known Argo ConfigMaps and Argo-labeled Secrets.
- Feature behavior depends on cluster RBAC and resource schemas.

## Features

- Argo sidebar hub with grouped sections for ArgoCD, Argo Workflows, and Argo Rollouts.
- ArgoCD overview and list pages for `Application`, `ApplicationSet`, and `AppProject`.
- Argo Rollouts pages for `Rollout`, `AnalysisRun`, `Experiment`, `AnalysisTemplate`, and `ClusterAnalysisTemplate`.
- Argo Workflows pages for `Workflow`, `CronWorkflow`, `WorkflowTemplate`, and `ClusterWorkflowTemplate`.
- Resource detail drawers for ArgoCD, Rollouts, and Workflows kinds.
- Context-menu actions:
  - ArgoCD: sync and terminate.
  - Rollouts: promote, promote full, promote skip current, promote skip all, abort, retry.
  - Argo config helpers for `Secret` and `ConfigMap`.

## Requirements

- Kubernetes >= 1.32
- Freelens `^1.9.0`
- Node.js >= 22.16.0 (development/build workflows)
- pnpm 11.x (`packageManager`: `pnpm@11.1.1`)

## Install

### From npm

1. Open Freelens and go to **Extensions** (`Ctrl`+`Shift`+`E` or `Cmd`+`Shift`+`E`).
2. Enter the package name in the install field:
   - **Stable:** `@sebastian-prokesch/freelens-argo-extension`
   - **Pre-release:** `@sebastian-prokesch/freelens-argo-extension@next`

See the package on [npm](https://www.npmjs.com/package/@sebastian-prokesch/freelens-argo-extension).

### From GitHub release

1. Download the latest `.tgz` from the [GitHub Releases](https://github.com/Sebastian-Prokesch/freelens-argocd-extension/releases) page.
2. Open Freelens → **Extensions** (`Ctrl`+`Shift`+`E` or `Cmd`+`Shift`+`E`).
3. Load the tarball path, or drag and drop the `.tgz` into the Freelens window.

## Supported APIs and resources

- `argoproj.io/v1alpha1`
  - ArgoCD: `Application`, `ApplicationSet`, `AppProject`
  - Argo Rollouts: `Rollout`, `AnalysisRun`, `Experiment`, `AnalysisTemplate`, `ClusterAnalysisTemplate`
  - Argo Workflows: `Workflow`, `CronWorkflow`, `WorkflowTemplate`, `ClusterWorkflowTemplate`

## Navigation and routes

The sidebar shows a top-level **Argo** entry.

| Area | Cluster page routes |
| --- | --- |
| Landing (hub) | `/argo` |
| ArgoCD | `/argo/argocd`, `/argo/argocd/overview`, `/argo/argocd/applications`, `/argo/argocd/applicationsets`, `/argo/argocd/appprojects`, `/argo/argocd/config` |
| Argo Workflows | `/argo/workflows`, `/argo/workflows/cron-workflows`, `/argo/workflows/workflow-templates`, `/argo/workflows/cluster-workflow-templates` |
| Argo Rollouts | `/argo/rollouts/overview`, `/argo/rollouts`, `/argo/rollouts/analysis-runs`, `/argo/rollouts/experiments`, `/argo/rollouts/analysis-templates`, `/argo/rollouts/cluster-analysis-templates` |

Backward compatibility: legacy `/argocd/*` routes are still registered (`/argocd`, `/argocd/overview`, `/argocd/applications`, `/argocd/applicationsets`, `/argocd/appprojects`, `/argocd/config`) so old bookmarks and deep links continue to work.

## Security and permissions

- Mutating actions run with your current cluster identity and are limited by Kubernetes RBAC.
- Secret updates are submitted through Kubernetes `stringData`; grant edit access only to trusted operators.
- Prefer read-only permissions where mutation is not required.

## Build from source

### Prerequisites

- Node.js >= 22.16.0
- pnpm (Corepack recommended)

```sh
corepack install
pnpm i
```

### Build extension tarball

```sh
pnpm build
pnpm pack
```

### Install built extension in Freelens

The tarball is generated in the project root. In Freelens, open Extensions and provide the tarball path, or drag and drop the `.tgz` into the Freelens window.

### Static checks

```sh
pnpm type:check
pnpm lint:check
```

### Testing

```sh
pnpm test
# or
pnpm test:unit
pnpm test:watch
```

Integration smoke test:

```sh
pnpm test:integration
```

The integration smoke test uses Playwright to launch Freelens, install the extension, and validate rendering of the ArgoCD overview page when a cluster context is available.

Set environment variables before running integration tests:

```sh
# path to the built extension tarball (.tgz)
export EXTENSION_PATH="/absolute/path/to/<your-extension>.tgz"

# path to the Freelens executable (macOS example)
export FREELENS_EXECUTABLE_PATH="/Applications/Freelens.app/Contents/MacOS/Freelens"
```

## Contributing

Contributions are welcome.

- **Bug reports and ideas** — open an [issue](https://github.com/Sebastian-Prokesch/freelens-argocd-extension/issues) with steps to reproduce, expected behavior, and your Freelens/Kubernetes setup when relevant.
- **Code changes** — open a [pull request](https://github.com/Sebastian-Prokesch/freelens-argocd-extension/pulls) against `main` with a short description of what changed and why. For larger changes, open an issue first so we can align on approach.

If you are developing locally, see [Build from source](#build-from-source) for setup, checks, and tests.

## License

Copyright (c) 2026 Freelens Authors & Sebastian Prokesch.

[MIT License](https://opensource.org/licenses/MIT)
