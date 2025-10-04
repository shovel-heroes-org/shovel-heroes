# 權限管理系統 - Design Document

## Overview

本設計文檔描述了災難救援協調平台「鏟子英雄」的完整權限管理系統架構。系統採用三層權限架構（Admin/User/Guest），並提供垃圾桶功能、批量操作、CSV 匯入匯出等進階管理功能。

核心設計原則：
- **安全第一**：所有敏感操作需要 Admin 權限驗證
- **使用者友善**：提供清晰的視覺回饋和確認機制
- **可恢復性**：採用軟刪除模式，避免資料永久遺失
- **可擴展性**：權限系統設計便於未來擴展更多角色

## Architecture

### 整體架構

系統採用前後端分離架構，主要分為以下層級：

```
┌─────────────────────────────────────────────────────────┐
│                    前端層 (React)                        │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Admin UI   │  │ AuthContext  │  │  API Client   │  │
│  │  (Admin.jsx)│  │ (useAuth)    │  │  (admin.js)   │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────┘
                            ↕ HTTP/REST API
┌─────────────────────────────────────────────────────────┐
│                   後端層 (Fastify)                       │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │   Routes    │  │  Middleware  │  │  Database     │  │
│  │ (admin.ts)  │  │ (AuthMiddle) │  │ (PostgreSQL)  │  │
│  │ (csv.ts)    │  │              │  │               │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 權限驗證流程

1. **前端驗證**：使用 AuthContext 檢查使用者角色
2. **後端驗證**：使用 requireAdmin 中介軟體驗證 JWT token
3. **資料庫層級**：users 表的 role 欄位儲存權限資訊

### 核心模組

1. **認證模組** (`auth-line.ts`)
   - LINE OAuth 登入整合
   - 初始管理員設定
   - JWT token 發放

2. **權限中介軟體** (`AuthMiddleware.ts`)
   - `requireAdmin`: 驗證管理員權限
   - `requireLogin`: 驗證登入狀態

3. **管理員路由** (`admin.ts`)
   - 使用者管理 API
   - 網格垃圾桶操作 API

4. **CSV 處理** (`csv.ts`)
   - 網格資料匯出
   - 志願者資料匯出
   - 網格資料匯入
   - CSV 範本下載

5. **前端管理介面** (`Admin.jsx`)
   - 管理權限分頁（使用者管理）
   - 災區管理（含編輯、刪除操作選單）
   - 地區需求管理（含垃圾桶、批量操作）
   - 志願者資料管理
   - 工具頁面

## Components and Interfaces

### Backend Components

#### 1. AuthMiddleware (`packages/backend/src/middlewares/AuthMiddleware.ts`)

```typescript
interface User {
  id: number;
  lineId: string;
  name: string;
  role: 'admin' | 'user' | 'guest';
}

// 驗證管理員權限
function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
  done: () => void
): void

// 驗證登入狀態
function requireLogin(
  request: FastifyRequest,
  reply: FastifyReply,
  done: () => void
): void
```

**職責**：
- 從 JWT token 解析使用者資訊
- 驗證使用者權限層級
- 拒絕未授權請求

#### 2. Admin Routes (`packages/backend/src/routes/admin.ts`)

```typescript
// 取得所有使用者列表（含角色資訊）
GET /admin/users
Response: { users: User[] }

// 更新使用者角色
PATCH /admin/users/:userId/role
Body: { role: 'admin' | 'user' | 'guest' }
Response: { success: true, user: User }

// 將網格移至垃圾桶（軟刪除）
PATCH /admin/grids/:gridId/trash
Response: { success: true }

// 從垃圾桶恢復網格
PATCH /admin/grids/:gridId/restore
Response: { success: true }

// 永久刪除網格
DELETE /admin/grids/:gridId/permanent
Response: { success: true }

// 取得垃圾桶中的網格列表
GET /admin/grids/trash
Response: { grids: Grid[] }

// 批量刪除網格
POST /admin/grids/batch-delete
Body: { gridIds: number[] }
Response: { success: true, deletedCount: number }
```

**安全措施**：
- 所有端點都需要 Admin 權限
- 永久刪除前需要先移至垃圾桶
- 批量操作包含交易處理

#### 3. CSV Routes (`packages/backend/src/routes/csv.ts`)

```typescript
// 匯出網格資料為 CSV
GET /csv/export/grids
Query: { includeDeleted?: boolean }
Response: CSV file (text/csv)
Headers: Content-Disposition: attachment; filename=grids-{timestamp}.csv

// 匯出志願者資料為 CSV
GET /csv/export/volunteers
Response: CSV file (text/csv)

