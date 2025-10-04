# Requirements Document: AWS EKS Deployment Pipeline

## Introduction
This document outlines requirements for implementing a GitHub Actions CD pipeline to deploy the Shovel Heroes disaster relief platform to AWS EKS (Elastic Kubernetes Service).

**Project**: Shovel Heroes
**Feature**: GitHub Actions CD Pipeline for AWS EKS Deployment
**Version**: 0.1.0
**Infrastructure Repository**: `/Users/yihuang/workspace/shovel-heroes-terraform`

Generated on: 2025-10-03T14:08:18.713Z

## Project Context
Shovel Heroes is a full-stack monorepo disaster relief coordination platform with:
- **Frontend**: Vite + React + Tailwind (static build output)
- **Backend**: Fastify + Node.js + PostgreSQL (containerized service)
- **Architecture**: Monorepo with shared TypeScript types via OpenAPI

## Existing Infrastructure (Terraform-managed)
The following AWS resources are **already provisioned** via Terraform:

### Compute & Networking
- **EKS Cluster**: Kubernetes 1.31 with Amazon Linux 2023 nodes
- **Cluster Name**: `shovel-heroes-{env}-eks` (e.g., `shovel-heroes-prod-eks`)
- **Region**: `ap-east-2` (Asia Pacific - Hong Kong)
- **VPC**: 10.0.0.0/16 with public/private subnets across 2-3 AZs
- **Node Groups**: SPOT instances (t3.small/medium for non-prod, t3.medium for prod)
- **IRSA Enabled**: IAM Roles for Service Accounts configured

### Container Registry
- **ECR Repositories** (already exist):
  - `shovel-heroes-{env}-shovel-heroes-backend`
  - `shovel-heroes-{env}-shovel-heroes-frontend` (will be used for Nginx-based frontend)
- **Image Scanning**: Enabled on push
- **Lifecycle Policy**: Retains last 30 images (prod) / 10 images (non-prod)

### Database
- **RDS PostgreSQL 16.9**
- **Instance**: db.t3.micro (non-prod) / db.t3.small (prod)
- **Multi-AZ**: Enabled for production
- **Encryption**: KMS-encrypted at rest
- **Backup Retention**: 1 day (non-prod) / 7 days (prod)
- **Credentials**: Stored in AWS Secrets Manager

### Load Balancing
- **ALB**: Application Load Balancer with multiple target groups
- **Backend Target Group**: Port 8787 (health check: `/healthz`)
- **Frontend Target Group**: Port 80 (health check: `/` or `/index.html`)
- **Path-Based Routing**:
  - `/api/*` → Backend service (port 8787)
  - `/*` → Frontend service (port 80)

### Security & Secrets
- **AWS Secrets Manager**: Database credentials, JWT secrets, application config
- **Security Groups**: Pre-configured for ALB, backend pods, and RDS
- **IAM Roles**:
  - `backend-pods` role with IRSA for accessing Secrets Manager, S3, CloudWatch
  - ECR read/write policies already attached

### Monitoring
- **CloudWatch Logs**: EKS cluster logs, application logs
- **CloudWatch Alarms**: CPU, RDS, ALB health monitoring
- **Retention**: 3 days (non-prod) / 30 days (prod)

## Functional Requirements

### FR-1: GitHub Actions Workflow Configuration
**Objective:** Create automated CD pipeline triggered by main branch commits

#### Acceptance Criteria
1. WHEN code is pushed to `main` branch THEN GitHub Actions workflow SHALL trigger automatically
2. WHEN pull request is merged to `main` THEN deployment pipeline SHALL execute
3. IF workflow is manually triggered THEN it SHALL support workflow_dispatch event
4. WHILE workflow runs IT SHALL provide clear status indicators and logs

### FR-2: Docker Image Build and Push to Existing ECR
**Objective:** Build and push containerized images for both backend and frontend

#### Acceptance Criteria
1. Backend Docker image SHALL:
   - Create `Dockerfile.backend` in repository root
   - Use multi-stage build for optimized size (Node.js 20 base)
   - Install workspace dependencies (`npm install`)
   - Build backend (`npm run build:api`)
   - Run `node packages/backend/dist/index.js` as entrypoint
   - Expose port 8787
   - Be tagged with:
     - Git commit SHA: `{ecr-repo}:{github.sha}`
     - Latest tag: `{ecr-repo}:latest`

