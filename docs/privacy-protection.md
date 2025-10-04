# 隱私保護機制說明

## 概述

本系統實作了完善的隱私保護機制，確保使用者的聯絡資訊只能被授權的相關人員查看。

## 角色定義

### 1. 訪客（Guest）
- **權限**：只能瀏覽公開資訊
- **限制**：無法看到任何聯絡資訊，需要登入才能進行互動

### 2. 一般使用者（User）
可以扮演三種角色：

#### A - 需求發起者（網格建立者）
- 建立網格時自動成為該網格的管理員
- **可見資訊**：
  - 自己建立的網格中所有志工的聯絡資訊
  - 自己建立的網格中所有捐贈者的聯絡資訊
- **管理權限**：
  - 可以管理該網格的志工報名狀態
  - 可以管理該網格的物資捐贈狀態

#### B - 志工
- 報名參與網格志工工作
- **可見資訊**：
  - 網格建立者（A）的聯絡資訊（永遠公開）
  - 自己的報名資訊和聯絡方式
- **隱私保護**：
  - 其他志工或訪客**看不到** B 的聯絡資訊
  - 只有網格建立者（A）才能看到 B 的聯絡資訊
- **管理權限**：
  - 可以管理自己的報名狀態

#### C - 物資捐贈者
- 捐贈物資給特定網格
- **可見資訊**：
  - 網格建立者（A）的聯絡資訊（永遠公開）
  - 自己的捐贈記錄
- **隱私保護**：
  - 其他使用者或訪客**看不到** C 的聯絡資訊
  - 只有網格建立者（A）才能看到 C 的聯絡資訊
- **管理權限**：
  - 可以管理自己的捐贈記錄

### 3. 網格管理員（Grid Manager）
- 可以管理所有網格
- 可以查看所有聯絡資訊

### 4. 管理員（Admin）和超級管理員（Super Admin）
- 完整的系統管理權限
- 可以查看所有聯絡資訊

## 隱私保護規則

### 志工聯絡資訊保護

**可見範圍：**
1. ✅ 網格建立者（A）：可查看該網格所有志工的聯絡資訊
2. ✅ 志工本人（B）：可查看自己的聯絡資訊
3. ✅ 管理員/超級管理員：可查看所有聯絡資訊
4. ❌ 其他使用者：無法查看志工的聯絡資訊

**實作位置：**
- `packages/backend/src/lib/privacy-filter.ts` - `filterVolunteerPrivacy()`
- `packages/backend/src/routes/volunteer-registrations.ts`

### 物資捐贈聯絡資訊保護

**可見範圍：**
1. ✅ 網格建立者（A）：可查看該網格所有捐贈者的聯絡資訊
2. ✅ 捐贈者本人（C）：可查看自己的聯絡資訊
3. ✅ 管理員/超級管理員：可查看所有聯絡資訊
4. ❌ 其他使用者：無法查看捐贈者的聯絡資訊

**實作位置：**
- `packages/backend/src/lib/privacy-filter.ts` - `filterDonationPrivacy()`
- `packages/backend/src/routes/supply-donations.ts`

### 網格建立者聯絡資訊

**可見範圍：**
- ✅ **永遠公開**：所有人都可以查看網格建立者的聯絡資訊
- 這是為了讓志工和捐贈者能夠聯繫需求發起者

## 技術實作

### 後端實作

#### 隱私過濾函數
```typescript
// packages/backend/src/lib/privacy-filter.ts

// 過濾志工報名資料
filterVolunteerPrivacy(registration, user, gridCreatorId)

// 批次過濾志工資料
filterVolunteersPrivacy(registrations, user, gridCreatorId)

// 過濾物資捐贈資料
filterDonationPrivacy(donation, user, gridCreatorId)

// 批次過濾捐贈資料
filterDonationsPrivacy(donations, user, gridCreatorId)
```

