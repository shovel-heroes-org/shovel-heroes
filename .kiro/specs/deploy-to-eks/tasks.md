# Implementation Tasks: AWS EKS Deployment Pipeline

## Project Context
**Feature**: deploy-to-eks
**Description**: GitHub Actions CD pipeline for deploying Shovel Heroes to AWS EKS
**Design Phase**: Completed ✅
**Ready for Implementation**: Yes

## Infrastructure Review Results

### ✅ Already Configured (No Action Needed)
- EKS cluster running (Kubernetes 1.31)
- ECR repositories created (backend + frontend)
- RDS PostgreSQL 16.9 provisioned
- IRSA (IAM Roles for Service Accounts) for backend pods
- VPC, subnets, security groups
- Secrets Manager with database credentials

### ⚠️ **Terraform Tasks Required** (Must Complete First)
- ❌ GitHub OIDC provider for GitHub Actions (not configured)
- ❌ ALB frontend target group (only backend target group exists)
- ❌ S3/CloudFront cleanup (files still exist: `cloudfront.tf`, `s3_website.tf`)

---

## Phase 0: Terraform Infrastructure Updates
**Repository**: `/Users/yihuang/workspace/shovel-heroes-terraform`

### 0.1 Add GitHub OIDC Provider for GitHub Actions
**Priority**: **CRITICAL** | **Estimated Time**: 30 minutes | **Dependencies**: None

**Description**: Create IAM OIDC provider and role to allow GitHub Actions to authenticate to AWS without storing static credentials.

**Tasks**:
- [ ] Create new file: `iam_github_actions.tf`
- [ ] Add `aws_iam_openid_connect_provider.github` resource
- [ ] Create IAM role `github_actions` with OIDC trust policy
- [ ] Configure trust policy to restrict to `repo:YOUR_ORG/shovel-heroes-k8s:*`
- [ ] Attach ECR write policy (`aws_iam_policy.ecr_write`)
- [ ] Create inline policy for EKS access (`eks:DescribeCluster`, `eks:AccessKubernetesApi`)
- [ ] Create inline policy for Secrets Manager read access
- [ ] Add output: `github_actions_role_arn`

**Acceptance Criteria**:
- [ ] OIDC provider created for `token.actions.githubusercontent.com`
- [ ] IAM role ARN available in Terraform outputs
- [ ] Trust policy restricts to specific GitHub repository
- [ ] Policies grant minimal required permissions (ECR, EKS, Secrets Manager)

**Files to Create**:
```hcl
# iam_github_actions.tf
data "tls_certificate" "github" {
  url = "https://token.actions.githubusercontent.com"
}

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.github.certificates[0].sha1_fingerprint]
  tags = local.common_tags
}

resource "aws_iam_role" "github_actions" {
  name_prefix = "${var.project_name}-${local.env_type}-github-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:YOUR_ORG/shovel-heroes-k8s:*"
        }
      }
    }]
  })

  tags = local.common_tags
}

# Attach ECR write policy
resource "aws_iam_role_policy_attachment" "github_actions_ecr" {
  role       = aws_iam_role.github_actions.name
  policy_arn = aws_iam_policy.ecr_write.arn
}

# EKS access policy
resource "aws_iam_role_policy" "github_actions_eks" {
  name = "eks-access"
  role = aws_iam_role.github_actions.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["eks:DescribeCluster", "eks:ListClusters", "eks:AccessKubernetesApi"]
      Resource = local.eks_enabled ? module.eks[0].cluster_arn : "*"
    }]
  })
}

# Secrets Manager read policy
resource "aws_iam_role_policy" "github_actions_secrets" {
  name = "secrets-read"
  role = aws_iam_role.github_actions.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
      Resource = [
        aws_secretsmanager_secret.database[0].arn,
        aws_secretsmanager_secret.application.arn
      ]
    }]
  })
}
```

**Files to Modify**:
```hcl
# outputs.tf - Add:
output "github_actions_role_arn" {
  description = "IAM role ARN for GitHub Actions OIDC authentication"
  value       = aws_iam_role.github_actions.arn
}
```