2. Frontend Docker image SHALL:
   - Create `Dockerfile.frontend` in repository root
   - Use multi-stage build:
     - Stage 1: Node.js 20 to build assets (`npm run build` → `dist/`)
     - Stage 2: Nginx alpine to serve static files
   - Copy built assets from `dist/` to Nginx `/usr/share/nginx/html`
   - Configure Nginx for SPA routing (fallback to `index.html`)
   - Expose port 80
   - Be tagged with:
     - Git commit SHA: `{ecr-repo}:{github.sha}`
     - Latest tag: `{ecr-repo}:latest`

3. Images SHALL be pushed to existing ECR repositories:
   - Backend: `shovel-heroes-{env}-shovel-heroes-backend`
   - Frontend: `shovel-heroes-{env}-shovel-heroes-frontend`
   - Use AWS ECR login via GitHub Actions: `aws-actions/amazon-ecr-login@v2`
   - Leverage existing lifecycle policies (auto-cleanup)

### FR-3: Kubernetes Manifests for Existing EKS Cluster
**Objective:** Define Kubernetes resources for deployment to pre-existing EKS cluster

#### Acceptance Criteria
1. Namespace SHALL:
   - Use namespace: `shovel-heroes`
   - Create if not exists via pipeline

2. ServiceAccount SHALL:
   - Name: `shovel-heroes-backend`
   - Annotate with IRSA role ARN from Terraform outputs: `backend_pod_role_arn`
   - Enable access to AWS Secrets Manager, S3, CloudWatch

3. Backend Deployment SHALL:
   - Name: `backend`
   - Replicas: 1 (non-prod) / 2 (prod) - align with `local.backend_desired_replicas`
   - Container image from ECR: `{ecr-url}/shovel-heroes-{env}-shovel-heroes-backend:{tag}`
   - Container port: 8787
   - Environment variables:
     - `PORT=8787`
     - `NODE_ENV=production`
     - `DATABASE_URL` (from Kubernetes Secret or AWS Secrets Manager via CSI driver)
   - Liveness probe: `GET /healthz` (initial delay 30s, period 10s)
   - Readiness probe: `GET /healthz` (initial delay 10s, period 5s)
   - Resource requests: `cpu=500m, memory=512Mi`
   - Resource limits: `cpu=1000m, memory=1Gi`
   - Rolling update strategy: `maxSurge=1, maxUnavailable=0` (zero downtime)

4. Backend Service SHALL:
   - Type: `NodePort` or `ClusterIP`
   - Port: 8787 → targetPort: 8787
   - Selector: `app=backend`
   - Integrated with existing ALB via Ingress or TargetGroupBinding

5. Database Connection SHALL:
   - Retrieve `DATABASE_URL` from AWS Secrets Manager secret ARN (from Terraform)
   - Use External Secrets Operator OR Kubernetes CSI driver for secret sync
   - Fallback: Manual secret creation in pipeline from Secrets Manager

6. Frontend Deployment SHALL:
   - Name: `frontend`
   - Replicas: 1 (non-prod) / 2 (prod)
   - Container image from ECR: `{ecr-url}/shovel-heroes-{env}-shovel-heroes-frontend:{tag}`
   - Container port: 80
   - Liveness probe: `GET / or /index.html` (initial delay 10s, period 10s)
   - Readiness probe: `GET / or /index.html` (initial delay 5s, period 5s)
   - Resource requests: `cpu=100m, memory=128Mi`
   - Resource limits: `cpu=200m, memory=256Mi`
   - Rolling update strategy: `maxSurge=1, maxUnavailable=0`

7. Frontend Service SHALL:
   - Type: `NodePort` or `ClusterIP`
   - Port: 80 → targetPort: 80
   - Selector: `app=frontend`
   - Integrated with ALB via Ingress path routing

8. Ingress/ALB Routing SHALL:
   - Path `/api/*` → backend service (port 8787)
   - Path `/*` → frontend service (port 80)
   - Single ALB endpoint for both frontend and backend

### FR-4: AWS Authentication via GitHub OIDC (To Be Created)
**Objective:** Implement secure AWS authentication for GitHub Actions without static credentials

#### Acceptance Criteria
1. Terraform SHALL create GitHub OIDC provider in AWS (if not exists)
2. Terraform SHALL create IAM role for GitHub Actions with permissions:
   - ECR: `ecr:GetAuthorizationToken`, `ecr:BatchGetImage`, `ecr:PutImage`, `ecr:InitiateLayerUpload`, `ecr:UploadLayerPart`, `ecr:CompleteLayerUpload`
   - EKS: `eks:DescribeCluster`, `eks:ListClusters`, `eks:AccessKubernetesApi`
   - Secrets Manager: Read-only access to retrieve outputs
