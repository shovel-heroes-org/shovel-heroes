# Shovel-Heros

前端：Vite + React + Tailwind  
後端：Fastify (Node.js) + PostgreSQL  
API 規格：OpenAPI 3.1 (`api-spec/openapi.yaml`)

目前支援兩種模式：
1. Base44 SDK (預設)
2. 自建 REST Backend (`packages/backend`)：設定 `VITE_USE_REST=true`

---
## 其他文件
- [貢獻指南（Contributing Guide）](docs/CONTRIBUTING.md)
- [安全政策（Security Policy）](docs/SECURITY.md)
- [AGENTS.md](docs/AGENTS.md)

## 目錄結構概覽

```
api-spec/                # OpenAPI 規格與 bundle 輸出
packages/
  backend/               # Fastify 後端
  shared-types/          # OpenAPI 產出的共用 TS 型別
src/                     # 前端 React 原始碼
```

---

## 快速開始 (前端 + 後端)

```bash
npm install                 # 安裝依賴
docker compose up -d db     # 啟動 Postgres (背景)
npm run dev:api             # 啟動後端 (Fastify)
npm run dev                 # 另開終端啟動前端
```

切換到 REST：建立 `.env` 或 `.env.local`：

```
VITE_USE_REST=true
VITE_API_BASE=http://localhost:8787
```

> 後端若 8787 被占用會往上遞增（8788 / 8789 ...）請同步調整 `VITE_API_BASE`。

---

## 後端環境變數

根目錄或 `packages/backend/.env` 任一可被 dotenv 讀取：

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/shovelheroes
PORT=8787
VITE_API_BASE=http://localhost:8787
VITE_USE_REST=true
```

健康檢查：`GET /healthz` 回傳 `{ status, db }`。

---

## Backend 結構

```
packages/backend/src/
  index.ts                     # Fastify 啟動與 plugin 註冊
  lib/
    db.ts                      # pg 連線池 + decorator
    db-init.ts                 # 啟動時建表 (暫代 migrations)
  modules/
    disaster-areas/repo.ts     # 資料層 (其餘資源暫於 routes 直接操作)
  routes/
    disaster-areas.ts
    grids.ts
    volunteer-registrations.ts
    supply-donations.ts
    grid-discussions.ts
    announcements.ts
    users.ts
    functions.ts
    legacy.ts
```

> 目前僅 `disaster-areas` 使用 repo pattern；其餘後續可抽出 service/repo 分層。

---

## OpenAPI / 型別 / 文件

規格檔：`api-spec/openapi.yaml`

指令：
```bash
npm run openapi:lint      # Spectral 驗證
npm run openapi:preview   # Redoc 預覽 (熱更新)
npm run openapi:bundle    # 輸出 bundle 版
npm run types:openapi     # 產生 TS 型別 → packages/shared-types/src/openapi.ts
```

引用方式：
```ts
import type { components } from 'shovel-shared-types/src/openapi';
type Grid = components['schemas']['Grid'];
```

---

## REST 模式（取代 Base44 SDK）

REST 實作檔：

- `src/api/rest/client.js`
- `src/api/rest/entities.js`
- `src/api/rest/functions.js`
- `src/api/rest/index.js` (依 `VITE_USE_REST` 切換)

將：
```ts
import { Grid } from '@/api/entities';
```
改為：
```ts
import { Grid } from '@/api/rest';
```
即可使用自建後端。若 `VITE_USE_REST !== 'true'` 仍回退 Base44。

> `functions.js` 若要完全移除 Base44 依賴，需再 re-export REST 實作。

---

## 已實作 API 對照

| 資源 | 動作 | 狀態 |
|------|------|------|
| disaster-areas | list/create/get/update/delete | Done |
| grids | list/create/get/update/delete | Done |
| volunteer-registrations | list/create/delete | Done |
| supply-donations | list/create | Done |
| grid-discussions | list/create | Done |
| announcements | list/create | Done |
| users | list | Done |
| me | get | Done (stub auth) |
| functions | csv export/import/template/fix/proxy | Done |
| legacy | sync / roster | Done |
| volunteers | list | Pending |

尚未：`GET /volunteers`（需彙總 user + 報名統計）。

---

## 後續改進建議 & 工作清單

1. Pagination：套用 `limit/offset` 至所有 list endpoints。
2. 統一錯誤：建立 `replyError(code,message,status)` 並對齊 OpenAPI `components.responses`。
3. 權限 / bearerAuth：JWT parsing + role 授權中介層。
4. Migrations：導入 `node-pg-migrate` / `drizzle`；移除啟動建表。
5. OpenAPI 型別整合：減少手寫 Zod，或產生 Zod schema。
6. CSV 匯入強化：錯誤報告 / 重複檢測 / UPSERT。
7. Volunteers endpoint：JOIN volunteer_registrations + users，電話遮罩。
8. 日誌 / Observability：request id、pino-pretty、OpenTelemetry。
9. 安全：rate limit、Helmet、欄位長度限制、CORS 白名單。
10. 測試：Vitest + supertest CRUD / 匯入匯出測試。

TODO Snapshot:
```
- [ ] GET /volunteers
- [ ] 分頁參數應用
- [ ] 統一錯誤格式 middleware
- [ ] JWT 驗證 / user context
- [ ] Migration 系統導入
- [ ] 型別對齊（OpenAPI → code）
- [ ] CSV 匯入強化
- [ ] 基本測試覆蓋
```

---

## Docker / 資料庫操作

啟動：
```bash
docker compose up -d db
```
重置：
```bash
docker compose down -v && docker compose up -d db
```

---

## FAQ

**Q: `DATABASE_URL not set`?**  
A: 確認 `.env` 內容與位置，重啟後端。

**Q: Port 被占用?**  
A: 服務自動遞增；需固定 8787：`lsof -i :8787` 查 PID。

**Q: /me 401?**  
A: 加 `Authorization: Bearer anything` 目前 stub 回假資料。

**Q: 重新產生型別?**  
A: `npm run types:openapi`。

**Q: 切換 REST 模式?**  
A: `.env` 設 `VITE_USE_REST=true` 並設定 `VITE_API_BASE`。

---

## 部署 (AWS EKS)

本專案使用 GitHub Actions 自動部署至 AWS EKS (Elastic Kubernetes Service)。

### 部署架構

- **前端**: React + Nginx (容器化部署)
- **後端**: Fastify (容器化部署)
- **資料庫**: AWS RDS PostgreSQL
- **負載平衡**: AWS Application Load Balancer (ALB)
- **容器註冊**: Amazon ECR
- **編排工具**: Kubernetes + Kustomize

### 快速部署

**自動部署**:
```bash
# 推送至 main 分支即觸發自動部署
git push origin main
```

**手動部署特定版本**:
```bash
# GitHub Actions → Deploy to EKS → Run workflow
# 輸入 image_tag (例如: v1.0.0)
```

### 本地建置 Docker 映像檔

```bash
# 建置兩個映像檔
./build.sh -t v1.0.0 -e staging

