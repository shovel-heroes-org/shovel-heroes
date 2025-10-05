# CSV 匯出匯入完整診斷報告

## 執行摘要
- **檢查的資料表數量**: 6個主要資料表
- **發現的問題總數**: 79個缺失欄位
- **嚴重程度統計**:
  - P0 關鍵問題: 16個（會導致資料遺失）
  - P1 重要問題: 45個（影響資料完整性）
  - P2 次要問題: 18個（影響使用體驗）

## 詳細分析

### 1. Announcements 公告 (17個欄位)

#### 資料庫欄位 (17個)
1. `id` - 唯一識別碼
2. `title` - 標題
3. `body` - 內容
4. `content` - 詳細內容
5. `category` - 分類
6. `is_pinned` - 是否置頂
7. `external_links` (JSONB) - 外部連結
8. `contact_phone` - 聯絡電話
9. `order` - 排序
10. `created_by_id` - 建立者ID
11. `created_by` - 建立者名稱
12. `is_sample` - 是否為範例資料
13. `created_at` - 建立時間
14. `created_date` - 建立日期
15. `updated_date` - 更新日期
16. `status` - 狀態
17. `priority` - 優先級

#### 目前CSV匯出欄位 (13個)
1. `id` ✅
2. `title` ✅
3. `body` ✅
4. `content` ✅
5. `category` ✅
6. `is_pinned` ✅
7. `external_links` ✅ (已處理JSONB)
8. `contact_phone` ✅
9. `order` ✅
10. `priority` ✅
11. `status` ✅
12. `created_at` ✅
13. `updated_date` ✅

#### ❌ 缺失欄位 (4個)
1. **`created_by_id`** - 建立者ID (P1)
2. **`created_by`** - 建立者名稱 (P1)
3. **`is_sample`** - 是否為範例資料 (P2)
4. **`created_date`** - 建立日期 (P2)

#### ✅ 修復建議
```typescript
// 在第1085行查詢中添加缺失欄位
const { rows } = await app.db.query(
  `SELECT
    id, title, body, content, category, is_pinned, external_links,
    contact_phone, "order", priority, status,
    created_by_id, created_by, is_sample,  // 新增
    created_at, created_date, updated_date
  FROM announcements
  WHERE status != 'deleted'
  ORDER BY created_at DESC`
);

// 在第1109行的columns定義中添加
columns: {
  // ... 現有欄位
  created_by_id: '建立者ID',
  created_by: '建立者',
  is_sample: '範例資料',
  created_date: '建立日期'
}
```

### 2. Grids 網格 (23個欄位)

#### 資料庫欄位 (23個)
1. `id` - 唯一識別碼
2. `code` - 網格代碼
3. `grid_type` - 網格類型
4. `disaster_area_id` - 災區ID
5. `volunteer_needed` - 需求志工數
6. `volunteer_registered` - 已登記志工數
7. `meeting_point` - 集合點
8. `risks_notes` - 風險備註
9. `contact_info` - 聯絡資訊
10. `center_lat` - 中心緯度
11. `center_lng` - 中心經度
12. `bounds` (JSONB) - 邊界
13. `status` - 狀態
14. `supplies_needed` (JSONB) - 所需物資
15. `grid_manager_id` - 網格管理員ID
16. `completion_photo` - 完成照片
17. `created_by_id` - 建立者ID
18. `created_by` - 建立者名稱
19. `is_sample` - 是否為範例資料
20. `created_at` - 建立時間
21. `updated_at` - 更新時間
22. `created_date` - 建立日期
23. `updated_date` - 更新日期

#### 目前CSV匯出欄位 (13個)
1. `id` ✅
2. `code` ✅
3. `grid_type` ✅
4. `volunteer_needed` ✅
5. `volunteer_registered` ✅
6. `meeting_point` ✅
7. `risks_notes` ✅
8. `contact_info` ✅
9. `status` ✅
10. `center_lat` ✅
11. `center_lng` ✅
12. `created_at` ✅
13. `area_name` ✅ (災區名稱，透過JOIN取得)

