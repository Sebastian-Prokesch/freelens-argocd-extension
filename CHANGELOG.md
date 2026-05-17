# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
with pre-release identifiers for beta builds.

## [Unreleased]

## [0.1.1] - 2026-05-17

### Fixed

- Renderer loading failure in published builds caused by references to `node_modules/.vite_external/*` stubs.

### Changed

- Release and CI builds now force `VITE_PRESERVE_MODULES=false` to produce portable bundle output for npm and GitHub release tarballs.
- Build pipelines now fail if compiled `out/` assets still reference `.vite_external`.

## [0.1.0] - 2026-05-17

First stable public release. Same extension artifacts as `0.1.0-beta.4`; published to npm with the `latest` dist-tag.

### Added

- Stable install path: `@sebastian-prokesch/freelens-argo-extension` (without `@next`).

## [0.1.0-beta.4] - 2026-05-17

### Added

- npm distribution at `@sebastian-prokesch/freelens-argo-extension` (Trusted Publishing from GitHub Actions).
- Tag-driven release workflow: verify, publish to npm, and create a draft GitHub Release with `.tgz` assets.
- README install instructions for npm and updated contributing guidance.
- Release runbook for the tag-push and draft-release process.

### Changed

- GitHub Releases are created as drafts with generated release notes; prerelease/latest flags follow semver pre-release tags.
- Release CI split into `verify`, `publish-npm`, and `github-release` jobs.

## [0.1.0-beta.3] - 2026-05-14

### Added

- ArgoCD pages for Overview, Applications, ApplicationSets, AppProjects, and Config.
- Argo Rollouts pages and common rollout actions.
- Initial Argo Workflows pages and detail views.
- Legacy `/argocd/*` route registration for backward compatibility.

### Known Limitations

- Argo Workflows UX remains early and can change between beta releases.
- Integration behavior depends on cluster RBAC and installed CRD schemas.
