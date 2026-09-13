# Contributing

Thanks for contributing to the Freelens ArgoCD Extension.

## Development Prerequisites

- Node.js `>=24.0.0` (see [`.nvmrc`](.nvmrc); run `nvm use` if you manage Node versions with nvm)
- pnpm `11.15.1` (pinned via `packageManager` in [`package.json`](package.json); run `corepack install` to get the exact version)
- Freelens installation for manual validation

## Local Verification Before Opening a PR

Run these checks locally:

```sh
pnpm type:check
pnpm lint:check
pnpm test:unit
pnpm build
pnpm pack
```

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
