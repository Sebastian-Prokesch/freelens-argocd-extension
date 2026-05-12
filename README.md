# Freelens ArgoCD Extension

Freelens extension that adds **Argo** cluster pages: **ArgoCD** views for GitOps workflows (overview, applications, AppProjects, config), **Argo Rollouts** listing and Rollout details, plus placeholder pages for **Argo Workflows** (full UI planned in a later phase).

## Requirements

- Kubernetes >= 1.32
- Freelens >= 1.9.0

## Beta Release

### Beta scope

- ArgoCD pages: Overview, Applications, ApplicationSets, AppProjects, and Config.
- Argo Rollouts: list page and Rollout details.
- Argo Workflows routes are placeholder pages only in this beta.

### Known limitations

- Workflows UI is intentionally incomplete and will be expanded after beta feedback.
- Config editing is focused on known ArgoCD ConfigMaps and Argo-labeled secrets.
- Behavior still depends on cluster RBAC and resource schema quality.

### Compatibility

- Tested with Freelens `>=1.9.0`.
- Tested against Kubernetes `>=1.32`.
- Node.js `>=22.16.0` is required for local build/test workflows.

### Security and permissions notes

- Mutating actions (sync, terminate, rollout actions, config/secret updates) execute with your current cluster identity and are limited by your RBAC permissions.
- Secret values are submitted via Kubernetes `stringData` and should only be edited by trusted operators.
- Avoid granting broad write access where read-only access is sufficient for your users.

### Beta install and upgrade

Install from the Extensions catalog (`@sebastian-prokesch/freelens-argocd-extension`) or from a local tarball:

```sh
pnpm build
pnpm pack
```

Then load the generated `.tgz` in Freelens Extensions.

### Beta release checklist

```sh
pnpm type:check
pnpm lint:check
pnpm test:unit
pnpm test:integration
pnpm security:check
```

If config editor behavior changes, verify invalid ConfigMap JSON/value types are rejected in the UI before release.

## Supported ArgoCD resources

- `argoproj.io/v1alpha1`:
  - `Application`
  - `ApplicationSet`
  - `AppProject`

## Supported Argo Rollouts resources

- `argoproj.io/v1alpha1`:
  - `Rollout` (cluster list page + details drawer)

## Navigation and routes

The sidebar shows a top-level **Argo** entry. Under it:

| Area | Cluster page routes |
| --- | --- |
| Landing (hub) | `/argo` |
| ArgoCD (tabs + standalone pages) | `/argo/argocd`, `/argo/argocd/overview`, `/argo/argocd/applications`, `/argo/argocd/applicationsets`, `/argo/argocd/appprojects`, `/argo/argocd/config` |
| Argo Workflows (placeholders) | `/argo/workflows`, `/argo/workflows/cron-workflows` |
| Argo Rollouts | `/argo/rollouts` |

**Backward compatibility:** The previous default paths under `/argocd/*` are still registered with the same UI, so old bookmarks and deep links keep working.

## Install

Open Freelens and go to Extensions (`ctrl`+`shift`+`E` or `cmd`+`shift`+`E`), then install `@sebastian-prokesch/freelens-argocd-extension`.

## Adding another Argo product (for contributors)

1. Add route segments in [`src/renderer/routes/argo-routes.ts`](src/renderer/routes/argo-routes.ts).
2. Add Kubernetes resource types/stores under `src/renderer/k8s/<product>/` (see [`src/renderer/k8s/argocd/`](src/renderer/k8s/argocd/), [`src/renderer/k8s/rollouts/`](src/renderer/k8s/rollouts/), and stubs in [`src/renderer/k8s/workflows/`](src/renderer/k8s/workflows/)).
3. Add pages, optional details, and context menus under `src/renderer/pages/`, `src/renderer/details/`, `src/renderer/menus/`.
4. Register cluster pages and sidebar items in [`src/renderer/registration/cluster-registration.tsx`](src/renderer/registration/cluster-registration.tsx) (wired from [`src/renderer/index.tsx`](src/renderer/index.tsx)).

## Build from source

### Prerequisites

- Node.js (see `package.json` engines)
- pnpm (via Corepack recommended)

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

The tarball for the extension will be placed in the current directory. In
Freelens, navigate to the Extensions list and provide the path to the tarball
to be loaded, or drag and drop the extension tarball into the Freelens window.
After loading for a moment, the extension should appear in the list of enabled
extensions.

### Check code statically

```sh
pnpm lint:check
```

### Keep SCSS typings in sync

SCSS module typings (`*.module.scss.d.ts`) are generated files. When changing module SCSS:

```sh
pnpm clean:dts
pnpm build
pnpm type:check
```

Commit regenerated `*.module.scss.d.ts` alongside the SCSS changes.

### Testing

#### Unit/component tests (Jest + React Testing Library)

```sh
pnpm test
# or
pnpm test:unit
pnpm test:watch
```

#### Integration smoke test (Jest + Playwright + Freelens)

This launches the Freelens desktop app via Playwright, installs the extension, and verifies the ArgoCD overview page renders.

Prerequisites:
- Build a tarball for the extension:

```sh
pnpm build
pnpm pack
```

- Set required environment variables:

```sh
# path to the built extension tarball (.tgz) from `pnpm pack`
export EXTENSION_PATH="/absolute/path/to/<your-extension>.tgz"

# path to the Freelens executable
# macOS example:
export FREELENS_EXECUTABLE_PATH="/Applications/Freelens.app/Contents/MacOS/Freelens"
```

Run:

```sh
pnpm test:integration
```

Notes:
- The integration smoke test is **skipped automatically** if `EXTENSION_PATH` or `FREELENS_EXECUTABLE_PATH` (or equivalents) are not set.
- The “ArgoCD Overview” UI is a **cluster page**; if Freelens is on the Welcome screen with no active cluster context, the smoke test only validates **launch + install**, and skips the cluster-page assertion.

## License

Copyright (c) 2025 Sebastian Prokesch.

[MIT License](https://opensource.org/licenses/MIT)
