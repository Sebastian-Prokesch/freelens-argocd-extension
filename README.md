# Freelens ArgoCD Extension

[![Freelens](https://img.shields.io/badge/freelens.app-02a7a0?style=flat-square)](https://www.freelens.app)
[![npm](https://img.shields.io/npm/v/@sebastian-prokesch/freelens-argocd-extension?style=flat-square)](https://www.npmjs.com/package/@sebastian-prokesch/freelens-argocd-extension)

This extension integrates Argo workloads into [Freelens](https://www.freelens.app), with cluster pages and resource details for ArgoCD and Argo Rollouts, plus early Argo Workflows support.

## Beta status

This project is in beta (`0.1.0-beta.3`).

- ArgoCD pages are available for Overview, Applications, ApplicationSets, AppProjects, and Config.
- Argo Rollouts pages and actions are available for common rollout operations.
- Argo Workflows pages are present, but still considered early and may evolve quickly.

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

Install from a release tarball (official beta distribution channel):

1. Download the latest `.tgz` from the [GitHub Releases page](https://github.com/Sebastian-Prokesch/freelens-argocd-extension/releases).
2. Open Freelens and go to Extensions (`ctrl`+`shift`+`E` or `cmd`+`shift`+`E`).
3. Load the downloaded tarball path, or drag and drop the `.tgz` into the Freelens window.

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

To add another Argo product:

1. Add route segments in [`src/renderer/routes/argo-routes.ts`](src/renderer/routes/argo-routes.ts).
2. Add Kubernetes resource types/stores under `src/renderer/k8s/<product>/`.
3. Add pages, details, and menu items under `src/renderer/pages/`, `src/renderer/details/`, and `src/renderer/menus/`.
4. Register cluster pages and sidebar entries in [`src/renderer/registration/cluster-registration.tsx`](src/renderer/registration/cluster-registration.tsx), and register related detail/menu items in [`src/renderer/index.tsx`](src/renderer/index.tsx).

## License

Copyright (c) 2026 Sebastian Prokesch.

[MIT License](https://opensource.org/licenses/MIT)
