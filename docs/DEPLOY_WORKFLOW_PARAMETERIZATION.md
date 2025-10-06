# Deploy Workflow Parameterization Guide

## Problem Statement

The current `deploy.yml` workflow contains hardcoded AWS ARNs that:
1. **Cause CI/CD failures** in upstream repo (shovel-heroes-org) because AWS credentials don't exist
2. **Expose account-specific information** (AWS Account ID: 447407243904)
3. **Prevent other contributors** from using the workflow with their own AWS infrastructure

As noted in PR #103 review by Copilot: **"Avoid hardcoding Secrets Manager ARNs"** and **"Move secret ARNs to GitHub environment secrets"**.

## Analysis of Current Hardcoded Values

### 1. In `.github/workflows/deploy.yml`

#### Lines 95-109: AWS Secrets Manager ARNs (3 hardcoded ARNs)
```yaml
DB_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id "arn:aws:secretsmanager:ap-east-2:447407243904:secret:shovel-heros-staging-db-2025100214083654490000000c-89ytP5" \
  --region ap-east-2 \
  --query SecretString --output text)

APP_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id "arn:aws:secretsmanager:ap-east-2:447407243904:secret:shovel-heros-staging-app-2025100214083654480000000a-PnHCMb" \
  --region ap-east-2 \
  --query SecretString --output text)

JWT_SECRET_OBJ=$(aws secretsmanager get-secret-value \
  --secret-id "arn:aws:secretsmanager:ap-east-2:447407243904:secret:shovel-heros-staging-jwt-2025100214083654490000000e-cnB4Sa" \
  --region ap-east-2 \
  --query SecretString --output text)
```

**Issue**: These ARNs are specific to one AWS account and will fail in any other environment.

#### Line 134: Backend Pod IAM Role ARN
```yaml
BACKEND_POD_ROLE_ARN: arn:aws:iam::447407243904:role/shovel-heros-staging-backend-20251002142616455400000002
```

**Issue**: This IRSA (IAM Role for Service Account) role ARN is hardcoded.

### 2. In `k8s/base/backend-targetgroupbinding.yaml`

#### Line 10: Backend Target Group ARN
```yaml
targetGroupARN: arn:aws:elasticloadbalancing:ap-east-2:447407243904:targetgroup/be-20251002135523905000000015/d93c0dca3c31cb27
```

### 3. In `k8s/base/frontend-targetgroupbinding.yaml`

#### Line 10: Frontend Target Group ARN
```yaml
targetGroupARN: arn:aws:elasticloadbalancing:ap-east-2:447407243904:targetgroup/fe-20251003172223376900000001/4de94ad42136c343
```

**Issue**: These Target Group ARNs tie the deployment to a specific ALB configuration.

### 4. In `k8s/base/serviceaccount.yaml`

#### Line 8: Placeholder for Backend Pod Role
```yaml
eks.amazonaws.com/role-arn: BACKEND_POD_ROLE_ARN
```

**Good**: This is a placeholder that gets replaced by the workflow. This pattern is correct.

### 5. In `k8s/base/*-deployment.yaml`

#### Image URLs as Placeholders
```yaml
image: BACKEND_ECR_URL:latest
image: FRONTEND_ECR_URL:latest
```

**Good**: These are placeholders replaced by workflow. This pattern is correct.

## What Should NOT Change

✅ **Keep these elements unchanged:**

1. **Workflow structure**: The order and logic of steps is well-designed
2. **OIDC authentication**: Using `secrets.AWS_GITHUB_ACTIONS_ROLE_ARN` is correct
3. **Docker build process**: Multi-stage builds are optimized
4. **kubectl commands**: Apply manifests in correct order
5. **Health checks**: Verification steps are comprehensive
6. **Environment variables at top** (lines 14-18): These are acceptable as-is:
   - `AWS_REGION: ap-east-2`
   - `EKS_CLUSTER_NAME: eks-shovel-heros`
   - `ECR_BACKEND_REPO: shovel-heros-staging-shovel-heroes-backend`
   - `ECR_FRONTEND_REPO: shovel-heros-staging-shovel-heroes-frontend`

   **Why?** These are deployment-specific settings that define WHERE to deploy. Different forks will have different values. Moving these to secrets adds complexity without benefit.

