import { access, mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const templates = [
  {
    fileName: "argo-repository-secret.yaml",
    content: `apiVersion: v1
kind: Secret
metadata:
  name: example-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: git
  url: https://github.com/argoproj/argocd-example-apps.git
  project: default
  username: example-user
  password: example-token
`,
  },
  {
    fileName: "argo-repo-creds-secret.yaml",
    content: `apiVersion: v1
kind: Secret
metadata:
  name: example-repo-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
type: Opaque
stringData:
  url: https://github.com/argoproj
  project: default
  username: example-user
  password: example-token
`,
  },
  {
    fileName: "argo-cluster-secret.yaml",
    content: `apiVersion: v1
kind: Secret
metadata:
  name: example-cluster
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: cluster
type: Opaque
stringData:
  name: example-cluster
  server: https://kubernetes.default.svc
  project: default
  config: |
    {
      "username": "<basic auth username>",
      "password": "<basic auth password>",
      "bearerToken": "<authentication token>",
      "awsAuthConfig": {
        "clusterName": "<eks cluster name>",
        "roleARN": "<arn:aws:iam::<ACCOUNT_ID>:role/<ROLE_NAME>>",
        "profile": "<path to aws profile file>"
      },
      "execProviderConfig": {
        "command": "argocd-k8s-auth",
        "args": ["aws", "--cluster-name", "<eks cluster name>"],
        "env": {
          "AWS_REGION": "<region>",
          "AWS_ACCESS_KEY_ID": "<access key id>",
          "AWS_SECRET_ACCESS_KEY": "<secret access key>",
          "AWS_SESSION_TOKEN": "<session token>"
        },
        "apiVersion": "client.authentication.k8s.io/v1beta1",
        "installHint": "<install hint>"
      },
      "proxyUrl": "https://proxy.example.com:8888",
      "tlsClientConfig": {
        "insecure": false,
        "caData": "<base64 encoded certificate>",
        "certData": "<base64 encoded client cert>",
        "keyData": "<base64 encoded client key>",
        "serverName": "<tls server name>"
      },
      "disableCompression": false
    }
`,
  },
  {
    fileName: "argocd-cm.yaml",
    content: `apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
  labels:
    app.kubernetes.io/part-of: argocd
data:
  url: https://argocd.example.com
`,
  },
  {
    fileName: "argocd-rbac-cm.yaml",
    content: `apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
  labels:
    app.kubernetes.io/part-of: argocd
data:
  policy.default: role:readonly
`,
  },
  {
    fileName: "argo-appproject.yaml",
    content: `apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: example-project
  namespace: argocd
spec:
  description: Example ArgoCD AppProject
  sourceRepos:
    - "*"
  destinations:
    - server: https://kubernetes.default.svc
      namespace: "*"
  clusterResourceWhitelist:
    - group: ""
      kind: Namespace
  namespaceResourceWhitelist:
    - group: "apps"
      kind: Deployment
    - group: ""
      kind: Service
`,
  },
  {
    fileName: "argo-application.yaml",
    content: `apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: example-application
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/argoproj/argocd-example-apps.git
    targetRevision: HEAD
    path: guestbook
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: false
      selfHeal: true
`,
  },
  {
    fileName: "argo-appset.yaml",
    content: `apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: example-appset
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - name: guestbook
            namespace: default
            repoURL: https://github.com/argoproj/argocd-example-apps.git
            path: guestbook
            targetRevision: HEAD
  template:
    metadata:
      name: "{{name}}"
    spec:
      project: default
      source:
        repoURL: "{{repoURL}}"
        targetRevision: "{{targetRevision}}"
        path: "{{path}}"
      destination:
        server: https://kubernetes.default.svc
        namespace: "{{namespace}}"
      syncPolicy:
        automated:
          prune: false
          selfHeal: true
`,
  },
];

const ensureFile = async (filePath: string, content: string) => {
  try {
    await access(filePath);
  } catch {
    await writeFile(filePath, content, "utf8");
  }
};

export const ensureArgoResourceTemplates = async () => {
  const templatesDir = join(homedir(), ".freelens", "templates", "argocd");

  await mkdir(templatesDir, { recursive: true });

  await Promise.all(templates.map((template) => ensureFile(join(templatesDir, template.fileName), template.content)));
};
