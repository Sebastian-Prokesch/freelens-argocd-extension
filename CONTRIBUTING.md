# Contributing

Thanks for contributing to the Freelens ArgoCD Extension.

## Development Prerequisites

- Node.js `>=22.16.0`
- pnpm `11.x`
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


## Pull Request Expectations

- Keep changes focused and reviewable.
- Include tests for behavior changes when practical.
- Update `README.md` and `CHANGELOG.md` when user-visible behavior changes.
- Document known limitations for beta features.

## Reporting Bugs and Security Issues

- Functional bugs: open a GitHub issue with reproduction details.