## What MUST Be Parameterized

❌ **Move to GitHub Secrets:**

| Hardcoded Value | Location | Proposed Secret Name | Reason |
|----------------|----------|---------------------|---------|
| Database Secret ARN | deploy.yml:96 | `AWS_DB_SECRET_ARN` | Contains AWS account ID |
| Application Secret ARN | deploy.yml:101 | `AWS_APP_SECRET_ARN` | Contains AWS account ID |
| JWT Secret ARN | deploy.yml:107 | `AWS_JWT_SECRET_ARN` | Contains AWS account ID |
| Backend Pod IAM Role ARN | deploy.yml:134 | `BACKEND_POD_ROLE_ARN` | Account-specific IRSA role |
| Backend Target Group ARN | backend-targetgroupbinding.yaml:10 | `BACKEND_TARGET_GROUP_ARN` | ALB-specific identifier |
| Frontend Target Group ARN | frontend-targetgroupbinding.yaml:10 | `FRONTEND_TARGET_GROUP_ARN` | ALB-specific identifier |

## Solution: Add Conditional Execution

### Step 1: Add condition to skip workflow when secrets missing

```yaml
jobs:
  deploy:
    name: Build and Deploy
    runs-on: ubuntu-latest
    # Only run if AWS credentials are configured
    if: ${{ secrets.AWS_GITHUB_ACTIONS_ROLE_ARN != '' }}
```

**Effect**:
- ✅ Upstream repo (no secrets): Workflow skipped → CI/CD passes
- ✅ Forks with secrets: Workflow runs → Deployment succeeds

### Step 2: Replace hardcoded ARNs with secrets

**In deploy.yml:**
```yaml
# Replace lines 95-109 with:
DB_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id "${{ secrets.AWS_DB_SECRET_ARN }}" \
  --region ${{ env.AWS_REGION }} \
  --query SecretString --output text)

APP_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id "${{ secrets.AWS_APP_SECRET_ARN }}" \
  --region ${{ env.AWS_REGION }} \
  --query SecretString --output text)

JWT_SECRET_OBJ=$(aws secretsmanager get-secret-value \
  --secret-id "${{ secrets.AWS_JWT_SECRET_ARN }}" \
  --region ${{ env.AWS_REGION }} \
  --query SecretString --output text)

# Replace line 134:
BACKEND_POD_ROLE_ARN: ${{ secrets.BACKEND_POD_ROLE_ARN }}
```

**In TargetGroupBindings:**
```yaml
# Use Kustomize patches or sed replacement in workflow
sed -i "s|BACKEND_TGB_ARN|${{ secrets.BACKEND_TARGET_GROUP_ARN }}|g" k8s/base/backend-targetgroupbinding.yaml
sed -i "s|FRONTEND_TGB_ARN|${{ secrets.FRONTEND_TARGET_GROUP_ARN }}|g" k8s/base/frontend-targetgroupbinding.yaml
```

## Setup Instructions for Repository Admin

### For Upstream Repository (shovel-heroes-org/shovel-heroes)

**Option A: Keep workflow disabled (Recommended)**
- No action needed
- Workflow will skip automatically
- Individual contributors enable in their forks

**Option B: Enable deployment from upstream**
- Requires setting up AWS infrastructure (EKS, RDS, ALB, etc.)
- See full setup guide below

### For Individual Forks (Contributors with AWS)

Go to **your fork's Settings → Secrets and variables → Actions**

#### Required Repository Secrets:

| Secret Name | How to Get Value | Example |
|-------------|------------------|---------|
| `AWS_GITHUB_ACTIONS_ROLE_ARN` | Terraform: `terraform output github_actions_role_arn` | `arn:aws:iam::123456789012:role/github-actions` |
| `AWS_DB_SECRET_ARN` | Terraform: `terraform output database_secret_arn` | `arn:aws:secretsmanager:region:account:secret:db-xxx` |
| `AWS_APP_SECRET_ARN` | Terraform: `terraform output application_secret_arn` | `arn:aws:secretsmanager:region:account:secret:app-xxx` |
| `AWS_JWT_SECRET_ARN` | Terraform: `terraform output jwt_secret_arn` | `arn:aws:secretsmanager:region:account:secret:jwt-xxx` |
| `BACKEND_POD_ROLE_ARN` | Terraform: `terraform output backend_pod_role_arn` | `arn:aws:iam::123456789012:role/backend-pod` |
| `BACKEND_TARGET_GROUP_ARN` | Terraform: `terraform output backend_target_group_arn` | `arn:aws:elasticloadbalancing:region:account:targetgroup/xxx` |
| `FRONTEND_TARGET_GROUP_ARN` | Terraform: `terraform output frontend_target_group_arn` | `arn:aws:elasticloadbalancing:region:account:targetgroup/xxx` |

#### Update Environment Variables in deploy.yml:

Edit lines 14-18 to match your AWS setup:
```yaml
env:
  AWS_REGION: us-east-1  # Your AWS region
  EKS_CLUSTER_NAME: your-cluster-name
  ECR_BACKEND_REPO: your-backend-repo
  ECR_FRONTEND_REPO: your-frontend-repo
```

### Getting Terraform Outputs

If you're using the `shovel-heroes-terraform` repository:

```bash
cd /path/to/shovel-heroes-terraform

# Get all required values at once
terraform output -json | jq -r '
{
  "AWS_GITHUB_ACTIONS_ROLE_ARN": .github_actions_role_arn.value,
  "AWS_DB_SECRET_ARN": .database_secret_arn.value,
  "AWS_APP_SECRET_ARN": .application_secret_arn.value,
  "AWS_JWT_SECRET_ARN": .jwt_secret_arn.value,
  "BACKEND_POD_ROLE_ARN": .backend_pod_role_arn.value,
  "BACKEND_TARGET_GROUP_ARN": .backend_target_group_arn.value,
  "FRONTEND_TARGET_GROUP_ARN": .frontend_target_group_arn.value
}'
```

## Testing the Fix

### Test 1: Upstream repository (no secrets)
```bash
# Push to main
git push upstream main

# Expected: Workflow is skipped (not failed)
gh run list --repo shovel-heroes-org/shovel-heroes --limit 1
# Status should show: "skipped" or workflow doesn't appear
```

### Test 2: Fork with AWS setup (secrets configured)
```bash
# Push to your fork's main
git push origin main

# Expected: Workflow runs and deploys
gh run watch
# Should see: Build images → Push to ECR → Deploy to EKS → Health checks pass
```

## Migration Path

For existing deployments using hardcoded values:

1. ✅ Add GitHub secrets to repository
2. ✅ Update deploy.yml to use secrets
3. ✅ Test workflow with manual trigger
4. ✅ Verify deployment succeeds
5. ✅ Update TargetGroupBinding manifests with placeholders
6. ✅ Create PR to upstream with parameterized workflow

## Security Benefits

✅ **No AWS account IDs in code**
✅ **No secret ARNs in version control**
✅ **Easy to rotate secrets** (update GitHub secret only)
✅ **Per-fork configuration** (each contributor uses their own AWS)
✅ **Audit trail** (GitHub tracks secret updates)

## Related Documentation

- [GITHUB_SECRETS_SETUP.md](./GITHUB_SECRETS_SETUP.md) - Detailed secrets configuration guide
- [DEPLOYMENT_RUNBOOK.md](./DEPLOYMENT_RUNBOOK.md) - Operational deployment procedures
- [shovel-heroes-terraform](https://github.com/yi-john-huang/shovel-heroes-terraform) - AWS infrastructure as code

## Summary

**Current State**:
- ❌ Hardcoded ARNs cause CI/CD failures in upstream
- ❌ Exposes AWS account information
- ❌ Not reusable by other contributors

**After Fix**:
- ✅ Workflow skips when secrets missing (upstream passes CI/CD)
- ✅ No AWS account info in code
- ✅ Contributors can use with their own AWS accounts
- ✅ Follows GitHub Actions best practices