3. Pipeline SHALL authenticate using `aws-actions/configure-aws-credentials@v4` with OIDC
4. Pipeline SHALL configure kubectl: `aws eks update-kubeconfig --name {cluster-name} --region ap-east-2`
5. Pipeline SHALL apply Kubernetes manifests using `kubectl apply -f k8s/`
6. IF deployment fails THEN it SHALL rollback using `kubectl rollout undo`
7. WHEN deployment succeeds THEN it SHALL verify pod health:
   - Backend: `kubectl wait --for=condition=ready pod -l app=backend`
   - Frontend: `kubectl wait --for=condition=ready pod -l app=frontend`

### FR-5: Environment-Specific Configuration
**Objective:** Support multiple deployment environments matching Terraform setup

#### Acceptance Criteria
1. Pipeline SHALL support environments based on Terraform `env_type`:
   - `dev`: Development environment
   - `staging`: Staging environment
   - `prod`: Production environment
2. Environment detection SHALL use:
   - Branch-based: `main` → prod, `staging` → staging, `develop` → dev
   - OR manual workflow_dispatch with environment input
3. WHEN deploying to `prod` THEN require GitHub environment protection rule (manual approval)
4. Each environment SHALL use separate:
   - EKS cluster: `shovel-heroes-{env}-eks`
   - ECR repositories:
     - Backend: `shovel-heroes-{env}-shovel-heroes-backend`
     - Frontend: `shovel-heroes-{env}-shovel-heroes-frontend`
   - Kubernetes namespace: `shovel-heroes` (same namespace, different clusters)

### FR-6: Database Schema Initialization (Current State)
**Objective:** Handle database schema with existing auto-initialization

#### Acceptance Criteria
1. Backend application SHALL auto-create tables on startup (current behavior via `db-init.ts`)
2. Pipeline SHALL NOT run separate migration jobs (deferred to future)
3. Database schema updates SHALL be included in application code
4. WHEN backend pod starts THEN it SHALL execute `db-init.ts` to ensure schema exists
5. Future enhancement: Implement `node-pg-migrate` for versioned migrations

### FR-7: Deployment Health Verification and Rollback
**Objective:** Ensure deployment health and enable quick rollback for both services

#### Acceptance Criteria
1. Pipeline SHALL verify deployment status for BOTH frontend and backend:
   - Backend: `kubectl rollout status deployment/backend -n shovel-heroes --timeout=300s`
   - Frontend: `kubectl rollout status deployment/frontend -n shovel-heroes --timeout=300s`
   - Backend pods: `kubectl wait --for=condition=ready pod -l app=backend -n shovel-heroes --timeout=300s`
   - Frontend pods: `kubectl wait --for=condition=ready pod -l app=frontend -n shovel-heroes --timeout=300s`
2. IF rollout times out or pods fail health checks THEN:
   - Execute rollback for failed service: `kubectl rollout undo deployment/{service} -n shovel-heroes`
   - Mark GitHub Actions job as failed
   - Restore previous working image
3. Pipeline SHALL query existing CloudWatch dashboard (already created by Terraform)
4. Deployment status SHALL be visible in GitHub Actions UI
5. Optional: Post-deployment notification via GitHub commit status or Slack webhook

## Non-Functional Requirements

### NFR-1: Performance
- Docker image build SHALL complete within 5 minutes
- Kubernetes deployment SHALL complete within 3 minutes
- Total pipeline execution SHALL complete within 10 minutes
- Rolling update SHALL maintain zero downtime

### NFR-2: Security
- AWS credentials SHALL be stored in GitHub Secrets
- Database credentials SHALL use Kubernetes Secrets (encrypted at rest)
- Docker images SHALL be scanned for vulnerabilities (Trivy or similar)
- OIDC authentication SHALL be preferred over static IAM keys
- Secrets SHALL NOT be logged in GitHub Actions output

### NFR-3: Reliability
- Pipeline SHALL handle transient AWS/EKS failures with retries
- Failed deployments SHALL automatically rollback
- Deployment process SHALL be idempotent
- Logs SHALL be retained for 30 days minimum

### NFR-4: Maintainability
- Kubernetes manifests SHALL use Kustomize or Helm for templating
- GitHub Actions workflow SHALL be modular and reusable
- Configuration SHALL be externalized (not hardcoded)
- Documentation SHALL include runbook for manual deployment

### NFR-5: Observability
- All pipeline steps SHALL log detailed output
- Deployment events SHALL be visible in GitHub Actions UI
- EKS cluster events SHALL be queryable via kubectl
- Application logs SHALL be aggregated (CloudWatch Logs integration)

## Technical Constraints