**Verification**:
```bash
cd /Users/yihuang/workspace/shovel-heroes-terraform
terraform fmt
terraform validate
terraform plan | grep github_actions
terraform apply
terraform output github_actions_role_arn
```

---

### 0.2 Add Frontend Target Group to ALB
**Priority**: **CRITICAL** | **Estimated Time**: 30 minutes | **Dependencies**: None

**Description**: Add frontend target group (port 80) and configure path-based routing for both frontend and backend.

**Current State**: ALB only has backend target group (port 8787) with listener rules for `/api/*`, `/healthz`, `/docs`.

**Tasks**:
- [ ] Edit `alb.tf`
- [ ] Add `aws_lb_target_group.frontend` resource (port 80, health check on `/`)
- [ ] Add listener rule for `/*` → frontend target group (priority 200, lowest priority = catch-all)
- [ ] Keep existing `/api/*`, `/healthz`, `/docs` rules (priority 100)
- [ ] Add output: `frontend_target_group_arn`

**Acceptance Criteria**:
- [ ] ALB has TWO target groups: backend (8787) and frontend (80)
- [ ] Path-based routing: `/api/*` → backend, `/*` → frontend
- [ ] Health checks configured for both target groups
- [ ] Frontend is default (catch-all) rule

**Files to Modify**:
```hcl
# alb.tf - Add after backend target group:

# Target group for frontend pods (Nginx)
resource "aws_lb_target_group" "frontend" {
  count = local.alb_enabled ? 1 : 0

  name_prefix = "fe-"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = aws_vpc.vpc.id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/"
    protocol            = "HTTP"
    port                = "traffic-port"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200-299"
  }

  deregistration_delay = 30

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${local.env_type}-frontend-tg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Listener rule for frontend (catch-all, lowest priority)
resource "aws_lb_listener_rule" "frontend" {
  count = local.alb_enabled ? 1 : 0

  listener_arn = aws_lb_listener.http[0].arn
  priority     = 200  # Lower priority = evaluated last

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend[0].arn
  }

  condition {
    path_pattern {
      values = ["/*"]
    }
  }

  tags = local.common_tags
}

# HTTPS frontend rule (if domain configured)
resource "aws_lb_listener_rule" "frontend_https" {
  count = local.alb_enabled && var.domain_name != "" ? 1 : 0

  listener_arn = aws_lb_listener.https[0].arn
  priority     = 200

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend[0].arn
  }

  condition {
    path_pattern {
      values = ["/*"]
    }
  }

  tags = local.common_tags
}
```

```hcl
# outputs.tf - Add:
output "frontend_target_group_arn" {
  description = "Frontend target group ARN for Kubernetes Ingress"
  value       = local.alb_enabled ? aws_lb_target_group.frontend[0].arn : null
}
```

**Verification**:
```bash
terraform plan | grep frontend_target_group
terraform apply
terraform output frontend_target_group_arn
```

---

### 0.3 Remove S3/CloudFront Resources
**Priority**: **MEDIUM** | **Estimated Time**: 20 minutes | **Dependencies**: None

**Description**: Clean up unused S3 frontend bucket and CloudFront distribution since frontend will be deployed to EKS.

**Current State**: Files `cloudfront.tf` and `s3_website.tf` exist. Frontend bucket defined in `s3.tf`.

**Tasks**:
- [ ] Delete `cloudfront.tf`
- [ ] Delete `s3_website.tf`
- [ ] Edit `s3.tf` to remove `aws_s3_bucket.frontend` and related resources
- [ ] Keep `aws_s3_bucket.backups` and `aws_s3_bucket.logs`
- [ ] Edit `outputs.tf` to remove `frontend_bucket_name`, `cloudfront_distribution_id`, `frontend_url`
- [ ] Run `terraform plan` to verify only frontend resources will be destroyed

**Acceptance Criteria**:
- [ ] CloudFront distribution removed
- [ ] S3 frontend bucket removed
- [ ] Backups and logs buckets remain
- [ ] No other resources affected

**Verification**:
```bash
terraform plan | grep -E "(cloudfront|frontend.*bucket)" | grep destroy
terraform apply
terraform state list | grep -E "(s3.*frontend|cloudfront)"
# Should show nothing
```