// 匯入網格資料
POST /csv/import/grids
Body: FormData with CSV file
Response: { success: true, imported: number, errors: string[] }

// 下載網格 CSV 範本
GET /csv/template/grids
Response: CSV template file
```

**CSV 格式規範**：

網格匯出欄位：
- id, grid_name, region, latitude, longitude, status, created_at, updated_at

網格匯入欄位（必填標記為 *）：
- grid_name*, region*, latitude*, longitude*, status

志願者匯出欄位：
- id, line_id, name, created_at

### Frontend Components

#### 1. AuthContext Hook (`src/context/AuthContext.jsx`)

```javascript
interface AuthContextValue {
  user: User | null;
  actingRole: 'admin' | 'user' | 'guest';
  isAdmin: boolean;
  login: () => void;
  logout: () => void;
}

const { user, actingRole, isAdmin } = useAuth();
```

**使用場景**：
- 檢查當前使用者權限
- 控制 UI 元件顯示/隱藏
- 判斷是否為管理員模式

#### 2. Admin API Client (`src/api/admin.js`)

```javascript
// 使用者管理
export async function getAdminUsers(): Promise<User[]>
export async function updateUserRole(userId: number, role: string): Promise<User>

// 垃圾桶操作
export async function moveGridToTrash(gridId: number): Promise<void>
export async function restoreGrid(gridId: number): Promise<void>
export async function permanentDeleteGrid(gridId: number): Promise<void>
export async function getTrashGrids(): Promise<Grid[]>
export async function batchDeleteGrids(gridIds: number[]): Promise<number>

// CSV 操作
export async function exportGridsCSV(includeDeleted: boolean): Promise<Blob>
export async function exportVolunteersCSV(): Promise<Blob>
export async function importGridsCSV(file: File): Promise<ImportResult>
export async function downloadGridsTemplate(): Promise<Blob>
```

#### 3. Admin Page Component (`src/pages/Admin.jsx`)

**分頁結構**：

```javascript
const tabs = [
  { id: 'permissions', label: '管理權限' },
  { id: 'grids', label: '地區需求' },
  { id: 'volunteers', label: '志願者資料' },
  { id: 'tools', label: '工具' }
];
```

**主要功能區塊**：

1. **管理權限分頁**
   - 使用者列表表格
   - 角色下拉選單
   - 即時角色更新

2. **地區需求分頁**
   - 網格卡片列表
   - 多選功能（checkbox）
   - 垃圾桶檢視切換
   - 批量操作按鈕
   - CSV 匯入/匯出

3. **志願者資料分頁**
   - 志願者列表
   - CSV 匯出功能

4. **工具分頁**
   - 緊急更新功能
   - 緊急刪除功能

**狀態管理**：

```javascript
// 網格相關
const [grids, setGrids] = useState([]);
const [trashGrids, setTrashGrids] = useState([]);
const [selectedGrids, setSelectedGrids] = useState([]);
const [isTrashView, setIsTrashView] = useState(false);

// 使用者管理
const [users, setUsers] = useState([]);

// UI 狀態
const [activeTab, setActiveTab] = useState('permissions');
const [isLoading, setIsLoading] = useState(false);
```

**批量操作流程**：

```javascript
// 選擇網格
const handleGridSelect = (gridId) => {
  setSelectedGrids(prev =>
    prev.includes(gridId)
      ? prev.filter(id => id !== gridId)
      : [...prev, gridId]
  );
};

// 批量刪除
const handleBatchDelete = async () => {
  if (selectedGrids.length === 0) return;

  if (!confirm(`確定要將 ${selectedGrids.length} 個網格移至垃圾桶？`)) {
    return;
  }

  await batchDeleteGrids(selectedGrids);
  setSelectedGrids([]);
  await fetchGrids();
};
```

## Data Models

### Database Schema

#### users 表

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  line_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- role 可能的值: 'admin', 'user', 'guest'
```

#### grids 表

```sql
CREATE TABLE grids (
  id SERIAL PRIMARY KEY,
  grid_name VARCHAR(255) NOT NULL,
  region VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- status 可能的值: 'active', 'deleted', 'completed'
```

### TypeScript Interfaces

```typescript
// 使用者介面
interface User {
  id: number;
  lineId: string;
  name: string;
  role: 'admin' | 'user' | 'guest';
  createdAt: string;
  updatedAt: string;
}

// 網格介面
interface Grid {
  id: number;
  gridName: string;
  region: string;
  latitude: number;
  longitude: number;
  status: 'active' | 'deleted' | 'completed';
  createdAt: string;
  updatedAt: string;
}

// CSV 匯入結果
interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
}

// API 回應包裝
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
```