### TC-1: Technology Stack (Existing Infrastructure)
- **CI/CD**: GitHub Actions with OIDC authentication
- **Container Registry**: Amazon ECR (pre-existing repositories)
- **Orchestration**: AWS EKS Kubernetes 1.31 with AL2023 nodes
- **IaC**: Terraform (managed in separate repository: `/Users/yihuang/workspace/shovel-heroes-terraform`)
- **Database**: RDS PostgreSQL 16.9 (multi-AZ in prod, already provisioned)
- **Region**: `ap-east-2` (Asia Pacific - Hong Kong)
- **Load Balancer**: ALB (Application Load Balancer, already configured)
- **CDN**: CloudFront (production only, already configured)
- **Secrets**: AWS Secrets Manager (credentials already stored)

### TC-2: Repository Structure
```
shovel-heroes-k8s/           # Application repository
├── .github/
│   └── workflows/
│       ├── deploy-staging.yml        # Staging deployment
│       └── deploy-production.yml     # Production deployment
├── k8s/                              # Kubernetes manifests
│   ├── base/                         # Base manifests (Kustomize)
│   │   ├── namespace.yaml
│   │   ├── serviceaccount.yaml
│   │   ├── backend-deployment.yaml
│   │   ├── backend-service.yaml
│   │   ├── frontend-deployment.yaml
│   │   ├── frontend-service.yaml
│   │   ├── ingress.yaml              # ALB Ingress with path routing
│   │   └── kustomization.yaml
│   ├── overlays/
│   │   ├── dev/
│   │   │   └── kustomization.yaml    # Dev environment patches
│   │   ├── staging/
│   │   │   └── kustomization.yaml    # Staging environment patches
│   │   └── production/
│   │       └── kustomization.yaml    # Production environment patches
├── Dockerfile.backend                # Backend multi-stage build
├── Dockerfile.frontend               # Frontend Nginx multi-stage build
├── nginx.conf                        # Nginx config for SPA routing
├── packages/
│   ├── backend/                      # Fastify backend
│   └── shared-types/                 # OpenAPI types
└── src/                              # Frontend React app

shovel-heroes-terraform/     # Infrastructure repository (separate)
└── (All Terraform infrastructure is here)
```

### TC-3: GitHub Secrets/Variables Required

**Repository Secrets** (to be added):
- `AWS_REGION`: `ap-east-2`
- `AWS_ROLE_ARN_DEV`: IAM role for dev environment (from Terraform output)
- `AWS_ROLE_ARN_STAGING`: IAM role for staging (from Terraform output)
- `AWS_ROLE_ARN_PROD`: IAM role for production (from Terraform output)

**Repository Variables** (to be added):
- `EKS_CLUSTER_NAME_DEV`: `shovel-heroes-dev-eks`
- `EKS_CLUSTER_NAME_STAGING`: `shovel-heroes-staging-eks`
- `EKS_CLUSTER_NAME_PROD`: `shovel-heroes-prod-eks`

**Environment Secrets** (GitHub Environments: dev, staging, production):
- `BACKEND_POD_ROLE_ARN`: From Terraform output `backend_pod_role_arn`
- `DATABASE_SECRET_ARN`: From Terraform output `database_secret_arn`

**Note**: Database credentials are stored in AWS Secrets Manager (already configured by Terraform), not in GitHub Secrets.

### TC-4: Terraform Outputs Required
The following outputs from `shovel-heroes-terraform` repository are needed:
- `eks_cluster_name`: EKS cluster name
- `ecr_repository_urls`: ECR repository URLs map (backend and frontend)
- `backend_pod_role_arn`: IAM role ARN for backend pods (IRSA)
- `database_secret_arn`: ARN of database credentials in Secrets Manager
- `alb_dns_name`: ALB DNS name for accessing both frontend and backend
- `kubectl_config_command`: Command to configure kubectl

Access outputs via:
```bash
cd /Users/yihuang/workspace/shovel-heroes-terraform
terraform output -json > outputs.json
```

## Out of Scope
- **EKS cluster provisioning**: Already managed by Terraform
- **RDS database provisioning**: Already managed by Terraform
- **VPC/Networking setup**: Already managed by Terraform
- **ALB/Security Groups**: Already managed by Terraform
- **SSL certificate management**: ACM certificates already configured
- **WAF rules**: Already configured in Terraform
- **Monitoring infrastructure**: CloudWatch dashboards/alarms already exist
- **Initial OIDC provider setup**: To be added to Terraform (prerequisite)

## Terraform Cleanup Required

The following **unused resources** should be removed from `/Users/yihuang/workspace/shovel-heroes-terraform`:

### Resources to Remove:
1. **S3 Frontend Bucket** (`s3.tf` or `s3_website.tf`):
   - `aws_s3_bucket.frontend`
   - `aws_s3_bucket_website_configuration.frontend`
   - `aws_s3_bucket_policy.frontend`
   - Related KMS key for S3 encryption

2. **CloudFront Distribution** (`cloudfront.tf`):
   - `aws_cloudfront_distribution.frontend`
   - `aws_cloudfront_origin_access_control` (if dedicated to frontend)
   - CloudFront logging bucket (if separate)

3. **ACM Certificate (us-east-1)** (`acm.tf`):
   - Certificate for CloudFront (if dedicated, otherwise keep for ALB)

4. **IAM Policies** (in `iam_app.tf`):
   - S3 write policy for frontend bucket
   - CloudFront invalidation policy

5. **Terraform Outputs** (`outputs.tf`):
   - `frontend_bucket_name`
   - `frontend_bucket_regional_domain`
   - `cloudfront_distribution_id`
   - `cloudfront_domain_name`
   - `frontend_url`

### Resources to Keep/Modify:
- **ALB** (`alb.tf`): Keep and ensure it has target groups for BOTH:
  - Backend target group (port 8787, path `/api/*`)
  - Frontend target group (port 80, path `/*`)
- **ECR Repositories** (`ecr.tf`): Keep both backend and frontend repos
- **VPC, EKS, RDS, Secrets Manager**: Keep all

### Cleanup Commands:
```bash
cd /Users/yihuang/workspace/shovel-heroes-terraform

# 1. Remove S3 frontend resources
rm -f s3_website.tf  # If frontend S3 is in separate file
# OR edit s3.tf to remove frontend bucket resources

# 2. Remove CloudFront resources
rm -f cloudfront.tf

# 3. Edit iam_app.tf
# Remove S3 frontend and CloudFront policies

# 4. Edit outputs.tf
# Remove S3 and CloudFront outputs

# 5. Plan and apply changes
terraform plan -out=cleanup.tfplan
terraform apply cleanup.tfplan

# 6. Commit changes
git add .
git commit -m "refactor: remove S3/CloudFront, deploy frontend to EKS"
```

### Post-Cleanup Verification:
```bash
# Verify remaining resources
terraform state list | grep -E "(s3|cloudfront)"
# Should only show S3 buckets for logs/backups, not frontend

# Verify outputs
terraform output
# Should not include frontend_bucket_name or cloudfront_distribution_id
```

## Success Criteria

### Automated Deployment Flow
1. **Push to `main` branch**:
   - GitHub Actions workflow triggers automatically
   - Backend Docker image built and pushed to ECR with commit SHA tag
   - Frontend Docker image (Nginx + React build) built and pushed to ECR
   - Both services deployed to EKS staging cluster
   - Backend health checks pass (`/healthz` responds with `{"status":"ok","db":"ready"}`)
   - Frontend health checks pass (`/` or `/index.html` returns 200)
   - CloudWatch logs show successful deployment

2. **Production Deployment**:
   - Manual GitHub Actions workflow dispatch OR
   - Automatic trigger with manual approval gate
   - Same images from staging promoted to production (by tag)
   - Zero-downtime rolling update (maxUnavailable=0)
   - Both frontend and backend pods pass health checks within 5 minutes
   - Services accessible via single ALB endpoint

3. **Rollback on Failure**:
   - IF health checks fail for any service THEN `kubectl rollout undo` executes automatically
   - Previous working version restored within 2 minutes
   - GitHub Actions job marked as failed with clear error message
   - Rollback applies to failed service only (frontend or backend)

4. **Verification Checklist**:
   - ✅ Backend ECR image tagged with Git SHA
   - ✅ Frontend ECR image tagged with Git SHA
   - ✅ Backend pods running: `kubectl get pods -n shovel-heroes -l app=backend`
   - ✅ Frontend pods running: `kubectl get pods -n shovel-heroes -l app=frontend`
   - ✅ ALB DNS accessible: `http://{alb-dns}/` (frontend)
   - ✅ Backend API accessible: `http://{alb-dns}/api/healthz` or `http://{alb-dns}/healthz`
   - ✅ Database connectivity confirmed via backend `/healthz`
   - ✅ Frontend serves React app correctly
   - ✅ CloudWatch metrics showing normal operation
   - ✅ No errors in application logs

5. **Documentation Requirements**:
   - Runbook for manual deployment and troubleshooting
   - GitHub Actions workflow diagram
   - Rollback procedure documentation
   - Environment-specific configuration reference
   - Nginx configuration for SPA routing