---

## Phase 1: Docker Configuration

### 1.1 Create Backend Dockerfile
**Priority**: High | **Estimated Time**: 30 minutes | **Dependencies**: None

**Description**: Create multi-stage Dockerfile for backend Fastify application.

**Tasks**:
- [ ] Create `Dockerfile.backend` in repository root
- [ ] Stage 1: Use `node:20-alpine` as builder
- [ ] Install workspace dependencies for backend and shared-types
- [ ] Run `npm run build:api` to compile TypeScript
- [ ] Stage 2: Use `node:20-alpine` for production
- [ ] Copy only compiled dist/ and node_modules
- [ ] Expose port 8787
- [ ] Set CMD to `node packages/backend/dist/index.js`

**Acceptance Criteria**:
- [ ] Dockerfile builds successfully
- [ ] Final image size < 200MB
- [ ] Backend starts and responds to health checks
- [ ] Build uses layer caching effectively

**Files to Create**:
- `Dockerfile.backend`

**Verification**:
```bash
docker build -f Dockerfile.backend -t backend:test .
docker run -p 8787:8787 backend:test
curl http://localhost:8787/healthz
```

---

### 1.2 Create Frontend Dockerfile
**Priority**: High | **Estimated Time**: 30 minutes | **Dependencies**: None

**Description**: Create multi-stage Dockerfile for frontend Nginx-served React app.

**Tasks**:
- [ ] Create `Dockerfile.frontend` in repository root
- [ ] Stage 1: Use `node:20-alpine` as builder
- [ ] Run `npm ci` and `npm run build`
- [ ] Stage 2: Use `nginx:alpine`
- [ ] Copy built assets from `dist/` to `/usr/share/nginx/html`
- [ ] Copy nginx.conf
- [ ] Expose port 80

**Acceptance Criteria**:
- [ ] Dockerfile builds successfully
- [ ] Final image size < 50MB
- [ ] Nginx serves React app correctly
- [ ] SPA routing works (404s redirect to index.html)

**Files to Create**:
- `Dockerfile.frontend`

**Verification**:
```bash
docker build -f Dockerfile.frontend -t frontend:test .
docker run -p 8080:80 frontend:test
curl http://localhost:8080
```

---

### 1.3 Create Nginx Configuration
**Priority**: High | **Estimated Time**: 15 minutes | **Dependencies**: 1.2

**Description**: Create Nginx config for SPA routing and security headers.

**Tasks**:
- [ ] Create `nginx.conf` in repository root
- [ ] Configure SPA fallback routing (`try_files $uri $uri/ /index.html`)
- [ ] Add cache headers for static assets (1 year)
- [ ] Add security headers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection)
- [ ] Listen on port 80

**Acceptance Criteria**:
- [ ] SPA routing works (all paths serve index.html)
- [ ] Static assets have proper cache headers
- [ ] Security headers present in responses

**Files to Create**:
- `nginx.conf`

**Verification**:
```bash
# After building frontend image
docker run -p 8080:80 frontend:test
curl -I http://localhost:8080/some/route
# Should return 200 with index.html content
```

---

## Phase 2: Kubernetes Manifests

### 2.1 Create Base Kubernetes Manifests
**Priority**: High | **Estimated Time**: 60 minutes | **Dependencies**: None

**Description**: Create Kustomize base manifests for namespace, service accounts, deployments, and services.

**Tasks**:
- [ ] Create directory structure: `k8s/base/`
- [ ] Create `namespace.yaml` (shovel-heroes namespace)
- [ ] Create `serviceaccount.yaml` with IRSA annotation
- [ ] Create `backend-deployment.yaml` (2 replicas, health probes, resource limits)
- [ ] Create `backend-service.yaml` (ClusterIP, port 8787)
- [ ] Create `frontend-deployment.yaml` (2 replicas, health probes, resource limits)
- [ ] Create `frontend-service.yaml` (ClusterIP, port 80)
- [ ] Create `ingress.yaml` (ALB Ingress with path-based routing)
- [ ] Create `kustomization.yaml` listing all resources

