# Technical Design Document

## Project: deploy-to-eks

**Project Name:** Shovel Heroes EKS Deployment Pipeline
**Architecture:** GitHub Actions CI/CD with Kubernetes Deployment
**Infrastructure:** AWS EKS (Kubernetes 1.31), ECR, ALB, RDS

Generated on: 2025-10-03T14:45:36.394Z

## Architecture Overview

### System Architecture
GitHub Actions-based Continuous Deployment pipeline deploying containerized frontend and backend applications to AWS EKS with path-based ALB routing.

```
GitHub Actions Workflow
    ↓
├─ Build Backend Docker Image (Node.js 20 + Fastify)
├─ Build Frontend Docker Image (Node.js 20 + Nginx)
    ↓
Push to ECR (existing repositories)
    ↓
Deploy to EKS via kubectl
    ↓
ALB Path-Based Routing
├─ /* → Frontend Service (Nginx:80)
└─ /api/* → Backend Service (Fastify:8787)
```

### Key Components

#### 1. Docker Images
- **Backend**: Multi-stage Node.js 20 → Fastify compiled app
- **Frontend**: Multi-stage Node.js 20 build → Nginx static serving

#### 2. GitHub Actions Workflows
- **deploy-staging.yml**: Auto-deploy on push to `main`
- **deploy-production.yml**: Manual trigger with approval gate

#### 3. Kubernetes Resources
- **Namespace**: `shovel-heroes`
- **ServiceAccount**: IRSA-enabled for AWS secrets access
- **Deployments**: Backend (2 replicas) + Frontend (2 replicas)
- **Services**: ClusterIP for internal routing
- **Ingress**: ALB Ingress Controller with path-based routing

#### 4. AWS Integration
- **ECR**: Container registry (existing repos)
- **EKS**: Kubernetes cluster (existing)
- **ALB**: Application Load Balancer with target groups
- **Secrets Manager**: Database credentials via IRSA
- **IAM**: GitHub OIDC provider + deployment role

## Implementation Details

### 1. Dockerfile Specifications

#### Backend Dockerfile (`Dockerfile.backend`)
```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
COPY packages/shared-types/ ./packages/shared-types/
RUN npm ci --workspace=packages/backend --workspace=packages/shared-types
COPY . .
RUN npm run build:api

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder /app/packages/backend/package*.json ./packages/backend/
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 8787
CMD ["node", "packages/backend/dist/index.js"]
```

#### Frontend Dockerfile (`Dockerfile.frontend`)
```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Nginx Configuration (`nginx.conf`)
```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # SPA routing - fallback to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### 2. Kubernetes Manifests (Kustomize Structure)

#### Base Manifests (`k8s/base/`)

**namespace.yaml**
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: shovel-heroes
```

**serviceaccount.yaml**
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: shovel-heroes-backend
  namespace: shovel-heroes
  annotations:
    eks.amazonaws.com/role-arn: ${BACKEND_POD_ROLE_ARN}
```

**backend-deployment.yaml**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: shovel-heroes
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      serviceAccountName: shovel-heroes-backend
      containers:
      - name: backend
        image: ${ECR_BACKEND_URL}:${IMAGE_TAG}
        ports:
        - containerPort: 8787
          name: http
        env:
        - name: PORT
          value: "8787"
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: database_url
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8787
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /healthz
            port: 8787
          initialDelaySeconds: 10
          periodSeconds: 5
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1Gi
```

**frontend-deployment.yaml**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: shovel-heroes
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: ${ECR_FRONTEND_URL}:${IMAGE_TAG}
        ports:
        - containerPort: 80
          name: http
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
```

**backend-service.yaml**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: shovel-heroes
spec:
  type: ClusterIP
  selector:
    app: backend
  ports:
  - port: 8787
    targetPort: 8787
    protocol: TCP
```

**frontend-service.yaml**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: shovel-heroes
spec:
  type: ClusterIP
  selector:
    app: frontend
  ports:
  - port: 80
    targetPort: 80
    protocol: TCP
```

**ingress.yaml**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: shovel-heroes-ingress
  namespace: shovel-heroes
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/healthcheck-path: /healthz
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}]'
spec:
  ingressClassName: alb
  rules:
  - http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: backend
            port:
              number: 8787
      - path: /healthz
        pathType: Exact
        backend:
          service:
            name: backend
            port:
              number: 8787
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 80
```

**kustomization.yaml**
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - serviceaccount.yaml
  - backend-deployment.yaml
  - backend-service.yaml
  - frontend-deployment.yaml
  - frontend-service.yaml
  - ingress.yaml
```

