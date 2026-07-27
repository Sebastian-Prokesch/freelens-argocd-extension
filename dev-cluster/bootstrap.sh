#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLUSTER_NAME="${CLUSTER_NAME:-freelens-argo}"
KIND_CONFIG="${KIND_CONFIG:-${ROOT_DIR}/kind-config.yaml}"

# Pinned chart versions for reproducibility
ARGOCD_CHART_VERSION="${ARGOCD_CHART_VERSION:-10.2.1}"
ROLLOUTS_CHART_VERSION="${ROLLOUTS_CHART_VERSION:-2.41.1}"
WORKFLOWS_CHART_VERSION="${WORKFLOWS_CHART_VERSION:-1.0.23}"

SKIP_DEMOS="${SKIP_DEMOS:-false}"
SKIP_DRIFT="${SKIP_DRIFT:-false}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "error: required command not found: $1" >&2
    exit 1
  fi
}

wait_for_deployments() {
  local ns="$1"
  shift
  local deploy
  for deploy in "$@"; do
    echo "    waiting for deployment/${deploy} in ${ns}"
    kubectl -n "${ns}" rollout status "deployment/${deploy}" --timeout=300s
  done
}

echo "==> Checking prerequisites"
require_cmd docker
require_cmd kind
require_cmd kubectl
require_cmd helm

if ! docker info >/dev/null 2>&1; then
  echo "error: Docker daemon is not running" >&2
  exit 1
fi

echo "==> Ensuring Kind cluster '${CLUSTER_NAME}' exists"
if ! kind get clusters 2>/dev/null | grep -qx "${CLUSTER_NAME}"; then
  kind create cluster --config "${KIND_CONFIG}" --name "${CLUSTER_NAME}"
else
  echo "    cluster already exists; reusing"
  kubectl cluster-info --context "kind-${CLUSTER_NAME}" >/dev/null
fi

kubectl config use-context "kind-${CLUSTER_NAME}" >/dev/null

echo "==> Adding/updating Argo Helm repo"
helm repo add argo https://argoproj.github.io/argo-helm >/dev/null 2>&1 || true
helm repo update argo >/dev/null

# Namespaces needed before chart RoleBindings (workflowNamespaces) and demos
echo "==> Ensuring namespaces exist"
kubectl apply -f "${ROOT_DIR}/demos/namespaces.yaml"

echo "==> Installing Argo CD (chart ${ARGOCD_CHART_VERSION})"
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
helm upgrade --install argocd argo/argo-cd \
  --namespace argocd \
  --version "${ARGOCD_CHART_VERSION}" \
  --set dex.enabled=false \
  --set notifications.enabled=false \
  --set applicationSet.enabled=true \
  --set server.service.type=ClusterIP \
  --wait --timeout 10m

wait_for_deployments argocd \
  argocd-server \
  argocd-repo-server \
  argocd-applicationset-controller

# application-controller may be a StatefulSet depending on chart values
if kubectl -n argocd get statefulset argocd-application-controller >/dev/null 2>&1; then
  kubectl -n argocd rollout status statefulset/argocd-application-controller --timeout=300s
elif kubectl -n argocd get deployment argocd-application-controller >/dev/null 2>&1; then
  kubectl -n argocd rollout status deployment/argocd-application-controller --timeout=300s
fi

echo "==> Installing Argo Rollouts (chart ${ROLLOUTS_CHART_VERSION})"
kubectl create namespace argo-rollouts --dry-run=client -o yaml | kubectl apply -f -
helm upgrade --install argo-rollouts argo/argo-rollouts \
  --namespace argo-rollouts \
  --version "${ROLLOUTS_CHART_VERSION}" \
  --set dashboard.enabled=false \
  --wait --timeout 5m

wait_for_deployments argo-rollouts argo-rollouts

echo "==> Installing Argo Workflows (chart ${WORKFLOWS_CHART_VERSION})"
kubectl create namespace argo --dry-run=client -o yaml | kubectl apply -f -
helm upgrade --install argo-workflows argo/argo-workflows \
  --namespace argo \
  --version "${WORKFLOWS_CHART_VERSION}" \
  --set 'server.authModes={server}' \
  --set workflow.serviceAccount.create=true \
  --set workflow.rbac.create=true \
  --set 'controller.workflowNamespaces={argo,demo-workflows}' \
  --wait --timeout 10m

wait_for_deployments argo \
  argo-workflows-workflow-controller \
  argo-workflows-server