**Acceptance Criteria**:
- [ ] All manifests validate with `kubectl apply --dry-run`
- [ ] Image placeholders use variables
- [ ] Health probes configured correctly
- [ ] Resource requests/limits defined

**Files to Create**:
- `k8s/base/namespace.yaml`
- `k8s/base/serviceaccount.yaml`
- `k8s/base/backend-deployment.yaml`
- `k8s/base/backend-service.yaml`
- `k8s/base/frontend-deployment.yaml`
- `k8s/base/frontend-service.yaml`
- `k8s/base/ingress.yaml`
- `k8s/base/kustomization.yaml`

**Verification**:
```bash
kubectl apply --dry-run=client -k k8s/base/
```

---

### 2.2 Create Environment Overlays
**Priority**: Medium | **Estimated Time**: 30 minutes | **Dependencies**: 2.1

**Description**: Create Kustomize overlays for dev, staging, and production environments.

**Tasks**:
- [ ] Create `k8s/overlays/dev/kustomization.yaml`
- [ ] Create `k8s/overlays/staging/kustomization.yaml`
- [ ] Create `k8s/overlays/production/kustomization.yaml`
- [ ] Configure replica patches for each environment
- [ ] Set environment-specific name prefixes
- [ ] Configure image tag overrides

**Acceptance Criteria**:
- [ ] Each overlay references base manifests
- [ ] Replica counts differ by environment (dev:1, staging:2, prod:2)
- [ ] Kustomize build succeeds for all overlays

**Files to Create**:
- `k8s/overlays/dev/kustomization.yaml`
- `k8s/overlays/staging/kustomization.yaml`
- `k8s/overlays/production/kustomization.yaml`

**Verification**:
```bash
kubectl kustomize k8s/overlays/staging
kubectl kustomize k8s/overlays/production
```

---

## Phase 3: GitHub Actions Workflows

### 3.1 Create Staging Deployment Workflow
**Priority**: High | **Estimated Time**: 90 minutes | **Dependencies**: 1.1, 1.2, 2.1

**Description**: Create GitHub Actions workflow for automatic deployment to staging on push to main.

**Tasks**:
- [ ] Create `.github/workflows/deploy-staging.yml`
- [ ] Configure trigger: push to `main` and `workflow_dispatch`
- [ ] Set permissions: `id-token: write`, `contents: read`
- [ ] Add job step: Checkout code
- [ ] Add job step: Configure AWS credentials via OIDC
- [ ] Add job step: Login to Amazon ECR
- [ ] Add job step: Build and push backend image (with commit SHA tag)
- [ ] Add job step: Build and push frontend image (with commit SHA tag)
- [ ] Add job step: Configure kubectl for EKS
- [ ] Add job step: Create namespace if not exists
- [ ] Add job step: Retrieve database credentials from Secrets Manager
- [ ] Add job step: Create Kubernetes secret for database
- [ ] Add job step: Deploy using Kustomize
- [ ] Add job step: Wait for deployments to complete
- [ ] Add job step: Verify pod health
- [ ] Add job step: Display deployment info

**Acceptance Criteria**:
- [ ] Workflow triggers on push to main
- [ ] OIDC authentication works
- [ ] Docker images build and push successfully
- [ ] Kubernetes resources deploy correctly
- [ ] Health checks pass

**Files to Create**:
- `.github/workflows/deploy-staging.yml`

**Verification**:
```bash
# Push to main and monitor GitHub Actions
# Or trigger manually via workflow_dispatch
```

---

### 3.2 Create Production Deployment Workflow
**Priority**: Medium | **Estimated Time**: 45 minutes | **Dependencies**: 3.1

**Description**: Create GitHub Actions workflow for production deployment with manual approval.

**Tasks**:
- [ ] Create `.github/workflows/deploy-production.yml`
- [ ] Copy from staging workflow
- [ ] Change trigger to `workflow_dispatch` only
- [ ] Add environment protection: `production`
- [ ] Update cluster name to production
- [ ] Use production overlay for Kustomize

**Acceptance Criteria**:
- [ ] Manual trigger only
- [ ] Requires approval (via GitHub Environment settings)
- [ ] Deploys to production cluster
- [ ] Same health checks as staging