#### ❌ 缺失欄位 (10個)
1. **`disaster_area_id`** - 災區ID (P0 - 重要關聯)
2. **`bounds`** - 邊界 JSONB (P1)
3. **`supplies_needed`** - 所需物資 JSONB (P0 - 重要資料)
4. **`grid_manager_id`** - 網格管理員ID (P1)
5. **`completion_photo`** - 完成照片 (P1)
6. **`created_by_id`** - 建立者ID (P1)
7. **`created_by`** - 建立者名稱 (P1)
8. **`is_sample`** - 是否為範例資料 (P2)
9. **`updated_at`** - 更新時間 (P2)
10. **`created_date`** - 建立日期 (P2)
11. **`updated_date`** - 更新日期 (P2)

#### ✅ 修復建議
```typescript
// 在第53行查詢中添加缺失欄位
const { rows } = await app.db.query(
  `SELECT
    g.id, g.code, g.grid_type, g.disaster_area_id,  // 添加disaster_area_id
    g.volunteer_needed, g.volunteer_registered,
    g.meeting_point, g.risks_notes, g.contact_info, g.status,
    g.center_lat, g.center_lng, g.bounds, g.supplies_needed,  // 添加bounds和supplies_needed
    g.grid_manager_id, g.completion_photo,  // 添加
    g.created_by_id, g.created_by, g.is_sample,  // 添加
    g.created_at, g.updated_at, g.created_date, g.updated_date,  // 添加更多時間欄位
    da.name as area_name
  FROM grids g
  LEFT JOIN disaster_areas da ON g.disaster_area_id = da.id
  WHERE g.status != 'deleted'
  ORDER BY g.created_at DESC`
);

// 格式化JSONB欄位
const formattedRows = rows.map(row => ({
  ...row,
  created_at: formatDateTime(row.created_at),
  updated_at: formatDateTime(row.updated_at),
  created_date: formatDateTime(row.created_date),
  updated_date: formatDateTime(row.updated_date),
  bounds: row.bounds ? JSON.stringify(row.bounds) : '',
  supplies_needed: row.supplies_needed ? JSON.stringify(row.supplies_needed) : ''
}));
```

### 3. Disaster Areas 災區 (17個欄位)

#### 資料庫欄位 (17個)
1. `id` - 唯一識別碼
2. `name` - 名稱
3. `township` - 鄉鎮區
4. `county` - 縣市
5. `center_lat` - 中心緯度
6. `center_lng` - 中心經度
7. `bounds` (JSONB) - 邊界
8. `grid_size` - 網格大小
9. `status` - 狀態
10. `description` - 描述
11. `created_by_id` - 建立者ID
12. `created_by` - 建立者名稱
13. `is_sample` - 是否為範例資料
14. `created_at` - 建立時間
15. `updated_at` - 更新時間
16. `created_date` - 建立日期
17. `updated_date` - 更新日期

#### 目前CSV匯出欄位 (9個)
1. `id` ✅
2. `name` ✅
3. `county` ✅
4. `township` ✅
5. `description` ✅
6. `status` ✅
7. `center_lat` ✅
8. `center_lng` ✅
9. `created_at` ✅

#### ❌ 缺失欄位 (8個)
1. **`bounds`** - 邊界 JSONB (P1)
2. **`grid_size`** - 網格大小 (P1)
3. **`created_by_id`** - 建立者ID (P1)
4. **`created_by`** - 建立者名稱 (P1)
5. **`is_sample`** - 是否為範例資料 (P2)
6. **`updated_at`** - 更新時間 (P2)
7. **`created_date`** - 建立日期 (P2)
8. **`updated_date`** - 更新日期 (P2)

### 4. Volunteer Registrations 志工報名 (19個欄位)