if [[ "${SKIP_DEMOS}" != "true" ]]; then
  echo "==> Applying demo manifests"
  apply_dir() {
    local dir="$1"
    local file
    local failed=0
    while IFS= read -r -d '' file; do
      if ! kubectl apply -f "${file}"; then
        echo "error: failed to apply ${file}" >&2
        failed=1
      fi
    done < <(find "${dir}" -type f \( -name '*.yaml' -o -name '*.yml' \) -print0 | sort -z)
    return "${failed}"
  }

  demo_failed=0
  apply_dir "${ROOT_DIR}/demos/argocd" || demo_failed=1
  apply_dir "${ROOT_DIR}/demos/rollouts" || demo_failed=1
  apply_dir "${ROOT_DIR}/demos/workflows" || demo_failed=1
  if [[ "${demo_failed}" -ne 0 ]]; then
    echo "error: one or more demo manifests failed to apply" >&2
    exit 1
  fi

  echo "==> Waiting for Argo CD Applications to reconcile"
  for app in guestbook kustomize-guestbook broken-guestbook; do
    echo "    waiting for application/${app}"
    for _ in $(seq 1 60); do
      sync="$(kubectl -n argocd get application "${app}" -o jsonpath='{.status.sync.status}' 2>/dev/null || true)"
      health="$(kubectl -n argocd get application "${app}" -o jsonpath='{.status.health.status}' 2>/dev/null || true)"
      if [[ -n "${sync}" && -n "${health}" ]]; then
        echo "      ${app}: sync=${sync} health=${health}"
        break
      fi
      sleep 5
    done
  done

  if [[ "${SKIP_DRIFT}" != "true" ]]; then
    echo "==> Creating intentional drift on guestbook (OutOfSync)"
    for _ in $(seq 1 60); do
      if kubectl -n guestbook get deploy guestbook >/dev/null 2>&1; then
        sync="$(kubectl -n argocd get application guestbook -o jsonpath='{.status.sync.status}' 2>/dev/null || true)"
        if [[ "${sync}" == "Synced" || "${sync}" == "OutOfSync" ]]; then
          kubectl -n guestbook scale deploy/guestbook --replicas=3
          kubectl -n argocd annotate application guestbook \
            argocd.argoproj.io/refresh=hard --overwrite
          echo "    scaled guestbook to 3 replicas; hard-refreshed Application"
          break
        fi
      fi
      sleep 5
    done
  fi

  echo "==> Waiting for Rollouts to become Healthy, then trigger updates (Paused)"
  for rollout in canary-demo bluegreen-demo analysis-canary; do
    echo "    waiting for rollout/${rollout}"
    for _ in $(seq 1 60); do
      phase="$(kubectl -n demo-rollouts get rollout "${rollout}" -o jsonpath='{.status.phase}' 2>/dev/null || true)"
      if [[ "${phase}" == "Healthy" ]]; then
        echo "      ${rollout}: Healthy"
        break
      fi
      sleep 5
    done
  done

  # New revisions → canary pauses / bluegreen waits for promote
  kubectl -n demo-rollouts patch rollout canary-demo --type merge \
    -p '{"spec":{"template":{"spec":{"containers":[{"name":"rollouts-demo","image":"argoproj/rollouts-demo:yellow"}]}}}}' \
    >/dev/null
  kubectl -n demo-rollouts patch rollout bluegreen-demo --type merge \
    -p '{"spec":{"template":{"spec":{"containers":[{"name":"rollouts-demo","image":"argoproj/rollouts-demo:green"}]}}}}' \
    >/dev/null
  kubectl -n demo-rollouts patch rollout analysis-canary --type merge \
    -p '{"spec":{"template":{"spec":{"containers":[{"name":"rollouts-demo","image":"argoproj/rollouts-demo:yellow"}]}}}}' \
    >/dev/null

  for _ in $(seq 1 36); do
    canary_phase="$(kubectl -n demo-rollouts get rollout canary-demo -o jsonpath='{.status.phase}' 2>/dev/null || true)"
    bg_phase="$(kubectl -n demo-rollouts get rollout bluegreen-demo -o jsonpath='{.status.phase}' 2>/dev/null || true)"
    echo "    canary-demo=${canary_phase:-pending} bluegreen-demo=${bg_phase:-pending}"
    if [[ "${canary_phase}" == "Paused" ]] && { [[ "${bg_phase}" == "Paused" ]] || [[ "${bg_phase}" == "Progressing" ]]; }; then
      break
    fi
    sleep 5
  done
fi

echo
echo "==> Bootstrap complete"
echo "    Kind context: kind-${CLUSTER_NAME}"
echo "    Open Freelens and select that cluster context."
echo
echo "    Optional Argo CD UI:"
echo "      kubectl -n argocd port-forward svc/argocd-server 8080:443"
echo "      kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d; echo"
echo
echo "    Teardown:"
echo "      ${ROOT_DIR}/teardown.sh"