**Files to Create**:
- `.github/workflows/deploy-production.yml`

**Verification**:
```bash
# Trigger manually and approve deployment
```

---

## Phase 4: Configuration & Secrets

### 4.1 Configure GitHub Repository Secrets
**Priority**: High | **Estimated Time**: 15 minutes | **Dependencies**: None (Terraform outputs already available)

**Description**: Add required secrets to GitHub repository.

**Tasks**:
- [ ] Get `github_actions_role_arn` from Terraform outputs
- [ ] Add repository secret: `AWS_ROLE_ARN_STAGING`
- [ ] Add repository secret: `AWS_ROLE_ARN_PROD` (if prod exists)
- [ ] Create GitHub Environment: `staging`
- [ ] Create GitHub Environment: `production` (with protection rules)
- [ ] Add environment secret to staging: `DATABASE_SECRET_ARN`
- [ ] Add environment secret to staging: `BACKEND_POD_ROLE_ARN`
- [ ] Add environment secret to production: `DATABASE_SECRET_ARN`
- [ ] Add environment secret to production: `BACKEND_POD_ROLE_ARN`

**Acceptance Criteria**:
- [ ] All secrets configured correctly
- [ ] Environment protection rules active for production
- [ ] Secrets accessible in workflow runs

**Verification**:
- Check GitHub repo settings → Secrets and variables → Actions
- Check GitHub repo settings → Environments

---

## Phase 5: Testing & Validation

### 5.1 Test Docker Builds Locally
**Priority**: High | **Estimated Time**: 30 minutes | **Dependencies**: 1.1, 1.2, 1.3

**Description**: Verify Docker images build and run correctly locally.

**Tasks**:
- [ ] Build backend image locally
- [ ] Run backend container and test health check
- [ ] Build frontend image locally
- [ ] Run frontend container and verify SPA routing
- [ ] Test with Docker Compose (optional)

**Acceptance Criteria**:
- [ ] Backend responds to `/healthz`
- [ ] Frontend serves index.html for all routes
- [ ] No build errors or warnings

**Verification**:
```bash
docker build -f Dockerfile.backend -t backend:local .
docker run -p 8787:8787 backend:local
curl http://localhost:8787/healthz

docker build -f Dockerfile.frontend -t frontend:local .
docker run -p 8080:80 frontend:local
curl http://localhost:8080
```

---

### 5.2 Validate Kubernetes Manifests
**Priority**: High | **Estimated Time**: 20 minutes | **Dependencies**: 2.1, 2.2

**Description**: Validate all Kubernetes manifests without deploying.

**Tasks**:
- [ ] Install kubectl and kustomize
- [ ] Run `kubectl apply --dry-run` for base manifests
- [ ] Run `kubectl kustomize` for all overlays
- [ ] Check for syntax errors
- [ ] Verify image references

**Acceptance Criteria**:
- [ ] No validation errors
- [ ] Kustomize builds successfully
- [ ] Image placeholders properly formatted

**Verification**:
```bash
kubectl apply --dry-run=client -k k8s/base/
kubectl kustomize k8s/overlays/staging > staging-output.yaml
cat staging-output.yaml  # Review
```

---

### 5.3 Deploy to Staging and Verify
**Priority**: High | **Estimated Time**: 45 minutes | **Dependencies**: 3.1, 4.1

**Description**: Execute first deployment to staging and verify all components.

**Tasks**:
- [ ] Trigger staging workflow (push to main or manual)
- [ ] Monitor workflow execution
- [ ] Check pod status: `kubectl get pods -n shovel-heroes`
- [ ] Test backend health: `http://{alb-dns}/healthz`
- [ ] Test frontend: `http://{alb-dns}/`
- [ ] Test API routing: `http://{alb-dns}/api/...`
- [ ] Check CloudWatch logs
- [ ] Verify database connectivity

**Acceptance Criteria**:
- [ ] All pods running and healthy
- [ ] Frontend accessible via ALB
- [ ] Backend API accessible via ALB
- [ ] Database connection successful
- [ ] No errors in logs