#### API 路由整合
```typescript
// 志工報名 API
app.get('/volunteer-registrations', async (req) => {
  // 1. 查詢資料並加入網格建立者資訊
  const { rows } = await app.db.query(`
    SELECT vr.*, g.created_by_id as grid_creator_id
    FROM volunteer_registrations vr
    LEFT JOIN grids g ON g.id = vr.grid_id
    WHERE vr.grid_id = $1
  `, [gridId]);

  // 2. 根據使用者身份過濾隱私資訊
  const filtered = filterVolunteersPrivacy(
    rows,
    req.user || null,
    gridCreatorId
  );

  return filtered;
});
```

### 前端顯示

前端會自動接收已過濾的資料：

```javascript
// 如果聯絡資訊被過濾，欄位會是 undefined
{
  id: "xxx",
  volunteer_name: "張三",
  volunteer_phone: undefined,  // 非授權使用者看不到
  volunteer_email: undefined   // 非授權使用者看不到
}
```

## 使用流程範例

### 場景一：一般使用者 A 建立網格

1. A 登入後點選「我要人力」建立網格
2. A 填寫聯絡資訊（電話、Email）
3. A 的聯絡資訊**永遠公開**，所有人都可以看到
4. A 自動成為該網格的管理員

### 場景二：志工 B 報名

1. B 登入後瀏覽網格列表
2. B 可以看到 A 的聯絡資訊
3. B 填寫報名表單，包含自己的聯絡資訊
4. **隱私保護生效**：
   - A 可以看到 B 的聯絡資訊
   - B 可以看到自己的聯絡資訊
   - 其他使用者**看不到** B 的聯絡資訊

### 場景三：捐贈者 C 捐贈物資

1. C 登入後選擇要捐贈的網格
2. C 可以看到 A 的聯絡資訊
3. C 填寫捐贈表單，包含自己的聯絡資訊
4. **隱私保護生效**：
   - A 可以看到 C 的聯絡資訊
   - C 可以看到自己的捐贈記錄
   - 其他使用者**看不到** C 的聯絡資訊

## 資料庫欄位對應

### volunteer_registrations 表
- `volunteer_phone` - 志工電話（隱私欄位）
- `volunteer_email` - 志工Email（隱私欄位）
- `user_id` - 志工使用者ID（用於判斷是否為本人）
- `created_by_id` - 建立者ID（用於判斷是否為本人）

### supply_donations 表
- `donor_contact` - 捐贈者聯絡方式（隱私欄位）

### grids 表
- `contact_info` - 網格建立者聯絡資訊（公開欄位）
- `created_by_id` - 網格建立者ID（用於權限判斷）

## 安全性考量

1. **後端驗證**：隱私過濾在後端執行，前端無法繞過
2. **最小權限原則**：使用者只能看到必要的資訊
3. **關聯性驗證**：透過資料庫 JOIN 確保權限正確性
4. **NULL 安全**：未授權的欄位返回 `undefined`，而非空字串

## 未來擴展

### 建議改進

1. **物資捐贈追蹤**：在 `supply_donations` 表加入 `created_by_id` 欄位，以便追蹤捐贈者身份
2. **更細緻的權限控制**：可以讓使用者選擇是否公開部分聯絡資訊
3. **通知機制**：當有人查看聯絡資訊時，通知資訊擁有者
4. **隱私設定**：讓使用者自訂隱私設定

## 測試檢查清單

- [ ] 訪客無法看到任何聯絡資訊
- [ ] 網格建立者可以看到該網格所有志工的聯絡資訊
- [ ] 網格建立者可以看到該網格所有捐贈者的聯絡資訊
- [ ] 志工只能看到自己的聯絡資訊
- [ ] 捐贈者只能看到自己的聯絡資訊
- [ ] 其他網格的建立者看不到不相關志工的聯絡資訊
- [ ] 管理員可以看到所有聯絡資訊
- [ ] 網格建立者的聯絡資訊對所有人公開