### 權限層級定義

```typescript
enum UserRole {
  ADMIN = 'admin',   // 完整權限
  USER = 'user',     // 基本使用權限
  GUEST = 'guest'    // 唯讀權限
}

// 權限矩陣
const permissions = {
  admin: {
    canCreateGrid: true,
    canUpdateGrid: true,
    canDeleteGrid: true,
    canManageUsers: true,
    canExportCSV: true,
    canImportCSV: true,
    canAccessTrash: true,
    canPermanentDelete: true
  },
  user: {
    canCreateGrid: true,
    canUpdateGrid: true,
    canDeleteGrid: false,
    canManageUsers: false,
    canExportCSV: false,
    canImportCSV: false,
    canAccessTrash: false,
    canPermanentDelete: false
  },
  guest: {
    canCreateGrid: false,
    canUpdateGrid: false,
    canDeleteGrid: false,
    canManageUsers: false,
    canExportCSV: false,
    canImportCSV: false,
    canAccessTrash: false,
    canPermanentDelete: false
  }
};
```

## Error Handling

### 後端錯誤處理策略

#### 1. 權限錯誤

```typescript
// 401 Unauthorized - 未登入
if (!request.user) {
  return reply.status(401).send({
    message: 'Unauthorized - Login required'
  });
}

// 403 Forbidden - 權限不足
if (request.user.role !== 'admin') {
  return reply.status(403).send({
    message: 'Forbidden - Admin access required'
  });
}
```

#### 2. 資料驗證錯誤

```typescript
// 400 Bad Request - 資料格式錯誤
if (!['admin', 'user', 'guest'].includes(role)) {
  return reply.status(400).send({
    message: 'Invalid role. Must be admin, user, or guest'
  });
}

// 404 Not Found - 資源不存在
if (result.rowCount === 0) {
  return reply.status(404).send({
    message: 'Grid not found'
  });
}
```

#### 3. CSV 處理錯誤

```typescript
// CSV 匯入錯誤累積
const errors = [];
for (const [index, record] of records.entries()) {
  try {
    // 驗證必填欄位
    if (!record.grid_name || !record.region) {
      errors.push(`Row ${index + 2}: Missing required fields`);
      continue;
    }
    // 插入資料
  } catch (err) {
    errors.push(`Row ${index + 2}: ${err.message}`);
  }
}

return reply.send({
  success: true,
  imported: successCount,
  errors
});
```

#### 4. 資料庫錯誤

```typescript
try {
  await app.db.query('BEGIN');
  // 執行多個操作
  await app.db.query('COMMIT');
} catch (err) {
  await app.db.query('ROLLBACK');
  app.log.error(err);
  return reply.status(500).send({
    message: 'Database error occurred'
  });
}
```

### 前端錯誤處理策略

#### 1. API 呼叫錯誤處理

```javascript
// 統一錯誤處理包裝
async function apiCall(fn) {
  try {
    setIsLoading(true);
    await fn();
  } catch (error) {
    console.error('API Error:', error);
    alert(error.response?.data?.message || '操作失敗，請稍後再試');
  } finally {
    setIsLoading(false);
  }
}

// 使用範例
const handleDeleteGrid = (gridId) => {
  apiCall(async () => {
    await moveGridToTrash(gridId);
    await fetchGrids();
  });
};
```

#### 2. 使用者輸入驗證

```javascript
// CSV 檔案驗證
const handleCSVImport = (event) => {
  const file = event.target.files[0];

  if (!file) {
    alert('請選擇檔案');
    return;
  }

  if (!file.name.endsWith('.csv')) {
    alert('只接受 CSV 格式檔案');
    return;
  }

  if (file.size > 5 * 1024 * 1024) { // 5MB
    alert('檔案大小不可超過 5MB');
    return;
  }

  // 執行匯入
  apiCall(async () => {
    const result = await importGridsCSV(file);
    if (result.errors.length > 0) {
      alert(`匯入完成，但有 ${result.errors.length} 筆錯誤\n${result.errors.join('\n')}`);
    }
  });
};
```

#### 3. 批量操作確認

```javascript
// 批量刪除確認
const handleBatchDelete = async () => {
  if (selectedGrids.length === 0) {
    alert('請先選擇要刪除的網格');
    return;
  }

  const confirmed = confirm(
    `確定要將 ${selectedGrids.length} 個網格移至垃圾桶？\n` +
    `此操作可在垃圾桶中恢復。`
  );

  if (!confirmed) return;

  apiCall(async () => {
    const deletedCount = await batchDeleteGrids(selectedGrids);
    alert(`已將 ${deletedCount} 個網格移至垃圾桶`);
    setSelectedGrids([]);
    await fetchGrids();
  });
};
```

