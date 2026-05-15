# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
with pre-release identifiers for beta builds.

## [Unreleased]

### Added

- Beta release governance artifacts: release runbook, compatibility matrix, QA checklist, and security policy.

### Changed

- Release workflow now runs full quality gates and integration smoke validation before attaching artifacts.

## [0.1.0-beta.3] - 2026-05-14

### Added

- ArgoCD pages for Overview, Applications, ApplicationSets, AppProjects, and Config.
- Argo Rollouts pages and common rollout actions.
- Initial Argo Workflows pages and detail views.
- Legacy `/argocd/*` route registration for backward compatibility.

### Known Limitations

- Argo Workflows UX remains early and can change between beta releases.
- Integration behavior depends on cluster RBAC and installed CRD schemas.
