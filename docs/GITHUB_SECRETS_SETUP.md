# GitHub Secrets Configuration Guide

This guide explains how to configure GitHub repository secrets and environments for the Shovel Heroes EKS deployment pipeline.

## Prerequisites

Before configuring GitHub secrets, ensure that **Phase 0 Terraform tasks** have been completed in the `shovel-heroes-terraform` repository:

- ✅ GitHub OIDC provider created
- ✅ Frontend target group added to ALB
- ✅ S3/CloudFront resources removed

## Step 1: Get Terraform Outputs

First, retrieve the necessary values from your Terraform infrastructure:

```bash
cd /Users/yihuang/workspace/shovel-heroes-terraform

# Get all required values
terraform output github_actions_role_arn
terraform output backend_pod_role_arn
terraform output database_secret_arn
terraform output application_secret_arn
terraform output eks_cluster_name
terraform output alb_dns_name
terraform output backend_target_group_arn
terraform output frontend_target_group_arn
```

Save these values - you'll need them for the next steps.

## Step 2: Configure Repository Secrets

Go to your GitHub repository: **Settings → Secrets and variables → Actions → New repository secret**

Add the following **repository secrets** (available to all workflows):

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `AWS_GITHUB_ACTIONS_ROLE_ARN` | `terraform output github_actions_role_arn` | IAM role ARN for OIDC authentication |

## Step 3: Create GitHub Environments

### 3.1 Create Staging Environment

1. Go to **Settings → Environments → New environment**
2. Name: `staging`
3. Click **Configure environment**
4. **Do not** add protection rules (auto-deploy on push to main)
5. Click **Add secret** to add environment-specific secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `EKS_CLUSTER_NAME` | `shovel-heroes-staging` | EKS cluster name for staging |
| `BACKEND_POD_ROLE_ARN` | `terraform output backend_pod_role_arn` | IAM role for backend pods (IRSA) |
| `DATABASE_SECRET_ARN` | `terraform output database_secret_arn` | Secrets Manager ARN for database credentials |
| `APPLICATION_SECRET_ARN` | `terraform output application_secret_arn` | Secrets Manager ARN for app secrets (JWT, API keys) |
| `BACKEND_TARGET_GROUP_ARN` | `terraform output backend_target_group_arn` | ALB target group for backend |
| `FRONTEND_TARGET_GROUP_ARN` | `terraform output frontend_target_group_arn` | ALB target group for frontend |

### 3.2 Create Production Environment

1. Go to **Settings → Environments → New environment**
2. Name: `production`
3. Click **Configure environment**
4. **Enable** protection rules:
   - ✅ Required reviewers: Add yourself and/or team members
   - ✅ Wait timer: 0 minutes (optional: add delay)
   - ✅ Deployment branches: Selected branches → Add `main`
5. Click **Add secret** to add environment-specific secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `EKS_CLUSTER_NAME` | `shovel-heroes-production` | EKS cluster name for production |
| `BACKEND_POD_ROLE_ARN` | `terraform output backend_pod_role_arn` | IAM role for backend pods (IRSA) |
| `DATABASE_SECRET_ARN` | `terraform output database_secret_arn` | Secrets Manager ARN for database credentials |
| `APPLICATION_SECRET_ARN` | `terraform output application_secret_arn` | Secrets Manager ARN for app secrets (JWT, API keys) |
| `BACKEND_TARGET_GROUP_ARN` | `terraform output backend_target_group_arn` | ALB target group for backend |
| `FRONTEND_TARGET_GROUP_ARN` | `terraform output frontend_target_group_arn` | ALB target group for frontend |

## Step 4: Update Workflow Files

### 4.1 Update Staging Workflow

Edit `.github/workflows/deploy-staging.yml`:

```yaml
# Update these environment variables:
env:
  AWS_REGION: us-east-1  # Your AWS region
  ECR_BACKEND_REPO: shovel-heroes-backend
  ECR_FRONTEND_REPO: shovel-heroes-frontend

# Ensure role ARN uses the secret:
- name: Configure AWS credentials via OIDC
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: ${{ secrets.AWS_GITHUB_ACTIONS_ROLE_ARN }}
    aws-region: ${{ env.AWS_REGION }}

# Update EKS cluster name:
- name: Update kubeconfig for EKS
  run: |
    aws eks update-kubeconfig --region ${{ env.AWS_REGION }} --name ${{ secrets.EKS_CLUSTER_NAME }}
```

### 4.2 Update Production Workflow

Edit `.github/workflows/deploy-production.yml`:

```yaml
# Same updates as staging workflow
# Ensure environment is set to "production":
jobs:
  deploy-production:
    environment: production  # This triggers approval requirements
```

### 4.3 Update Kubernetes Manifests

The following placeholders in `k8s/base/` need to be replaced via workflow or Kustomize:

**In `serviceaccount.yaml`:**
- `BACKEND_POD_ROLE_ARN` → Use environment secret

**In `backend-deployment.yaml` and `frontend-deployment.yaml`:**
- `BACKEND_ECR_URL` → Set by workflow via Kustomize
- `FRONTEND_ECR_URL` → Set by workflow via Kustomize

**In `ingress.yaml`:**
- `ALB_NAME` → Get from Terraform output `alb_dns_name`
- `BACKEND_TARGET_GROUP_ARN` → Use environment secret
- `FRONTEND_TARGET_GROUP_ARN` → Use environment secret

## Step 5: Verify Configuration

### 5.1 Check Secrets

```bash
# List configured secrets (won't show values, just names)
gh secret list

# List environments
gh api repos/:owner/:repo/environments | jq '.environments[].name'
```

### 5.2 Test OIDC Authentication

Trigger the staging workflow manually to test OIDC authentication:

1. Go to **Actions → Deploy to Staging (EKS) → Run workflow**
2. Monitor the workflow execution
3. Check the "Configure AWS credentials via OIDC" step
4. Should see: `✓ Assumed role successfully`

If it fails with "Not authorized to perform sts:AssumeRoleWithWebIdentity":
- Verify the GitHub OIDC provider trust policy in Terraform
- Ensure it matches: `repo:YOUR_ORG/shovel-heroes-k8s:*`
- Check the IAM role ARN is correct

## Step 6: Create Kubernetes Secrets

The workflows will create these secrets automatically, but you can create them manually if needed:

```bash
# Get database credentials from Secrets Manager
DB_SECRET=$(aws secretsmanager get-secret-value --secret-id <DATABASE_SECRET_ARN> --query SecretString --output text)
DB_URL=$(echo $DB_SECRET | jq -r '.url')

# Get application secrets
APP_SECRET=$(aws secretsmanager get-secret-value --secret-id <APPLICATION_SECRET_ARN> --query SecretString --output text)
JWT_SECRET=$(echo $APP_SECRET | jq -r '.jwt_secret')
API_KEY=$(echo $APP_SECRET | jq -r '.api_key')

# Create Kubernetes secret
kubectl create secret generic shovel-heroes-secrets \
  --from-literal=database-url="$DB_URL" \
  --from-literal=jwt-secret="$JWT_SECRET" \
  --from-literal=api-key="$API_KEY" \
  -n shovel-heroes-staging
```

## Troubleshooting

### OIDC Authentication Fails

**Error**: `Not authorized to perform sts:AssumeRoleWithWebIdentity`

**Solution**:
1. Check the trust policy in `iam_github_actions.tf`
2. Verify repository name matches: `repo:YOUR_ORG/shovel-heroes-k8s:*`
3. Ensure OIDC provider thumbprint is correct

### Secret Not Found

**Error**: `Secret not found: AWS_GITHUB_ACTIONS_ROLE_ARN`

**Solution**:
1. Verify secret name exactly matches (case-sensitive)
2. Check if secret is in repository secrets (not environment)
3. Re-add the secret if needed

### EKS Access Denied

**Error**: `Error from server (Forbidden): deployments.apps is forbidden`

**Solution**:
1. Verify the GitHub Actions IAM role has EKS permissions
2. Check the role is in the EKS cluster's aws-auth ConfigMap
3. Update aws-auth if needed:

```bash
kubectl edit configmap aws-auth -n kube-system

# Add under mapRoles:
- rolearn: <GITHUB_ACTIONS_ROLE_ARN>
  username: github-actions
  groups:
    - system:masters
```

### Database Connection Failed

**Error**: `ECONNREFUSED` or timeout connecting to database

**Solution**:
1. Verify security group allows backend pods to access RDS
2. Check DATABASE_URL secret is correctly formatted
3. Verify backend pods have the IRSA role annotation

## Security Best Practices

1. **Never commit secrets** to the repository
2. **Rotate secrets regularly** (JWT, API keys, database passwords)
3. **Use least-privilege IAM policies** for GitHub Actions role
4. **Enable branch protection** on `main` branch
5. **Require PR reviews** before merging to main
6. **Audit secrets access** via CloudTrail logs
7. **Use separate AWS accounts** for staging and production (recommended)

## Next Steps

After configuring secrets:

1. ✅ Test staging deployment: Push to `main` branch
2. ✅ Verify pods are running: `kubectl get pods -n shovel-heroes-staging`
3. ✅ Test backend API: `curl http://{alb-dns}/healthz`
4. ✅ Test frontend: `curl http://{alb-dns}/`
5. ✅ Monitor logs: Check CloudWatch Logs
6. ✅ Test production deployment: Create a release or trigger manually

For deployment procedures, see [DEPLOYMENT_RUNBOOK.md](./DEPLOYMENT_RUNBOOK.md).