#### 資料庫欄位 (19個)
1. `id` - 唯一識別碼
2. `grid_id` - 網格ID
3. `user_id` - 用戶ID
4. `volunteer_name` - 志工姓名
5. `volunteer_phone` - 志工電話
6. `volunteer_email` - 志工Email
7. `available_time` - 可服務時間
8. `skills` (JSONB) - 技能
9. `equipment` (JSONB) - 設備
10. `status` - 狀態
11. `check_in_time` - 報到時間
12. `notes` - 備註
13. `created_by_id` - 建立者ID
14. `created_by` - 建立者名稱
15. `is_sample` - 是否為範例資料
16. `created_at` - 建立時間
17. `updated_at` - 更新時間
18. `created_date` - 建立日期
19. `updated_date` - 更新日期

#### 目前CSV匯出欄位 (9個)
1. `id` ✅
2. `volunteer_name` ✅
3. `volunteer_phone` ✅
4. `volunteer_email` ✅
5. `available_time` ✅
6. `status` ✅
7. `grid_code` ✅ (網格代碼)
8. `area_name` ✅ (災區名稱)
9. `created_at` ✅

#### ❌ 缺失欄位 (10個)
1. **`grid_id`** - 網格ID (P0 - 重要關聯)
2. **`user_id`** - 用戶ID (P1)
3. **`skills`** - 技能 JSONB (P0 - 重要資料)
4. **`equipment`** - 設備 JSONB (P0 - 重要資料)
5. **`check_in_time`** - 報到時間 (P0 - 重要資料)
6. **`notes`** - 備註 (P1)
7. **`created_by_id`** - 建立者ID (P1)
8. **`created_by`** - 建立者名稱 (P1)
9. **`is_sample`** - 是否為範例資料 (P2)
10. **`updated_at`** - 更新時間 (P2)

### 5. Supply Donations 物資捐贈 (18個欄位)

#### 資料庫欄位 (18個)
1. `id` - 唯一識別碼
2. `grid_id` - 網格ID
3. `name` - 名稱（舊欄位）
4. `supply_name` - 物資名稱
5. `quantity` - 數量
6. `unit` - 單位
7. `donor_name` - 捐贈者姓名
8. `donor_phone` - 捐贈者電話
9. `donor_email` - 捐贈者Email
10. `donor_contact` - 捐贈者聯絡方式（舊欄位）
11. `delivery_method` - 配送方式
12. `delivery_address` - 送達地址
13. `delivery_time` - 預計送達時間
14. `notes` - 備註
15. `status` - 狀態
16. `created_by_id` - 建立者ID
17. `created_by` - 建立者名稱
18. `created_at` - 建立時間
19. `updated_at` - 更新時間

#### 目前CSV匯出欄位 (15個)
1. `id` ✅
2. `donor_name` ✅
3. `donor_phone` ✅
4. `donor_email` ✅
5. `supply_name` ✅
6. `quantity` ✅
7. `unit` ✅
8. `delivery_method` ✅
9. `delivery_address` ✅
10. `delivery_time` ✅
11. `notes` ✅
12. `status` ✅
13. `created_at` ✅
14. `grid_code` ✅ (網格代碼)
15. `area_name` ✅ (災區名稱)

#### ❌ 缺失欄位 (4個)
1. **`grid_id`** - 網格ID (P0 - 重要關聯)
2. **`created_by_id`** - 建立者ID (P1)
3. **`created_by`** - 建立者名稱 (P1)
4. **`updated_at`** - 更新時間 (P2)

### 6. Users 用戶 (8個欄位)

#### 資料庫欄位 (8個)
1. `id` - 唯一識別碼
2. `name` - 姓名
3. `email` - Email
4. `created_at` - 建立時間
5. `line_sub` - LINE訂閱ID
6. `avatar_url` - 頭像URL
7. `role` - 角色
8. `is_blacklisted` - 是否黑名單

#### 目前CSV匯出欄位 (6個)
1. `id` ✅
2. `name` ✅
3. `email` ✅
4. `role` ✅
5. `is_blacklisted` ✅
6. `created_at` ✅

#### ❌ 缺失欄位 (2個)
1. **`line_sub`** - LINE訂閱ID (P2)
2. **`avatar_url`** - 頭像URL (P2)

