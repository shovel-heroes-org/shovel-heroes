# Deployment Runbook

This runbook provides step-by-step procedures for deploying, monitoring, and troubleshooting the Shovel Heroes application on AWS EKS.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Automated Deployments](#automated-deployments)
3. [Manual Deployments](#manual-deployments)
4. [Rollback Procedures](#rollback-procedures)
5. [Monitoring & Verification](#monitoring--verification)
6. [Troubleshooting](#troubleshooting)
7. [Environment Variables](#environment-variables)

---

## Prerequisites

### Required Tools

```bash
# AWS CLI
aws --version  # v2.x or higher

# kubectl
kubectl version --client  # v1.31.x

# kustomize
kustomize version  # v5.x or higher

# Docker (for local testing)
docker --version
```

### Required Access

- ✅ AWS IAM credentials or SSO access
- ✅ GitHub repository write access (for workflows)
- ✅ EKS cluster access (kubectl configured)
- ✅ ECR push permissions

### Infrastructure Status

Verify Terraform infrastructure is deployed:

```bash
cd /Users/yihuang/workspace/shovel-heroes-terraform
terraform output
```

Expected outputs:
- `eks_cluster_name`
- `ecr_repository_urls`
- `alb_dns_name`
- `github_actions_role_arn`
- `backend_target_group_arn`
- `frontend_target_group_arn`

---

## Automated Deployments

### Staging Deployment (Automatic)

**Trigger**: Push to `main` branch

**Workflow**: `.github/workflows/deploy-staging.yml`

**Process**:
1. Code is pushed to `main` branch
2. GitHub Actions workflow triggers automatically
3. Docker images are built and tagged with commit SHA
4. Images are pushed to ECR
5. Kubernetes manifests are applied via Kustomize
6. Deployment waits for pods to become healthy
7. Health checks verify backend and frontend

**Monitoring**:
- GitHub Actions: https://github.com/YOUR_ORG/shovel-heroes-k8s/actions
- Watch workflow execution in real-time
- Check job logs for errors

**Verification**:
```bash
# Get ALB DNS name
ALB_DNS=$(terraform output -raw alb_dns_name)

# Test backend
curl http://$ALB_DNS/healthz

# Test frontend
curl http://$ALB_DNS/

# Check pods
kubectl get pods -n shovel-heroes-staging
```

### Production Deployment (Manual Approval)

**Trigger**:
- GitHub Release (automatic build + deploy)
- Manual workflow dispatch (promote existing image)

**Workflow**: `.github/workflows/deploy-production.yml`

#### Option 1: Deploy from Release

```bash
# Create a new release
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# Go to GitHub → Releases → Create release from tag
# This triggers production workflow with approval gate
```

#### Option 2: Promote Staging Image

```bash
# Go to GitHub Actions → Deploy to Production (EKS) → Run workflow
# Select branch: main
# Input image_tag: staging-abc123 (from staging deployment)
# Click "Run workflow"
# Approve deployment when prompted
```

**Approval Process**:
1. Workflow pauses at "production" environment gate
2. Designated approvers receive notification
3. Review staging deployment and test results
4. Approve or reject deployment
5. Workflow continues if approved

**Verification**:
```bash
# Get production ALB DNS
ALB_DNS=$(terraform output -raw alb_dns_name)

# Test endpoints
curl http://$ALB_DNS/healthz
curl http://$ALB_DNS/

# Check pods
kubectl get pods -n shovel-heroes-production

# Check rollout status
kubectl rollout status deployment/backend-prod -n shovel-heroes-production
kubectl rollout status deployment/frontend-prod -n shovel-heroes-production
```

---

## Manual Deployments

Use manual deployment when automated workflows fail or for local development.

### Step 1: Build Docker Images

```bash
# Build both images
./build.sh -t v1.0.0 -e staging

# Or build individually
./build.sh -b -t v1.0.0 -e staging  # Backend only
./build.sh -f -t v1.0.0 -e staging  # Frontend only
```

### Step 2: Push to ECR

```bash
# Get ECR URLs from Terraform
BACKEND_ECR=$(terraform output -json ecr_repository_urls | jq -r '.backend')
FRONTEND_ECR=$(terraform output -json ecr_repository_urls | jq -r '.frontend')

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $BACKEND_ECR

# Tag and push
docker tag shovel-heroes-backend:staging-v1.0.0 $BACKEND_ECR:staging-v1.0.0
docker tag shovel-heroes-frontend:staging-v1.0.0 $FRONTEND_ECR:staging-v1.0.0

docker push $BACKEND_ECR:staging-v1.0.0
docker push $FRONTEND_ECR:staging-v1.0.0
```

### Step 3: Configure kubectl

```bash
# Get cluster name from Terraform
CLUSTER_NAME=$(terraform output -raw eks_cluster_name)

# Update kubeconfig
aws eks update-kubeconfig --region us-east-1 --name $CLUSTER_NAME

# Verify access
kubectl get nodes
```

### Step 4: Create Kubernetes Secrets (First Deployment Only)

```bash
# Get secrets from AWS Secrets Manager
DB_SECRET_ARN=$(terraform output -raw database_secret_arn)
APP_SECRET_ARN=$(terraform output -raw application_secret_arn)

DB_SECRET=$(aws secretsmanager get-secret-value --secret-id $DB_SECRET_ARN --query SecretString --output text)
APP_SECRET=$(aws secretsmanager get-secret-value --secret-id $APP_SECRET_ARN --query SecretString --output text)

# Extract values
DATABASE_URL=$(echo $DB_SECRET | jq -r '.url')
JWT_SECRET=$(echo $APP_SECRET | jq -r '.jwt_secret')
API_KEY=$(echo $APP_SECRET | jq -r '.api_key')

# Create secret
kubectl create secret generic shovel-heroes-secrets \
  --from-literal=database-url="$DATABASE_URL" \
  --from-literal=jwt-secret="$JWT_SECRET" \
  --from-literal=api-key="$API_KEY" \
  -n shovel-heroes-staging \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Step 5: Update Manifests with Values

```bash
cd k8s/overlays/staging

# Update image tags
kustomize edit set image \
  BACKEND_ECR_URL=$BACKEND_ECR:staging-v1.0.0 \
  FRONTEND_ECR_URL=$FRONTEND_ECR:staging-v1.0.0

# Update IRSA role ARN in base manifest
BACKEND_ROLE_ARN=$(terraform output -raw backend_pod_role_arn)
sed -i '' "s|BACKEND_POD_ROLE_ARN|$BACKEND_ROLE_ARN|g" ../../base/serviceaccount.yaml

# Update ALB target groups in ingress
BACKEND_TG_ARN=$(terraform output -raw backend_target_group_arn)
FRONTEND_TG_ARN=$(terraform output -raw frontend_target_group_arn)
ALB_NAME=$(terraform output -raw alb_dns_name | cut -d'-' -f1-3)

sed -i '' "s|BACKEND_TARGET_GROUP_ARN|$BACKEND_TG_ARN|g" ../../base/ingress.yaml
sed -i '' "s|FRONTEND_TARGET_GROUP_ARN|$FRONTEND_TG_ARN|g" ../../base/ingress.yaml
sed -i '' "s|ALB_NAME|$ALB_NAME|g" ../../base/ingress.yaml
```

### Step 6: Deploy

```bash
# Preview changes
kubectl kustomize k8s/overlays/staging

# Apply manifests
kubectl apply -k k8s/overlays/staging

# Watch deployment
kubectl rollout status deployment/backend-staging -n shovel-heroes-staging
kubectl rollout status deployment/frontend-staging -n shovel-heroes-staging

# Check pods
kubectl get pods -n shovel-heroes-staging -w
```

---

## Rollback Procedures

### Quick Rollback (Last Working Version)

```bash
# Rollback backend
kubectl rollout undo deployment/backend-staging -n shovel-heroes-staging

# Rollback frontend
kubectl rollout undo deployment/frontend-staging -n shovel-heroes-staging

# Verify rollback
kubectl rollout status deployment/backend-staging -n shovel-heroes-staging
kubectl get pods -n shovel-heroes-staging
```

### Rollback to Specific Revision

```bash
# View deployment history
kubectl rollout history deployment/backend-staging -n shovel-heroes-staging

# Example output:
# REVISION  CHANGE-CAUSE
# 1         Initial deployment
# 2         Update to v1.1.0
# 3         Update to v1.2.0 (current)

# Rollback to specific revision
kubectl rollout undo deployment/backend-staging -n shovel-heroes-staging --to-revision=2

# Verify
kubectl rollout status deployment/backend-staging -n shovel-heroes-staging
```

### Redeploy Specific Image Tag

```bash
# Update image tag in kustomization
cd k8s/overlays/staging
kustomize edit set image BACKEND_ECR_URL=$BACKEND_ECR:staging-v1.1.0

# Apply
kubectl apply -k .

# Wait for rollout
kubectl rollout status deployment/backend-staging -n shovel-heroes-staging
```

### Emergency Rollback (Scale Down)

If rollback fails, scale down the deployment:

```bash
# Scale to 0 replicas (takes app offline)
kubectl scale deployment/backend-staging --replicas=0 -n shovel-heroes-staging

# Fix the issue, then scale back up
kubectl scale deployment/backend-staging --replicas=2 -n shovel-heroes-staging
```

---

## Monitoring & Verification

### Health Checks

```bash
# Backend health check
curl http://$ALB_DNS/healthz

# Expected response: {"status":"ok"}

# Frontend health check
curl http://$ALB_DNS/health

# Expected response: healthy
```

### Pod Status

```bash
# List all pods
kubectl get pods -n shovel-heroes-staging

# Expected output:
# NAME                        READY   STATUS    RESTARTS   AGE
# backend-staging-xxx-yyy     1/1     Running   0          5m
# backend-staging-xxx-zzz     1/1     Running   0          5m
# frontend-staging-xxx-yyy    1/1     Running   0          5m
# frontend-staging-xxx-zzz    1/1     Running   0          5m

# Describe pod for details
kubectl describe pod backend-staging-xxx-yyy -n shovel-heroes-staging

# View pod logs
kubectl logs -f deployment/backend-staging -n shovel-heroes-staging
kubectl logs -f deployment/frontend-staging -n shovel-heroes-staging
```

### Service Status

```bash
# List services
kubectl get svc -n shovel-heroes-staging

# Check ingress
kubectl get ingress -n shovel-heroes-staging

# Describe ingress for ALB details
kubectl describe ingress shovel-heroes-staging -n shovel-heroes-staging
```

### Resource Usage

```bash
# CPU and Memory usage
kubectl top pods -n shovel-heroes-staging

# Node resource usage
kubectl top nodes

# Check resource quotas
kubectl describe resourcequota -n shovel-heroes-staging
```

### CloudWatch Logs

```bash
# List log groups
aws logs describe-log-groups --log-group-name-prefix "/aws/eks/shovel-heroes"

# Tail logs
aws logs tail /aws/eks/shovel-heroes/cluster --follow

# Query logs (last 1 hour)
aws logs filter-log-events \
  --log-group-name "/aws/eks/shovel-heroes/cluster" \
  --start-time $(date -u -d '1 hour ago' +%s)000 \
  --filter-pattern "ERROR"
```

### Application Metrics

Access CloudWatch dashboards:
- EKS Cluster: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=EKS-shovel-heroes
- RDS Database: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=RDS-shovel-heroes
- ALB: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=ALB-shovel-heroes

---

## Troubleshooting

### Pods Not Starting

**Symptoms**: Pods stuck in `Pending`, `CrashLoopBackOff`, or `ImagePullBackOff`

**Diagnosis**:
```bash
# Check pod events
kubectl describe pod <pod-name> -n shovel-heroes-staging

# Check pod logs
kubectl logs <pod-name> -n shovel-heroes-staging
```

**Common Causes & Solutions**:

1. **ImagePullBackOff**: Cannot pull Docker image from ECR
   - Verify ECR repository exists: `aws ecr describe-repositories`
   - Check image tag exists: `aws ecr list-images --repository-name shovel-heroes-backend`
   - Verify IRSA permissions for ECR pull

2. **CrashLoopBackOff**: Application crashes on startup
   - Check logs: `kubectl logs <pod-name> -n shovel-heroes-staging`
   - Common issues:
     - Missing environment variables (DATABASE_URL, JWT_SECRET)
     - Database connection failed
     - Invalid configuration

3. **Pending**: Insufficient cluster resources
   - Check node status: `kubectl get nodes`
   - Check resource requests: `kubectl describe pod <pod-name> -n shovel-heroes-staging`
   - Scale cluster if needed (via Terraform)

### Database Connection Failed

**Symptoms**: Backend logs show `ECONNREFUSED` or `timeout`

**Diagnosis**:
```bash
# Check database secret
kubectl get secret shovel-heroes-secrets -n shovel-heroes-staging -o jsonpath='{.data.database-url}' | base64 -d

# Test database connectivity from pod
kubectl exec -it deployment/backend-staging -n shovel-heroes-staging -- sh
# Inside pod:
# wget -qO- http://localhost:8787/healthz
```

**Solutions**:
1. Verify DATABASE_URL format: `postgres://user:pass@host:5432/dbname`
2. Check RDS security group allows traffic from EKS pods
3. Verify RDS instance is running: `aws rds describe-db-instances`

### ALB Not Routing Traffic

**Symptoms**: `502 Bad Gateway` or `504 Gateway Timeout`

**Diagnosis**:
```bash
# Check ALB target health
aws elbv2 describe-target-health --target-group-arn <BACKEND_TG_ARN>
aws elbv2 describe-target-health --target-group-arn <FRONTEND_TG_ARN>

# Check ingress status
kubectl describe ingress shovel-heroes-staging -n shovel-heroes-staging
```

**Solutions**:
1. **Targets unhealthy**: Health check failing
   - Verify pods are responding to health check path
   - Check health check configuration in target group

2. **No targets registered**: Ingress controller issue
   - Verify AWS Load Balancer Controller is running
   - Check ingress annotations
   - Ensure target-type is `ip` (not `instance`)

### High Memory Usage

**Symptoms**: Pods restarting due to OOM (Out of Memory)

**Diagnosis**:
```bash
# Check resource usage
kubectl top pods -n shovel-heroes-staging

# Check events for OOMKilled
kubectl get events -n shovel-heroes-staging --sort-by='.lastTimestamp'
```

**Solutions**:
1. Increase memory limits in deployment:
   ```yaml
   resources:
     limits:
       memory: 2Gi  # Increase from 1Gi
   ```
2. Optimize application memory usage
3. Scale horizontally (increase replicas)

### Deployment Stuck

**Symptoms**: Deployment shows `Progressing` but never completes

**Diagnosis**:
```bash
# Check rollout status
kubectl rollout status deployment/backend-staging -n shovel-heroes-staging

# Check deployment events
kubectl describe deployment backend-staging -n shovel-heroes-staging
```

**Solutions**:
1. **Readiness probe failing**: Pods not becoming ready
   - Check pod logs for startup errors
   - Adjust readiness probe timing (increase `initialDelaySeconds`)

2. **ImagePullBackOff**: Fix image pull issue (see above)

3. **Force rollout restart**:
   ```bash
   kubectl rollout restart deployment/backend-staging -n shovel-heroes-staging
   ```

---

## Environment Variables

### Staging Environment

| Variable | Source | Example |
|----------|--------|---------|
| `NODE_ENV` | Hardcoded | `production` |
| `PORT` | Hardcoded | `8787` (backend), `80` (frontend) |
| `DATABASE_URL` | Kubernetes Secret | `postgres://...` |
| `JWT_SECRET` | Kubernetes Secret | `<random-string>` |
| `API_KEY` | Kubernetes Secret | `<random-string>` |
| `AWS_REGION` | IRSA (automatic) | `us-east-1` |
| `AWS_ROLE_ARN` | IRSA (automatic) | `arn:aws:iam::...` |

### Production Environment

Same as staging, but with production-specific values:
- Database points to production RDS
- Secrets from production Secrets Manager
- Higher resource limits

### Updating Environment Variables

**For secrets**:
```bash
# Update Kubernetes secret
kubectl create secret generic shovel-heroes-secrets \
  --from-literal=jwt-secret="<new-value>" \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart deployment to pick up new secret
kubectl rollout restart deployment/backend-staging -n shovel-heroes-staging
```

**For non-secrets** (edit deployment):
```bash
kubectl edit deployment backend-staging -n shovel-heroes-staging

# Or update via kustomize patch and reapply
```

---

## Emergency Contacts

- **On-call Engineer**: [Your team's PagerDuty/Slack]
- **AWS Support**: https://console.aws.amazon.com/support
- **GitHub Issues**: https://github.com/YOUR_ORG/shovel-heroes-k8s/issues

## Related Documentation

- [GitHub Secrets Setup](./GITHUB_SECRETS_SETUP.md)
- [Architecture Design](../.kiro/specs/deploy-to-eks/design.md)
- [Terraform Infrastructure](https://github.com/YOUR_ORG/shovel-heroes-terraform)
- [Main README](../README.md)
