# Freelens Argo extension — Kind dev cluster

Local Kind cluster with **Argo CD**, **Argo Rollouts**, and **Argo Workflows**, plus demo resources mapped to extension UI surfaces.

## Prerequisites

- Docker (daemon running)
- [kind](https://kind.sigs.k8s.io/)
- kubectl
- Helm 3
- Freelens with this extension loaded (`pnpm build` / install the `.tgz`)

## Quick start

```bash
chmod +x dev-cluster/bootstrap.sh dev-cluster/teardown.sh
./dev-cluster/bootstrap.sh
```

This will:

1. Create Kind cluster `freelens-argo` (1 control-plane + 1 worker) if missing
2. Install pinned Helm charts:
   - Argo CD `10.2.1` (app `v3.4.5`)
   - Argo Rollouts `2.41.1` (app `v1.9.1`)
   - Argo Workflows `1.0.23` (app `v4.0.8`)
3. Apply demos under `demos/`
4. Drift the `guestbook` Application (scale Deployment → OutOfSync)
5. Patch Rollouts to a new image so canaries/blue-green pause for promote

Teardown:

```bash
./dev-cluster/teardown.sh
```

### Useful env overrides

| Variable | Default | Purpose |
| --- | --- | --- |
| `CLUSTER_NAME` | `freelens-argo` | Kind cluster name |
| `SKIP_DEMOS` | `false` | Controllers only |
| `SKIP_DRIFT` | `false` | Skip guestbook OutOfSync recipe |
| `ARGOCD_CHART_VERSION` / `ROLLOUTS_CHART_VERSION` / `WORKFLOWS_CHART_VERSION` | pinned in script | Override chart pins |

## Connect Freelens

1. Ensure kubeconfig has context `kind-freelens-argo` (Kind writes this on create)
2. Open Freelens → select **kind-freelens-argo**
3. Open the Argo sidebar sections (CD / Rollouts / Workflows)

You do **not** need the Argo CD UI or API login for current CRD-based extension features.

Optional Argo CD UI:

```bash
kubectl -n argocd port-forward svc/argocd-server 8080:443
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d; echo
# user: admin
```

## Demo map

### Argo CD

| Resource | Scenario | Extension surface |
| --- | --- | --- |
| `Application/guestbook` | Healthy then **OutOfSync** (scaled replicas) | Drift hotspots, Resource Diff, sync/refresh menus |
| `Application/kustomize-guestbook` | Synced + Healthy | Overview charts, details |
| `Application/broken-guestbook` | Bad Helm image → Degraded/Progressing | Unhealthy badges, diagnostics |
| `ApplicationSet/demo-list-apps` | List generator → `list-app-a` / `list-app-b` | ApplicationSets page/details |
| `AppProject/freelens-demo` | Destinations + sync window | AppProjects page/details |
| Secrets `demo-example-apps-repo`, `demo-example-cluster` | Config listing | Config page |

Re-create guestbook drift after a sync:

```bash
kubectl -n guestbook scale deploy/guestbook --replicas=3
kubectl -n argocd annotate application guestbook argocd.argoproj.io/refresh=hard --overwrite
```

### Argo Rollouts

| Resource | Scenario | Extension surface |
| --- | --- | --- |
| `Rollout/canary-demo` | Canary + indefinite pause | Promote / promote-full / skip menus |
| `Rollout/bluegreen-demo` | BlueGreen, `autoPromotionEnabled: false` | Promote / abort |
| `Rollout/analysis-canary` | Analysis step → AnalysisRuns | AnalysisRuns + related on Rollout details |
| `AnalysisTemplate/always-pass` | Job metric | AnalysisTemplates page |
| `ClusterAnalysisTemplate/always-pass-cluster` | Cluster-scoped | Cluster AnalysisTemplates page |
| `Experiment/demo-experiment` | Short A/B experiment | Experiments page |

Re-trigger a paused canary after promoting:

```bash
kubectl -n demo-rollouts patch rollout canary-demo --type merge \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"rollouts-demo","image":"argoproj/rollouts-demo:red"}]}}}}'
```

### Argo Workflows

| Resource | Scenario | Extension surface |
| --- | --- | --- |
| `Workflow/hello-world` | Succeeded | List/details phase + duration |
| `Workflow/intentional-fail` | Failed | Message/reason |
| `Workflow/long-running` | Running (~5m sleep) | Live phase |
| `WorkflowTemplate/hello-template` + `from-template` | Template + instance | Templates page |
| `ClusterWorkflowTemplate/hello-cluster-template` + `from-cluster-template` | Cluster scope | Cluster templates page |
| `CronWorkflow/hello-cron` | Every 5 minutes (`spec.schedules`) | CronWorkflows page |

Namespace: `demo-workflows` (controller allowed via Helm `workflowNamespaces`).
Workflow pods use the Helm-created `argo-workflow` ServiceAccount (needs `workflowtaskresults` create).

## Smoke checklist

After bootstrap, in Freelens:

- [ ] Argo CD overview shows mixed sync/health counts
- [ ] `guestbook` details: OutOfSync hotspots + Resource Diff
- [ ] Application context menus: refresh, sync (and terminate if a sync is running)
- [ ] ApplicationSet + AppProject detail drawers render
- [ ] Config page lists repository/cluster demo Secrets
- [ ] Rollouts overview pie includes Paused (canary/blue-green)
- [ ] Rollout menus: promote / abort against paused demos
- [ ] AnalysisTemplate / AnalysisRun / Experiment visible
- [ ] Workflow Succeeded + Failed + Running (+ Cron + both template kinds)

## Layout

```
dev-cluster/
  kind-config.yaml
  bootstrap.sh
  teardown.sh
  README.md
  demos/
    namespaces.yaml
    argocd/
    rollouts/
    workflows/
```
