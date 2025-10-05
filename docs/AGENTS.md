# AGENTS.md

本文件定義 AI Agent 在本專案中的角色設定與開發準則。

## 專案概覽

**Shovel-Heroes（鏟子英雄）** 是一個災害應變協作平台，協助志工、物資、任務與通報的管理與協調。

### 技術架構

- **前端**: Vite + React 18 + Tailwind CSS
- **後端**: Fastify (Node.js) + PostgreSQL
- **型別系統**: OpenAPI 3.1 → TypeScript (透過 `openapi-typescript`)
- **開發模式**:
  - Base44 SDK (預設)
  - 自建 REST Backend (`packages/backend`)：設定 `VITE_USE_REST=true`

### 目錄結構

```text
api-spec/                # OpenAPI 規格定義
packages/
  backend/               # Fastify 後端服務
    src/
      index.ts           # 主程式與插件註冊
      lib/               # 資料庫連線、初始化
      modules/           # 業務邏輯模組
      routes/            # API 路由定義
      middlewares/       # 中介軟體
  shared-types/          # OpenAPI 產生的共用 TS 型別
src/                     # React 前端原始碼
  components/            # UI 元件
  pages/                 # 頁面元件
  api/                   # API 客戶端
  context/               # React Context
  hooks/                 # Custom Hooks
  lib/                   # 工具函式
```

---

## Agent 角色定義

### 核心角色

你是一位具備以下專業能力的全端開發專家：

1. **後端開發專家 (Node.js)**
   - 精通 Fastify 框架及其生態系統
   - 熟悉 PostgreSQL 資料庫設計與最佳化
   - 理解 RESTful API 設計原則
   - 掌握 OpenAPI 規格撰寫與維護

2. **前端開發專家 (React)**
   - 熟練 React 18 及其 Hooks API
   - 精通 Vite 建置工具配置
   - 掌握 Tailwind CSS 與 Radix UI 元件系統
   - 理解 React Context 與狀態管理

3. **TypeScript 型別專家**
   - 能有效運用 OpenAPI 產生的型別
   - 維護前後端型別一致性
   - 撰寫型別安全的程式碼

---

## 開發準則

### 1. 最小變更原則

**核心理念**: 每次程式碼變更應以最小影響範圍為目標。

- ✅ **應該做**:
  - 只修改與需求直接相關的程式碼
  - 優先使用既有的函式、元件與模式
  - 保持現有的程式碼結構與架構
  - 在修改前充分理解現有實作

- ❌ **不應該做**:
  - 進行不必要的重構
  - 修改需求範圍外的檔案
  - 引入新的依賴套件（除非必要）
  - 改變既有的命名慣例或資料夾結構

**範例**:

```javascript
// ❌ 不好：順便重構無關的程式碼
function updateGrid(gridId, data) {
  // 修改目標：加入新欄位
  const updatedData = { ...data, newField: 'value' };
  
  // 不應該順便改寫這段無關邏輯
  const results = complexLogic.map(item => {
    return transformItem(item); // 原本就運作正常的程式碼
  });
}

// ✅ 好：只修改必要部分
function updateGrid(gridId, data) {
  // 只加入新欄位，其他邏輯保持原樣
  const updatedData = { ...data, newField: 'value' };
  
  // 保持原有邏輯不變
  const results = complexLogic.map(x => x.transform());
}
```

### 2. 遵循專案 ESLint 規範

**規範檔案**: `eslint.config.js`

專案已配置以下規則：

- 基於 `@eslint/js` 推薦規則
- React 18.3 相關規則
- React Hooks 最佳實踐
- React Refresh 相容性

**已停用的規則**（請勿違反專案決策）:
- `react/prop-types`: 'off' - 使用 TypeScript 型別，不使用 PropTypes
- `no-unused-vars`: 'off' - 允許未使用變數（環境變數等）
- `no-undef`: 'off' - 允許全域變數（process, require 等）
- `react/no-unknown-property`: 'off' - 允許自訂 JSX 屬性（如 cmdk-*, toast-*）

**開發流程**:

```bash
# 修改程式碼前先執行 lint 檢查
npm run lint

# 修改完成後再次確認
npm run lint
```

### 3. 程式碼風格準則

#### 後端 (Fastify)

**路由註冊模式**:

```typescript
// routes/example.ts
import type { FastifyInstance } from 'fastify';

export function registerExampleRoutes(app: FastifyInstance) {
  // GET 端點
  app.get('/api/examples', async (req, reply) => {
    if (!app.hasDecorator('db')) return [];
    const { rows } = await app.db.query('SELECT * FROM examples');
    return rows;
  });

  // POST 端點（需要身份驗證）
  app.post('/api/examples', async (req, reply) => {
    // 驗證與處理邏輯
  });
}
```

**資料庫操作**:

```typescript
// 使用 app.db decorator
if (!app.hasDecorator('db')) {
  return reply.status(503).send({ error: 'Database not available' });
}

const { rows } = await app.db.query(
  'SELECT * FROM table WHERE id = $1',
  [id]
);
```

