# 2025-10-05 志工與物資聯絡資訊權限排查筆記

## 摘要
- 管理視角無法看到志工電話、網格管理員無法檢視對應網格的志工電話。
- 物資捐贈清單在未授權角色下仍可能顯示聯絡資訊或顯示判斷不一致。
- 後端 `/volunteers` 與 `/supply-donations` 路由缺少 `grid_manager_id` 與 `created_by_id` 判斷，導致聯絡資訊顯示與後台隱私設定不符。

## 搜尋結果紀錄
- `grep -R "志工報名" -n src` → 確認 UI 顯示電話的程式在 `src/pages/Volunteers.jsx`。
- `grep -R "物資捐贈" -n src/pages` → 確認電話顯示與權限判斷在 `src/pages/Supplies.jsx`。
- `grep -R "volunteer_phone" -n packages/backend/src` → 發現後端 `/volunteers` 路由過濾邏輯於 `packages/backend/src/routes/volunteers.ts`。
- `grep -R "filterDonationPrivacy" packages/backend/src` → 鎖定隱私過濾器 `packages/backend/src/lib/privacy-filter.ts`。

## 調整重點
- 在隱私過濾器中加入網格管理員 ID 判斷，並支援多個管理 ID。
- `/volunteers` 路由查詢加入 `created_by_id`、`grid_manager_id`，以建立者、管理者身分決定電話露出。
- `/volunteer-registrations` 與 `/supply-donations` 路由傳遞網格管理員資訊給隱私過濾器。
- 確保志工本人（`created_by_id`/`user_id`）與捐贈者本人符合隱私規則時可看到自己的聯絡資訊。
- 新增 `actingRole` 與 `role_permissions` 判斷：若隱私權限被關閉，即使為管理員/網格管理者也會遮蔽聯絡資訊，僅保留資料本人可見。
- `view_volunteer_contact`、`view_donor_contact` 依據 `role_permissions` 的 `can_view` 決定是否允許顯示敏感欄位。

## 測試
- `npm run lint`：成功（僅既有 warnings，無新增錯誤）。