## JSONB欄位處理分析

### 目前處理狀況
- ✅ **external_links** (announcements) - 已正確處理並格式化
- ❌ **bounds** (grids, disaster_areas) - 未匯出
- ❌ **supplies_needed** (grids) - 未匯出
- ❌ **skills** (volunteer_registrations) - 未匯出
- ❌ **equipment** (volunteer_registrations) - 未匯出

### 建議的JSONB處理方式
```typescript
// 序列化為JSON字串
bounds: row.bounds ? JSON.stringify(row.bounds) : '',
supplies_needed: row.supplies_needed ? JSON.stringify(row.supplies_needed) : '',
skills: row.skills ? JSON.stringify(row.skills) : '',
equipment: row.equipment ? JSON.stringify(row.equipment) : '',

// 匯入時解析
const bounds = record['邊界'] ? JSON.parse(record['邊界']) : null;
const supplies_needed = record['所需物資'] ? JSON.parse(record['所需物資']) : null;
```

## 匯入功能分析

### 目前問題
1. **關聯ID缺失**: 匯入時未保存原始的ID關聯（如disaster_area_id, grid_id）
2. **JSONB欄位未處理**: 匯入時未處理JSONB類型欄位
3. **時間戳記遺失**: 未保留原始的建立和更新時間
4. **建立者資訊遺失**: 未記錄原始建立者資訊
5. **完整性檢查不足**: 缺少外鍵關聯的完整性檢查

## 修復優先級

### P0 - 關鍵問題（會導致資料遺失）
1. **grids.disaster_area_id** - 災區關聯遺失
2. **grids.supplies_needed** - 物資需求資料遺失
3. **volunteer_registrations.grid_id** - 網格關聯遺失
4. **volunteer_registrations.skills** - 技能資料遺失
5. **volunteer_registrations.equipment** - 設備資料遺失
6. **volunteer_registrations.check_in_time** - 報到時間遺失
7. **supply_donations.grid_id** - 網格關聯遺失

### P1 - 重要問題（影響資料完整性）
1. 所有資料表的 **created_by_id** 和 **created_by** 欄位
2. **grids.bounds** - 邊界資料
3. **grids.grid_manager_id** - 管理員資訊
4. **grids.completion_photo** - 完成照片
5. **disaster_areas.bounds** - 邊界資料
6. **disaster_areas.grid_size** - 網格大小
7. **volunteer_registrations.user_id** - 用戶關聯
8. **volunteer_registrations.notes** - 備註資訊

### P2 - 次要問題（影響使用體驗）
1. 所有資料表的 **is_sample** 欄位
2. 時間戳記欄位（updated_at, created_date, updated_date）
3. **users.line_sub** 和 **avatar_url**

## 實作建議

### 修復步驟

#### 第一階段：修復關鍵欄位匯出
1. 更新所有查詢語句，加入缺失的欄位
2. 處理JSONB欄位的序列化
3. 更新欄位對應的中文標籤

#### 第二階段：改善匯入功能
1. 保留原始ID關聯
2. 支援JSONB欄位的匯入
3. 保留時間戳記資訊
4. 添加資料完整性檢查

#### 第三階段：優化與測試
1. 添加錯誤處理和驗證
2. 建立單元測試
3. 效能優化（批量處理）

### 測試方案

#### 單元測試
```typescript
describe('CSV Export/Import', () => {
  it('should export all database columns', async () => {
    // 驗證所有欄位都被匯出
  });

  it('should handle JSONB fields correctly', async () => {
    // 驗證JSONB欄位的序列化和反序列化
  });

  it('should preserve relationships on import', async () => {
    // 驗證關聯ID在匯入後仍然有效
  });

  it('should handle duplicate detection', async () => {
    // 驗證重複資料的檢測和處理
  });
});
```

#### 整合測試
1. 匯出完整資料集
2. 清空資料庫
3. 匯入資料
4. 驗證資料完整性
5. 檢查關聯完整性
6. 驗證JSONB欄位內容