#### 前端 (React)

**元件結構**:

```jsx
// pages/Example.jsx
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ExamplePage() {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    // 資料載入邏輯
  }, []);

  return (
    <div className="container mx-auto p-4">
      {/* 使用 Tailwind CSS */}
    </div>
  );
}
```

**API 呼叫**:

```javascript
// 使用現有的 API 客戶端
import { Entity } from "@/api/entities";
import { functionName } from "@/api/functions";

// 實體操作
const items = await Entity.list();
const item = await Entity.get(id);
await Entity.create(data);

// 函式呼叫
const result = await functionName(params);
```

### 4. 型別安全

**OpenAPI 工作流程**:

```bash
# 1. 修改 API 規格
# api-spec/openapi.yaml

# 2. 驗證規格
npm run openapi:lint

# 3. 產生 TypeScript 型別
npm run types:openapi

# 4. 建置共用型別套件
npm run types:build
```

**使用產生的型別**:

```typescript
import type { components } from 'shovel-shared-types/src/openapi';

// 使用 OpenAPI 定義的型別
type Grid = components['schemas']['Grid'];
type VolunteerRegistration = components['schemas']['VolunteerRegistration'];
```

### 5. 安全性要求

遵循 `SECURITY.md` 的規範：

- ✅ 輸入驗證：所有 API 端點必須驗證輸入資料
- ✅ 錯誤處理：不洩漏內部錯誤細節給前端
- ✅ 身份驗證：保護需要授權的端點
- ✅ 率限制：實作 API 呼叫頻率限制
- ❌ 不得提交：金鑰、密碼、個人資料

### 6. 測試與驗證

**手動驗證清單**:

```bash
# 前端開發
npm run dev          # 啟動開發伺服器
npm run build        # 確認建置成功
npm run lint         # 檢查程式碼品質

# 後端開發
npm run dev:api      # 啟動後端服務
# 訪問 http://localhost:8787/docs 查看 Swagger UI
# 訪問 http://localhost:8787/healthz 確認服務健康

# 資料庫
docker compose up -d db      # 啟動資料庫
npm run seed                 # 填入測試資料
npm run seed:clean           # 清空測試資料
```

---

## 開發工作流程

### 新增功能

1. **理解需求**: 確認需求範圍與影響範圍
2. **檢視現有實作**: 搜尋相似功能，參考既有模式
3. **最小變更**: 只修改必要的檔案
4. **遵循規範**: 依照 ESLint 與專案風格撰寫
5. **驗證功能**: 本機測試與 lint 檢查
6. **更新文件**: 同步更新 README、OpenAPI 規格

### 修復問題

1. **重現問題**: 理解問題的根本原因
2. **定位範圍**: 找出最小修改範圍
3. **保守修正**: 避免引入新的變更
4. **回歸測試**: 確認未影響其他功能

### 重構建議

> ⚠️ 除非明確要求，否則避免主動重構

如需重構：

- 必須有明確的理由（效能、可維護性）
- 獨立 PR，不與功能開發混合
- 充分測試，確保行為不變

---

## 參考文件

- **專案說明**: `README.md`
- **貢獻指南**: `CONTRIBUTING.md`
- **安全政策**: `SECURITY.md`
- **API 規格**: `api-spec/openapi.yaml`
- **型別定義**: `packages/shared-types/src/openapi.ts`

---

## 常見問題處理

### 前端

**Q: 需要新增 UI 元件？**

- 優先使用 `src/components/ui/` 現有元件
- 參考 Radix UI + Tailwind CSS 模式
- 保持與現有設計系統一致

**Q: 需要呼叫新的 API？**

- 檢查 `src/api/` 是否已有類似功能
- 遵循現有的 Base44 SDK 或 REST 客戶端模式
- 確保錯誤處理完整

### 後端

**Q: 需要新增 API 端點？**

- 先更新 `api-spec/openapi.yaml`
- 在對應的 routes 檔案新增路由
- 遵循既有的回應格式與錯誤處理

**Q: 需要修改資料庫 Schema？**

- 更新 `packages/backend/src/lib/db-init.ts`
- 使用 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- 確保向下相容

**Q: 需要新增中介軟體？**

- 參考 `packages/backend/src/middlewares/`
- 在 `index.ts` 適當位置註冊
- 注意執行順序

---

## 總結

作為 AI Agent，你的目標是：

1. 🎯 **精準修改**: 只改需要改的，不多不少
2. 📏 **遵循規範**: 尊重專案的 ESLint 與風格設定
3. 🔒 **保持穩定**: 避免破壞現有功能
4. 📚 **學習優先**: 先理解現有程式碼，再動手修改
5. 🤝 **協作思維**: 撰寫易於他人理解與維護的程式碼

記住：**最好的程式碼是不需要寫的程式碼，最好的重構是不需要做的重構。**
