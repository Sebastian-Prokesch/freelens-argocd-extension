# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
with pre-release identifiers for beta builds.

## [Unreleased]

## [0.1.14]

### Added

- Config dialog: ConfigMap data is now edited as key/value rows with multiline editors (taller for heavy keys like `dex.config` and `policy.csv`), with an "Edit as JSON" fallback view for raw editing.
- Config dialog: repository credential fields show "Clear stored ..." checkboxes in edit mode, and changing the auth method asks for confirmation before removing previously stored credentials.
- Config page: repository secret details now show the Helm 4 OCI flags `enableOCI`, `insecureOCIForceHttp` (new in Argo CD 3.5), and `insecure`, with a warning when `insecure` and `insecureOCIForceHttp` conflict (known Helm 4 limitation).
- README section documenting Argo CD 3.4/3.5 compatibility and 3.5 upgrade notes.
- Local Kind dev cluster under `dev-cluster/` with Argo CD, Rollouts, Workflows, and demo resources mapped to extension UI surfaces.

### Changed

- Dev cluster pinned to Argo CD chart `10.3.0` (app `v3.5.0`); extension CR operations smoke-tested against Argo CD 3.5.

### Fixed

- Editing a repository, repo-creds, or cluster secret no longer wipes stored credentials and unrelated secret keys: blank credential fields keep their current values, and only explicitly changed or cleared keys are patched.
- Removing a key from an Argo ConfigMap in the edit dialog now actually deletes it from the ConfigMap.
- Dev-cluster drift recipe targeted `deploy/guestbook` instead of `guestbook-ui`, so the intended OutOfSync demo state was never created.
- CI and release workflows no longer hardcode the pnpm version.

## [0.1.13]

### Added

- Resource Diff panel in Application details, grouping OutOfSync resources by namespace and kind.

## [0.1.12]

### Added

- Rollback for Applications from the details view, rebuilt from deployment history (disabled for apps with automated sync).

### Changed

- Node.js engine requirement raised to >= 24.

## [0.1.11]

### Added

- Application Sync dialog with sync options: prune, dry run, force, sync strategy, and target revision.

## [0.1.10]

### Added

- Drift hotspots table and diagnostics summary in Application details.

## [0.1.9]

### Added

- ApplicationSet and AppProject status signals in list and detail views.

## [0.1.8]

### Added

- Overview status cards on the Argo overview page.

## [0.1.7]

### Added

- Refresh and hard refresh context-menu actions for ArgoCD Applications.

## [0.1.6]

### Changed

- All Argo actions now use the shared confirm-and-notify safety flow.

## [0.1.5]

### Added

- Confirmation dialogs and result notifications for destructive Argo actions.

### Changed

- Rollout abort is now also available when a rollout is paused at a promotable step or pending analysis, with fallback status patching.

## [0.1.4]

### Changed

- Argo config editing (Secrets and ConfigMaps) moved to dedicated endpoints with centralized error messages for failed actions.

## [0.1.3]

### Added

- Abort and retry actions for Argo Rollouts.

## [0.1.2]

### Added

- Sync and terminate context-menu actions for ArgoCD Applications.

## [0.1.1]

### Fixed

- Renderer loading failure in published builds caused by references to `node_modules/.vite_external/*` stubs.

### Changed

- Release and CI builds now force `VITE_PRESERVE_MODULES=false` to produce portable bundle output for npm and GitHub release tarballs.
- Build pipelines now fail if compiled `out/` assets still reference `.vite_external`.

## [0.1.0]

First stable public release. Same extension artifacts as `0.1.0-beta.4`; published to npm with the `latest` dist-tag.

### Added

- Stable install path: `@sebastian-prokesch/freelens-argo-extension` (without `@next`).

## [0.1.0-beta.4]

### Added

- npm distribution at `@sebastian-prokesch/freelens-argo-extension` (Trusted Publishing from GitHub Actions).
- Tag-driven release workflow: verify, publish to npm, and create a draft GitHub Release with `.tgz` assets.
- README install instructions for npm and updated contributing guidance.
- Release runbook for the tag-push and draft-release process.

### Changed

- GitHub Releases are created as drafts with generated release notes; prerelease/latest flags follow semver pre-release tags.
- Release CI split into `verify`, `publish-npm`, and `github-release` jobs.

## [0.1.0-beta.3]

### Added

- ArgoCD pages for Overview, Applications, ApplicationSets, AppProjects, and Config.
- Argo Rollouts pages and common rollout actions.
- Initial Argo Workflows pages and detail views.
- Legacy `/argocd/*` route registration for backward compatibility.

### Known Limitations

- Argo Workflows UX remains early and can change between beta releases.
- Integration behavior depends on cluster RBAC and installed CRD schemas.
