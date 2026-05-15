# Beta Release Runbook

This runbook defines the required process for publishing a beta release.

## 1. Prepare Candidate

1. Update version in `package.json` using beta semver (`0.1.0-beta.x`).
2. Update `CHANGELOG.md` with release notes for the candidate.
3. Confirm docs reflect current behavior and known limitations.

## 2. Pre-Publish Gates

All of the following must pass for the release candidate commit:

- `pnpm type:check`
- `pnpm lint:check`
- `pnpm test:unit`
- `pnpm build`
- `pnpm pack`

## 3. Publish

1. Create and publish GitHub Release from the validated tag.
2. Release workflow (`.github/workflows/release.yml`) will:
   - rerun verify gates
   - build and pack
   - attach `.tgz` asset to the release

## 4. Post-Publish Checks

1. Download published `.tgz` from the release page.
2. Install in Freelens and run a quick smoke validation.
