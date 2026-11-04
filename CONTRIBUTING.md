# Contributing

Thanks for contributing to the Freelens ArgoCD Extension.

## Development Prerequisites

- Node.js `>=24.0.0` (see [`.nvmrc`](.nvmrc); run `nvm use` if you manage Node versions with nvm)
- pnpm `11.15.1` (pinned via `packageManager` in [`package.json`](package.json); run `corepack install` to get the exact version)
- Freelens 2.x installation for manual validation (Freelens 1.x is no longer supported; see the `v1` npm dist-tag / `0.1.20`)

## Local Verification Before Opening a PR

Run these checks locally:

```sh
pnpm type:check
pnpm lint:check
pnpm test:unit
pnpm build
pnpm pack
```

`pnpm type:check` runs one `tsc` program per process (`src/main`, `src/renderer`), plus the unit tests, the build tooling and the integration helpers. For a faster edit loop, `pnpm dev` rebuilds `dist/` on change; in Freelens 2 you can register the repository directory itself on the Extensions page, and a rebuild reloads the extension (per the Freelens 2 docs; not yet verified for this extension).

Optional but recommended when environment is available:

```sh
pnpm test:integration
```

Requires one of `FREELENS_EXECUTABLE_PATH` / `FREELENS_PATH` / `FREELENS_BINARY` (a Freelens executable) plus `EXTENSION_PATH` (the built extension). Without them the test is skipped silently rather than failing — this is expected locally.


## Pull Request Expectations

- Keep changes focused and reviewable.
- Include tests for behavior changes when practical.
- Update `README.md` and `CHANGELOG.md` when user-visible behavior changes.
- Document known limitations for beta features.

## Reporting Bugs and Security Issues

- Functional bugs: open a GitHub issue with reproduction details.