#### Environment Overlays

**staging/kustomization.yaml**
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
bases:
  - ../base
patchesStrategicMerge:
  - replica-patch.yaml
namePrefix: staging-
```

**production/kustomization.yaml**
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
bases:
  - ../base
patchesStrategicMerge:
  - replica-patch.yaml
namePrefix: prod-
```

### 3. GitHub Actions Workflow Design

#### Workflow: deploy-staging.yml
```yaml
name: Deploy to EKS Staging

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  id-token: write
  contents: read

env:
  AWS_REGION: ap-east-2
  EKS_CLUSTER_NAME: shovel-heroes-staging-eks
  ENVIRONMENT: staging

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment: staging

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials via OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN_STAGING }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push backend image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -f Dockerfile.backend -t $ECR_REGISTRY/shovel-heroes-staging-shovel-heroes-backend:$IMAGE_TAG .
          docker tag $ECR_REGISTRY/shovel-heroes-staging-shovel-heroes-backend:$IMAGE_TAG \
                     $ECR_REGISTRY/shovel-heroes-staging-shovel-heroes-backend:latest
          docker push $ECR_REGISTRY/shovel-heroes-staging-shovel-heroes-backend:$IMAGE_TAG
          docker push $ECR_REGISTRY/shovel-heroes-staging-shovel-heroes-backend:latest

      - name: Build and push frontend image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -f Dockerfile.frontend -t $ECR_REGISTRY/shovel-heroes-staging-shovel-heroes-frontend:$IMAGE_TAG .
          docker tag $ECR_REGISTRY/shovel-heroes-staging-shovel-heroes-frontend:$IMAGE_TAG \
                     $ECR_REGISTRY/shovel-heroes-staging-shovel-heroes-frontend:latest
          docker push $ECR_REGISTRY/shovel-heroes-staging-shovel-heroes-frontend:$IMAGE_TAG
          docker push $ECR_REGISTRY/shovel-heroes-staging-shovel-heroes-frontend:latest

      - name: Configure kubectl
        run: |
          aws eks update-kubeconfig --name ${{ env.EKS_CLUSTER_NAME }} --region ${{ env.AWS_REGION }}

      - name: Create namespace if not exists
        run: |
          kubectl create namespace shovel-heroes --dry-run=client -o yaml | kubectl apply -f -

      - name: Retrieve database credentials from Secrets Manager
        id: get-secrets
        run: |
          DB_SECRET=$(aws secretsmanager get-secret-value --secret-id ${{ secrets.DATABASE_SECRET_ARN }} --query SecretString --output text)
          DB_URL=$(echo $DB_SECRET | jq -r '.database_url')
          echo "::add-mask::$DB_URL"
          echo "database_url=$DB_URL" >> $GITHUB_OUTPUT

      - name: Create/Update Kubernetes secrets
        run: |
          kubectl create secret generic database-credentials \
            --from-literal=database_url="${{ steps.get-secrets.outputs.database_url }}" \
            -n shovel-heroes \
            --dry-run=client -o yaml | kubectl apply -f -

      - name: Deploy to EKS using Kustomize
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          cd k8s/overlays/staging
          kustomize edit set image \
            backend=$ECR_REGISTRY/shovel-heroes-staging-shovel-heroes-backend:$IMAGE_TAG \
            frontend=$ECR_REGISTRY/shovel-heroes-staging-shovel-heroes-frontend:$IMAGE_TAG
          kubectl apply -k .

      - name: Wait for deployments
        run: |
          kubectl rollout status deployment/backend -n shovel-heroes --timeout=300s
          kubectl rollout status deployment/frontend -n shovel-heroes --timeout=300s

      - name: Verify pod health
        run: |
          kubectl wait --for=condition=ready pod -l app=backend -n shovel-heroes --timeout=300s
          kubectl wait --for=condition=ready pod -l app=frontend -n shovel-heroes --timeout=300s

      - name: Get deployment info
        run: |
          kubectl get pods -n shovel-heroes
          kubectl get svc -n shovel-heroes
          kubectl get ingress -n shovel-heroes
```

### 4. Terraform Prerequisites (GitHub OIDC)

New file to add to terraform repo: `iam_github_actions.tf`