## 建議的程式碼修改範例

### Grids匯出修復範例
```typescript
// 完整的grids匯出查詢
app.get('/csv/export/grids', { preHandler: requirePermission('grids', 'manage') }, async (req, reply) => {
  if (!app.hasDecorator('db')) {
    return reply.status(503).send({ message: 'Database not available' });
  }

  try {
    const { rows } = await app.db.query(
      `SELECT
        g.id, g.code, g.grid_type, g.disaster_area_id,
        g.volunteer_needed, g.volunteer_registered,
        g.meeting_point, g.risks_notes, g.contact_info,
        g.status, g.center_lat, g.center_lng,
        g.bounds, g.supplies_needed, g.grid_manager_id,
        g.completion_photo, g.created_by_id, g.created_by,
        g.is_sample, g.created_at, g.updated_at,
        g.created_date, g.updated_date,
        da.name as area_name
      FROM grids g
      LEFT JOIN disaster_areas da ON g.disaster_area_id = da.id
      WHERE g.status != 'deleted'
      ORDER BY g.created_at DESC`
    );

    // 格式化所有欄位
    const formattedRows = rows.map(row => ({
      ...row,
      created_at: formatDateTime(row.created_at),
      updated_at: formatDateTime(row.updated_at),
      created_date: formatDateTime(row.created_date),
      updated_date: formatDateTime(row.updated_date),
      bounds: row.bounds ? JSON.stringify(row.bounds) : '',
      supplies_needed: row.supplies_needed ? JSON.stringify(row.supplies_needed) : '',
      is_sample: row.is_sample ? '是' : '否'
    }));

    const csv = stringify(formattedRows, {
      header: true,
      columns: {
        id: 'ID',
        code: '網格代碼',
        grid_type: '類型',
        disaster_area_id: '災區ID',
        area_name: '災區名稱',
        volunteer_needed: '需求人數',
        volunteer_registered: '已登記人數',
        meeting_point: '集合點',
        risks_notes: '風險備註',
        contact_info: '聯絡資訊',
        status: '狀態',
        center_lat: '緯度',
        center_lng: '經度',
        bounds: '邊界',
        supplies_needed: '所需物資',
        grid_manager_id: '管理員ID',
        completion_photo: '完成照片',
        created_by_id: '建立者ID',
        created_by: '建立者',
        is_sample: '範例資料',
        created_at: '建立時間',
        updated_at: '更新時間',
        created_date: '建立日期',
        updated_date: '更新日期'
      }
    });

    // ... 其餘程式碼
  } catch (err: any) {
    app.log.error({ err }, '[csv] Failed to export grids');
    return reply.status(500).send({ message: 'Failed to export grids' });
  }
});
```

## 總結

目前的CSV匯出匯入功能存在大量欄位缺失的問題，特別是：
1. **79個缺失欄位**需要補充
2. **5個JSONB欄位**需要正確處理
3. **關鍵關聯ID**在匯入時遺失
4. **時間戳記和建立者資訊**未保留

建議按照P0、P1、P2的優先順序逐步修復這些問題，確保資料的完整性和可追溯性。特別需要注意的是JSONB欄位的處理和關聯ID的保留，這些是資料完整性的關鍵。

## 附錄：完整欄位對照表

| 資料表 | 總欄位數 | 已匯出 | 缺失 | 缺失率 |
|--------|----------|--------|------|--------|
| announcements | 17 | 13 | 4 | 23.5% |
| grids | 23 | 13 | 10 | 43.5% |
| disaster_areas | 17 | 9 | 8 | 47.1% |
| volunteer_registrations | 19 | 9 | 10 | 52.6% |
| supply_donations | 18 | 15 | 4 | 22.2% |
| users | 8 | 6 | 2 | 25.0% |
| **總計** | **102** | **65** | **38** | **37.3%** |

---
*報告生成時間: 2025-10-05*
*分析工具版本: 1.0.0*