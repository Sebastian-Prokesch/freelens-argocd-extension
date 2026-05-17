# Release Runbook

This runbook describes how to publish `@sebastian-prokesch/freelens-argo-extension` using the tag-driven workflow in [`.github/workflows/release.yml`](../.github/workflows/release.yml).

## Overview

```text
Push tag v*  →  verify  →  publish-npm (npm)  +  github-release (draft + .tgz)
                              ↓                           ↓
                         npm @next / @latest        Review draft → Publish on GitHub
```

| Trigger | What runs |
|---------|-----------|
| Push tag matching `v*` | `verify` → `publish-npm` + `github-release` (parallel) |
| `workflow_dispatch` | `verify` only (smoke check; no npm or GitHub release) |

## 1. Prepare release commit

1. Bump `version` in [`package.json`](../package.json) (beta: `0.1.0-beta.x`; stable: `0.1.0`, etc.).
2. Update [`CHANGELOG.md`](../CHANGELOG.md): move items from `[Unreleased]` into a dated section for this version.
3. Confirm [`README.md`](../README.md) reflects current beta/stable status and install instructions.
4. Commit and push to `main` (or the branch you tag from).

**Tag rule:** the git tag must be `v` + exact `package.json` version (e.g. version `0.1.0-beta.4` → tag `v0.1.0-beta.4`). CI fails if they differ.

## 2. Pre-tag checks (local)

Run before pushing the tag:

```sh
pnpm install --frozen-lockfile
pnpm type:check
pnpm lint:check
pnpm test:unit
VITE_PRESERVE_MODULES=false pnpm build
pnpm pack
tar -tzf sebastian-prokesch-freelens-argo-extension-*.tgz   # optional: inspect bundle contents
```

Optional: `pnpm test:integration` when Freelens and cluster paths are configured.

## 3. Push tag (starts release)

```sh
git tag v0.1.0-beta.4          # must match package.json
git push origin v0.1.0-beta.4
```

GitHub Actions runs [`.github/workflows/release.yml`](../.github/workflows/release.yml):

### Job: `verify`

- Typecheck, lint, unit tests, build
- Build runs with `VITE_PRESERVE_MODULES=false` for release-safe output
- Fails fast if `out/` still contains `.vite_external` references
- Uploads `out/` as artifact `extension-build-out`

### Job: `publish-npm` (tag pushes only)

- Uses GitHub environment **`publishing`** and npm **Trusted Publishing** (OIDC; no `NPM_TOKEN` in the repo)
- Publishes to [npm](https://www.npmjs.com/package/@sebastian-prokesch/freelens-argo-extension)
- **Dist-tag:** `next` if the tag contains `-` (prerelease); otherwise `latest`

Approve the `publishing` deployment in the Actions UI if the environment has required reviewers.

### Job: `github-release` (tag pushes only)

- Packs `.tgz` and creates a **draft** GitHub Release for the tag
- Attaches the tarball as a release asset
- Sets **Generate release notes** (commits/PRs since previous tag)
- **Prerelease** / **Latest** flags: prerelease + not latest when tag contains `-`; stable tags are marked latest

npm is live as soon as `publish-npm` succeeds. The GitHub release stays a **draft** until you publish it manually.

## 4. Review and publish GitHub draft

1. Open **Actions** → confirm `verify`, `publish-npm`, and `github-release` succeeded.
2. Open **Releases** → find the **Draft** for your tag.
3. Edit the generated description if needed (or align with `CHANGELOG.md`).
4. Click **Publish release**.

Publishing the draft does **not** republish npm; it only makes the GitHub release and assets public.

## 5. Post-release checks

1. **npm:** confirm the version on the [package page](https://www.npmjs.com/package/@sebastian-prokesch/freelens-argo-extension) and install via Freelens Extensions (`@sebastian-prokesch/freelens-argo-extension@next` for beta).
2. **GitHub:** download the `.tgz` from the published release and install in Freelens (drag-and-drop or path).
3. Smoke-test Argo sidebar pages against a cluster with Argo CRDs installed.

## Beta vs stable releases

| Version example | Git tag | npm dist-tag | GitHub draft flags |
|-----------------|---------|--------------|-------------------|
| `0.1.0-beta.4` | `v0.1.0-beta.4` | `next` | Pre-release, not latest |
| `0.1.0` | `v0.1.0` | `latest` | Latest stable |

Typical sequence: ship beta tags while iterating, then bump to `0.1.0` and tag `v0.1.0` when ready for the first stable public release (same codebase, updated changelog only).

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Version guard failed | Tag name does not match `package.json` `version` with a `v` prefix |
| npm `403` | Trusted Publisher mismatch (repo, `release.yml`, `publishing` environment) or wrong npm scope owner |
| Stuck on `publish-npm` | Pending approval on GitHub `publishing` environment |
| Draft release missing `.tgz` | `github-release` job failed; check pack step logs |
| Version already on npm | Bump `package.json` version; npm cannot republish the same version |
