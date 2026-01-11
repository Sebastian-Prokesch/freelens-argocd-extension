# Freelens ArgoCD Extension

Freelens extension that adds **ArgoCD views** for GitOps workflows, including an **Overview** page and **Application Details**.

## Requirements

- Kubernetes >= 1.24
- Freelens >= 1.5.2

## Supported ArgoCD resources

- `argoproj.io/v1alpha1`:
  - `Application`
  - `AppProject`

## Install

Open Freelens and go to Extensions (`ctrl`+`shift`+`E` or `cmd`+`shift`+`E`), then install `@sebastian-prokesch/freelens-argocd-extension`.

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