# 僅建置後端
./build.sh -b -t v1.0.0 -e staging

# 僅建置前端
./build.sh -f -t v1.0.0 -e staging

# 建置並推送至 ECR
./build.sh -t v1.0.0 -e staging -p --ecr-registry <ECR_URL>
```

### 部署文件

- **[部署手冊 (Deployment Runbook)](./docs/DEPLOYMENT_RUNBOOK.md)** - 詳細的部署流程、監控與故障排除
- **[GitHub Secrets 設定](./docs/GITHUB_SECRETS_SETUP.md)** - GitHub Actions 密鑰配置指南
- **[設計文件](./kiro/specs/deploy-to-eks/design.md)** - 技術架構設計
- **[任務清單](./kiro/specs/deploy-to-eks/tasks.md)** - 實作任務分解

### 工作流程

| 工作流程 | 觸發條件 |
|---------|---------|
| `deploy.yml` | Push to `main` 或手動觸發 |

### 應用程式端點

部署完成後，應用程式可透過 ALB 存取:

```bash
# 取得 ALB DNS 名稱
terraform output -raw alb_dns_name

# 測試端點
curl http://<ALB_DNS>/healthz    # 後端健康檢查
curl http://<ALB_DNS>/           # 前端應用程式
curl http://<ALB_DNS>/api/...    # 後端 API
```

### Kubernetes 資源

Kubernetes 清單檔位於 `k8s/` 目錄:

```
k8s/
  base/              # Kubernetes 清單 (namespace, deployments, services, ingress)
```

手動部署:
```bash
# 部署
kubectl apply -f k8s/base/

# 檢查部署狀態
kubectl get pods -n shovel-heroes
kubectl rollout status deployment/backend -n shovel-heroes
kubectl rollout status deployment/frontend -n shovel-heroes
```

### 故障排除

常見問題:

**Q: GitHub Actions 部署失敗?**
A: 檢查 [GitHub Secrets 設定](./docs/GITHUB_SECRETS_SETUP.md) 是否完整

**Q: Pod 無法啟動?**
A: 查看 pod 日誌: `kubectl logs <pod-name> -n shovel-heroes`

**Q: 資料庫連線錯誤?**
A: 確認 Kubernetes secret 中的 `DATABASE_URL` 正確

**Q: 如何回滾部署?**
A: `kubectl rollout undo deployment/backend -n shovel-heroes`

詳細故障排除請參考 [部署手冊](./docs/DEPLOYMENT_RUNBOOK.md#troubleshooting)。

---

## Building the app (前端)

```bash
npm run build
```

輸出：`dist/`。後端可另建 Dockerfile 或 PM2 部署。

---

## 開發流程建議
1. 修改 `api-spec/openapi.yaml`
2. `npm run openapi:lint`
3. `npm run types:openapi`
4. 實作 / 更新 backend routes
5. 前端串接 / 驗證
6. PR & CI (未來加入測試)

---

For more information and support, please contact Base44 support at app@base44.com.