```hcl
# GitHub OIDC Provider
data "tls_certificate" "github" {
  url = "https://token.actions.githubusercontent.com"
}

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.github.certificates[0].sha1_fingerprint]

  tags = local.common_tags
}

# IAM Role for GitHub Actions
resource "aws_iam_role" "github_actions" {
  name_prefix = "${var.project_name}-${local.env_type}-github-actions-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.github.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:YOUR_GITHUB_ORG/shovel-heroes-k8s:*"
        }
      }
    }]
  })

  tags = local.common_tags
}

# Policies for GitHub Actions role
resource "aws_iam_role_policy_attachment" "github_actions_ecr" {
  role       = aws_iam_role.github_actions.name
  policy_arn = aws_iam_policy.ecr_write.arn
}

resource "aws_iam_role_policy" "github_actions_eks" {
  name = "eks-access"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "eks:DescribeCluster",
          "eks:ListClusters",
          "eks:AccessKubernetesApi"
        ]
        Resource = module.eks[0].cluster_arn
      }
    ]
  })
}

resource "aws_iam_role_policy" "github_actions_secrets" {
  name = "secrets-read"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          aws_secretsmanager_secret.database[0].arn,
          aws_secretsmanager_secret.application.arn
        ]
      }
    ]
  })
}

# Output for GitHub Secrets
output "github_actions_role_arn" {
  description = "IAM role ARN for GitHub Actions (add to GitHub Secrets)"
  value       = aws_iam_role.github_actions.arn
}
```

## Configuration

### Environment Variables

#### GitHub Secrets (Repository Level)
- `AWS_ROLE_ARN_STAGING`: IAM role for staging deployment
- `AWS_ROLE_ARN_PROD`: IAM role for production deployment

#### GitHub Secrets (Environment Level)
- `DATABASE_SECRET_ARN`: ARN of database credentials in Secrets Manager
- `BACKEND_POD_ROLE_ARN`: IRSA role ARN for backend pods

#### Application Environment Variables (Kubernetes)
- `PORT`: 8787 (backend)
- `NODE_ENV`: production
- `DATABASE_URL`: Retrieved from Secrets Manager via IRSA

### Build Configuration
- **Backend Build**: `npm run build:api` → `packages/backend/dist/`
- **Frontend Build**: `npm run build` → `dist/`
- **Docker BuildKit**: Enabled for multi-stage builds

## Dependencies

### Production Dependencies
- Node.js 20 (runtime)
- Nginx alpine (frontend serving)
- PostgreSQL client libraries (backend)

### Build/Deploy Dependencies
- Docker
- kubectl
- kustomize
- AWS CLI
- GitHub Actions runners

## Testing Strategy

### Pre-deployment Validation
1. Docker image builds successfully
2. Container health checks pass locally
3. Kubernetes manifests validate with `kubectl apply --dry-run`

### Post-deployment Validation
1. Pod readiness checks (liveness/readiness probes)
2. Service endpoint accessibility
3. Database connectivity via `/healthz`
4. ALB target health checks

### Rollback Criteria
- Pod health checks fail after 5 minutes
- Backend `/healthz` returns non-200 status
- Frontend returns 5xx errors

## Security Considerations

### OIDC Authentication
- GitHub Actions authenticate via OIDC (no static AWS keys)
- Temporary credentials with scoped permissions
- Repository-specific trust relationship

### Secrets Management
- Database credentials in AWS Secrets Manager
- IRSA for pod-level AWS access
- Kubernetes secrets for runtime environment

### Container Security
- Multi-stage builds (minimal attack surface)
- Non-root user execution (to be added)
- Image vulnerability scanning via ECR

### Network Security
- Private EKS subnets (no public IPs)
- ALB in public subnets (internet-facing)
- Security groups restrict pod-to-RDS traffic

## Monitoring and Observability

### Application Logs
- stdout/stderr captured by EKS
- Forwarded to CloudWatch Logs
- Queryable via `kubectl logs`

### Metrics
- Kubernetes pod metrics (CPU, memory)
- ALB target health metrics
- Custom application metrics (future)

### Alerts
- Pod restart count > 5
- Deployment rollout failure
- ALB unhealthy target count

## Rollback Procedure

### Automated Rollback
```bash
kubectl rollout undo deployment/backend -n shovel-heroes
kubectl rollout undo deployment/frontend -n shovel-heroes
```

### Manual Rollback
1. Identify last known good image tag
2. Update deployment image tag
3. Apply manifest: `kubectl apply -k k8s/overlays/{env}`
4. Verify health checks pass