**Verification**:
```bash
kubectl get pods -n shovel-heroes
kubectl get ingress -n shovel-heroes
curl http://{alb-dns}/healthz
curl http://{alb-dns}/
```

---

### 5.4 Test Rollback Procedure
**Priority**: Medium | **Estimated Time**: 30 minutes | **Dependencies**: 5.3

**Description**: Verify rollback works correctly.

**Tasks**:
- [ ] Deploy a "bad" version (e.g., image with wrong tag)
- [ ] Watch deployment fail
- [ ] Execute rollback: `kubectl rollout undo deployment/backend -n shovel-heroes`
- [ ] Verify previous version restored
- [ ] Test automated rollback in workflow (if implemented)

**Acceptance Criteria**:
- [ ] Rollback completes within 2 minutes
- [ ] Previous version restored successfully
- [ ] Service remains available during rollback

**Verification**:
```bash
kubectl rollout history deployment/backend -n shovel-heroes
kubectl rollout undo deployment/backend -n shovel-heroes
kubectl get pods -n shovel-heroes -w
```

---

## Phase 6: Documentation

### 6.1 Create Deployment Runbook
**Priority**: Medium | **Estimated Time**: 30 minutes | **Dependencies**: 5.3

**Description**: Document manual deployment and troubleshooting procedures.

**Tasks**:
- [ ] Create `docs/DEPLOYMENT_RUNBOOK.md`
- [ ] Document manual deployment steps
- [ ] Document rollback procedure
- [ ] Document troubleshooting steps
- [ ] Document environment variables
- [ ] Add links to CloudWatch dashboards

**Acceptance Criteria**:
- [ ] Runbook covers all common scenarios
- [ ] Clear step-by-step instructions
- [ ] Troubleshooting section included

**Files to Create**:
- `docs/DEPLOYMENT_RUNBOOK.md`

---

### 6.2 Update README with Deployment Info
**Priority**: Low | **Estimated Time**: 15 minutes | **Dependencies**: 6.1

**Description**: Update main README with deployment information.

**Tasks**:
- [ ] Add deployment section to README
- [ ] Link to runbook
- [ ] Document GitHub Actions workflows
- [ ] Add ALB endpoint information

**Acceptance Criteria**:
- [ ] README updated
- [ ] Links working
- [ ] Clear instructions

**Files to Modify**:
- `README.md`

---

## Summary

### Total Tasks: 18
- **Phase 0 (Terraform)**: 3 tasks ⚠️ **MUST COMPLETE FIRST**
- **Phase 1 (Docker)**: 3 tasks
- **Phase 2 (Kubernetes)**: 2 tasks
- **Phase 3 (CI/CD)**: 2 tasks
- **Phase 4 (Configuration)**: 1 task
- **Phase 5 (Testing)**: 4 tasks
- **Phase 6 (Documentation)**: 2 tasks

### Infrastructure Status:
✅ **Already Configured**:
- EKS cluster (Kubernetes 1.31)
- ECR repositories (backend + frontend)
- RDS PostgreSQL 16.9
- IRSA for backend pods
- VPC, subnets, security groups
- Secrets Manager

❌ **Requires Terraform Updates** (Phase 0):
- GitHub OIDC provider for GitHub Actions
- ALB frontend target group + path routing
- S3/CloudFront cleanup

### Critical Path:
1. **Phase 0: Terraform Infrastructure** (0.1, 0.2, 0.3) - **BLOCKING**
2. Phase 1: Docker Configuration (1.1, 1.2, 1.3)
3. Phase 2: Kubernetes Manifests (2.1)
4. Phase 3: GitHub Actions (3.1)
5. Phase 4: Configuration (4.1)
6. Phase 5: Testing (5.1-5.4)

### Estimated Total Time: 7.5-9.5 hours
- Phase 0 (Terraform): 1.5 hours
- Phase 1-6 (Application): 6-8 hours

### ⚠️ IMPORTANT
**Phase 0 tasks must be completed in the Terraform repository** (`/Users/yihuang/workspace/shovel-heroes-terraform`) **before proceeding with Phase 1+**. The GitHub Actions workflows will fail without GitHub OIDC provider and ALB frontend target group.