#### 4. 網路錯誤處理

```javascript
// HTTP client 錯誤攔截
http.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'ECONNABORTED') {
      alert('請求逾時，請檢查網路連線');
    } else if (error.response?.status === 401) {
      alert('登入已過期，請重新登入');
      // 重新導向到登入頁
    } else if (error.response?.status === 403) {
      alert('您沒有權限執行此操作');
    }
    return Promise.reject(error);
  }
);
```

### 錯誤記錄與監控

```javascript
// 後端錯誤記錄
app.log.error({
  type: 'PERMISSION_DENIED',
  userId: request.user?.id,
  endpoint: request.url,
  timestamp: new Date().toISOString()
});

// 前端錯誤記錄（可整合 Sentry 等服務）
window.addEventListener('error', (event) => {
  console.error('Global error:', {
    message: event.message,
    filename: event.filename,
    line: event.lineno,
    column: event.colno
  });
});
```

## Testing Strategy

### 測試層級架構

```
┌─────────────────────────────────────────────┐
│          E2E Tests (Playwright)             │
│   測試完整使用者流程和權限控制               │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│      Integration Tests (API Tests)          │
│   測試 API 端點、中介軟體、資料庫互動        │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│        Unit Tests (Jest/Vitest)             │
│   測試個別函數、元件、工具函數               │
└─────────────────────────────────────────────┘
```

### 1. E2E 測試 (Playwright)

**測試檔案**：`tests/e2e/admin-permissions.spec.js`

**測試場景**：

```javascript
// 場景 1: 訪客權限測試
test('訪客無法存取管理功能', async ({ page }) => {
  // 1. 未登入狀態下訪問管理頁面
  // 2. 驗證重新導向到登入頁
  // 3. 驗證無法看到管理員按鈕
});

// 場景 2: 一般使用者權限測試
test('一般使用者看不到管理權限分頁', async ({ page }) => {
  // 1. 以一般使用者身份登入
  // 2. 進入管理頁面
  // 3. 驗證看不到「管理權限」分頁
  // 4. 驗證看不到批量刪除按鈕
});

// 場景 3: 管理員完整功能測試
test('管理員可以管理使用者角色', async ({ page }) => {
  // 1. 以管理員身份登入
  // 2. 進入管理權限分頁
  // 3. 更改使用者角色
  // 4. 驗證角色更新成功
});

test('管理員可以使用垃圾桶功能', async ({ page }) => {
  // 1. 進入地區需求分頁
  // 2. 將網格移至垃圾桶
  // 3. 切換到垃圾桶檢視
  // 4. 驗證網格出現在垃圾桶
  // 5. 恢復網格
  // 6. 驗證網格回到正常列表
});

test('管理員可以批量刪除網格', async ({ page }) => {
  // 1. 選擇多個網格（點擊 checkbox）
  // 2. 點擊批量刪除按鈕
  // 3. 確認刪除對話框
  // 4. 驗證所選網格被移至垃圾桶
});

test('管理員可以匯出 CSV', async ({ page }) => {
  // 1. 點擊匯出 CSV 按鈕
  // 2. 等待下載
  // 3. 驗證檔案格式正確
});

test('管理員可以匯入 CSV', async ({ page }) => {
  // 1. 點擊匯入按鈕
  // 2. 上傳測試 CSV 檔案
  // 3. 驗證匯入成功訊息
  // 4. 驗證資料出現在列表中
});
```

**測試資料準備**：

```javascript
// test-data/valid-grids.csv
grid_name,region,latitude,longitude,status
測試網格1,台北市,25.0330,121.5654,active
測試網格2,新北市,25.0126,121.4656,active

// test-data/invalid-grids.csv
grid_name,region,latitude,longitude,status
,台北市,25.0330,121.5654,active  // 缺少 grid_name
測試網格,invalid,121.5654,active  // 缺少 latitude
```

### 2. API 整合測試

**測試檔案**：`tests/integration/admin-api.test.js`

