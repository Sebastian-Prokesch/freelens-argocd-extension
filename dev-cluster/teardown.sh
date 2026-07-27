#!/usr/bin/env bash
set -euo pipefail

CLUSTER_NAME="${CLUSTER_NAME:-freelens-argo}"

echo "==> Deleting Kind cluster '${CLUSTER_NAME}'"
kind delete cluster --name "${CLUSTER_NAME}"
echo "==> Done"