```javascript
describe('Admin API - Authentication', () => {
  test('未登入使用者無法存取管理員 API', async () => {
    const response = await request(app)
      .get('/admin/users')
      .expect(401);

    expect(response.body.message).toContain('Login required');
  });

  test('一般使用者無法存取管理員 API', async () => {
    const userToken = await createUserToken('user');
    const response = await request(app)
      .get('/admin/users')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    expect(response.body.message).toContain('Admin access required');
  });
});

describe('Admin API - User Management', () => {
  test('管理員可以取得使用者列表', async () => {
    const adminToken = await createUserToken('admin');
    const response = await request(app)
      .get('/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.users).toBeInstanceOf(Array);
  });

  test('管理員可以更新使用者角色', async () => {
    const adminToken = await createUserToken('admin');
    const response = await request(app)
      .patch('/admin/users/2/role')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'admin' })
      .expect(200);

    expect(response.body.user.role).toBe('admin');
  });
});

describe('Admin API - Trash Operations', () => {
  test('管理員可以將網格移至垃圾桶', async () => {
    const adminToken = await createUserToken('admin');
    const response = await request(app)
      .patch('/admin/grids/1/trash')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // 驗證資料庫狀態
    const grid = await db.query('SELECT status FROM grids WHERE id = 1');
    expect(grid.rows[0].status).toBe('deleted');
  });

  test('管理員可以從垃圾桶恢復網格', async () => {
    const adminToken = await createUserToken('admin');
    await request(app)
      .patch('/admin/grids/1/restore')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const grid = await db.query('SELECT status FROM grids WHERE id = 1');
    expect(grid.rows[0].status).toBe('active');
  });
});

describe('CSV API', () => {
  test('管理員可以匯出網格 CSV', async () => {
    const adminToken = await createUserToken('admin');
    const response = await request(app)
      .get('/csv/export/grids')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect('Content-Type', /text\/csv/);

    expect(response.text).toContain('grid_name,region');
  });

  test('管理員可以匯入網格 CSV', async () => {
    const adminToken = await createUserToken('admin');
    const csvData = 'grid_name,region,latitude,longitude,status\n測試,台北,25.03,121.56,active';

    const response = await request(app)
      .post('/csv/import/grids')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csvData), 'test.csv')
      .expect(200);

    expect(response.body.imported).toBe(1);
  });
});
```

### 3. 前端單元測試

**測試檔案**：`tests/unit/Admin.test.jsx`

```javascript
describe('Admin Component', () => {
  test('管理員可以看到所有分頁', () => {
    const { getByText } = render(
      <AuthContext.Provider value={{ isAdmin: true }}>
        <Admin />
      </AuthContext.Provider>
    );

    expect(getByText('管理權限')).toBeInTheDocument();
    expect(getByText('地區需求')).toBeInTheDocument();
    expect(getByText('志願者資料')).toBeInTheDocument();
    expect(getByText('工具')).toBeInTheDocument();
  });

  test('一般使用者看不到管理權限分頁', () => {
    const { queryByText } = render(
      <AuthContext.Provider value={{ isAdmin: false }}>
        <Admin />
      </AuthContext.Provider>
    );

    expect(queryByText('管理權限')).not.toBeInTheDocument();
  });

  test('選擇網格時顯示藍色邊框', () => {
    const { getByTestId } = render(<GridCard id={1} />);
    const checkbox = getByTestId('grid-checkbox-1');

    fireEvent.click(checkbox);

    const card = getByTestId('grid-card-1');
    expect(card).toHaveClass('border-blue-500');
  });

  test('批量刪除按鈕在未選擇時禁用', () => {
    const { getByText } = render(<Admin />);
    const button = getByText('批量刪除');

    expect(button).toBeDisabled();
  });
});
```

### 4. 測試工具與配置

**Playwright 配置** (`playwright.config.js`)：

```javascript
module.exports = {
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ]
};
```

**測試資料清理**：

```javascript
// tests/helpers/test-db.js
export async function setupTestDB() {
  await db.query('TRUNCATE users, grids CASCADE');
  await db.query(`
    INSERT INTO users (line_id, name, role) VALUES
    ('admin-line-id', 'Test Admin', 'admin'),
    ('user-line-id', 'Test User', 'user'),
    ('guest-line-id', 'Test Guest', 'guest')
  `);
}

export async function cleanupTestDB() {
  await db.query('TRUNCATE users, grids CASCADE');
}
```

### 5. CI/CD 整合

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install dependencies
        run: npm ci
      - name: Run unit tests
        run: npm test
      - name: Run integration tests
        run: npm run test:integration
      - name: Install Playwright
        run: npx playwright install
      - name: Run E2E tests
        run: npm run test:e2e
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v2
        with:
          name: test-results
          path: test-results/
```

### 測試覆蓋率目標

- **整體覆蓋率**：> 80%
- **關鍵路徑**：> 95% (權限驗證、資料修改)
- **錯誤處理**：> 90%

### 測試執行順序

1. 本地開發：單元測試 (快速回饋)
2. PR 提交：單元測試 + 整合測試
3. 合併前：完整測試套件 (包含 E2E)
4. 部署前：完整測試 + 效能測試
