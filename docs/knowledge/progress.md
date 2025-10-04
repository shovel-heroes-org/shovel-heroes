# Project: 鏟子英雄 (Shovel Heroes)
*Last updated: 2025-10-04 19:00*

## Context Index
- 專案類型: 災後救援志願者媒合平台
- 技術棧: React + Fastify + PostgreSQL + Docker
- 當前功能: 救援地圖、志工報名、多時段選擇、完整權限系統
- 權限文件: `docs/permission-usage-example.md`
- 權限初始化: `packages/backend/scripts/init-permissions.ts`

## Pinned
- 必須使用繁體中文進行所有開發與文件撰寫
- 禁止簡化或刪除現有程式碼（除非測試目的）
- 所有測試程式碼必須獨立存放於 tests/ 資料夾
- BAT 檔案必須使用 ANSI 編碼
- 資料庫操作必須考慮軟刪除機制，避免永久遺失資料
- 權限檢查必須前後端雙重驗證，不可只依賴前端檢查
- 訪客模式無法訪問需登入功能（管理後台、志工中心等）
- 一般用戶只能編輯自己建立的資源
- 超級管理員才能訪問權限設定頁面
- 所有權限操作需記錄稽核日誌
- 垃圾桶視圖切換時必須主動重新載入資料，確保顯示最新的垃圾桶項目

## Decisions
- 2025-10-03 00:00: 決定實作三層權限管理系統（Admin/User/訪客），強化平台管理能力與資料安全性
- 2025-10-03 00:00: 確定採用軟刪除機制（垃圾桶功能），所有刪除操作先進入垃圾桶，可還原或永久刪除
- 2025-10-03 00:00: 決定透過 .env 設定初始管理員帳號，方便部署與安全管理
- 2025-10-03 00:00: 最終選擇使用 CSV 格式進行資料匯入/匯出功能，便於與外部系統整合
- 2025-10-04 14:00: 決定實作五層權限角色系統（guest/user/grid_manager/admin/super_admin），基於 role_permissions 表進行動態權限控制
- 2025-10-04 14:00: 確定採用 Hook + 組件雙軌權限檢查機制（usePermission Hook + PermissionGate 組件），提供靈活的權限控制方式
- 2025-10-04 14:00: 敲定權限快取策略，在 Hook 層面實作快取機制提升效能
- 2025-10-04 14:00: 最終選擇建立 UnauthorizedAccess 獨立頁面，提供友善的無權限提示體驗
- 2025-10-04 16:00: 決定在 announcements 表新增 priority 欄位（預設值 'normal'），支援三種優先級：low、normal、high
- 2025-10-04 17:00: 決定垃圾桶視圖切換時主動重新載入資料，確保即時顯示最新的垃圾桶項目
- 2025-10-04 18:00: 確定垃圾桶功能的統一實作模式：切換狀態 + 重新載入垃圾桶資料

## TODO
- [P0][OPEN][#1] 調整資料庫結構：在 users 表新增 role 欄位（admin/user/guest）與軟刪除相關欄位
- [P1][OPEN][#3] 在現有頁面套用權限控制：Map 頁面的網格操作權限檢查
- [P1][OPEN][#4] 在現有頁面套用權限控制：Supplies 頁面的物資管理權限檢查
- [P1][OPEN][#5] 實作垃圾桶功能：建立軟刪除 API、垃圾桶列表頁面、還原與永久刪除功能
- [P1][OPEN][#6] 實作 CSV 匯入功能：支援批量匯入救援地點、志工資料
- [P1][DONE][#7] 實作 CSV 匯出功能：支援匯出救援地點、志工報名資料（公告匯出功能已修復）
- [P1][OPEN][#11] 執行各角色的完整權限功能測試
- [P1][OPEN][#12] 測試權限切換時的 UI 即時更新
- [P2][OPEN][#8] 建立權限管理頁面：Admin 可查看並修改使用者權限
- [P2][OPEN][#9] 實作 .env 初始管理員設定：在系統初始化時自動建立管理員帳號
- [P2][OPEN][#13] 權限效能優化：實作權限預載入機制
- [P2][OPEN][#14] 權限效能優化：優化權限快取策略
- [P2][OPEN][#15] 改善無權限操作的友善提示與替代方案
- [P2][OPEN][#16] 實作權限使用的定期審計功能
- [P2][OPEN][#17] 實作權限變更的完整記錄功能

## Done
- 2025-10-03: [#0] 完成了專案進度記錄系統初始化 (evidence: docs/knowledge/progress.md)
- 2025-10-04: [#18] 完成了權限資料初始化，執行 init-permissions.ts 腳本建立 35 條權限資料，涵蓋 5 個角色與 11 種資源 (evidence: packages/backend/scripts/init-permissions.ts)
- 2025-10-04: [#19] 完成了權限檢查 Hook 實作，包含 hasPermission、canView/canCreate/canEdit/canDelete/canManage 等便捷方法，內建快取機制 (evidence: src/hooks/usePermission.js)
- 2025-10-04: [#20] 完成了權限控制組件實作，包含 PermissionGate、PermissionButton、RoleGate、PermissionGuard、withPermission HOC (evidence: src/components/common/PermissionGate.jsx)
- 2025-10-04: [#21] 完成了無權限訪問頁面，提供友善的 403 提示介面 (evidence: src/components/common/UnauthorizedAccess.jsx)
- 2025-10-04: [#22] 完成了完整權限使用文件，包含權限類別說明、角色對照表、使用範例、最佳實踐建議 (evidence: docs/permission-usage-example.md)
- 2025-10-04: [#23] 完成了互動式權限範例組件，提供 5 個實用範例展示 (evidence: src/components/examples/PermissionExample.jsx)
- 2025-10-04: [#24] 完成了 Admin 頁面權限整合，訪客模式/未登入顯示無權限頁面 (evidence: src/pages/Admin.jsx)
- 2025-10-04: [#25] 完成了 Volunteers 頁面權限整合，訪客模式顯示無權限頁面 (evidence: src/pages/Volunteers.jsx)
- 2025-10-04: [#26] 完成了權限訪問測試，驗證訪客模式與未登入狀態的權限控制 (evidence: tests/permission-access-test.spec.js)
- 2025-10-04: [#2] 完成了後端權限中間件實作與 API 端點保護 (evidence: packages/backend/src/middlewares/AuthMiddleware.ts, packages/backend/src/routes/permissions.ts)
- 2025-10-04: [#10] 完成了權限系統基礎測試，包含訪客模式與未登入的權限檢查 (evidence: tests/permission-access-test.spec.js)
- 2025-10-04: [#27] 完成了公告匯出 CSV 功能修復，解決 priority 欄位缺失與 updated_date 欄位名稱錯誤問題 (evidence: packages/backend/src/lib/db-init.ts, packages/backend/src/routes/csv.ts, packages/backend/scripts/verify-priority-column.ts, packages/backend/scripts/test-announcements-export.ts)
- 2025-10-04: [#28] 完成了需求管理頁面垃圾桶視圖資料載入修復，解決切換到垃圾桶時資料未即時顯示的問題 (evidence: src/pages/Admin.jsx line 1471-1486)
- 2025-10-04: [#29] 完成了所有垃圾桶功能頁面的檢查與驗證，確認三個垃圾桶功能（需求管理、災區管理、公告管理）的實作狀態 (evidence: src/pages/Admin.jsx, src/components/admin/AnnouncementManagement.jsx)
- 2025-10-04: [#30] 完成了公告管理垃圾桶資料格式處理修復，統一處理 API 回傳的兩種資料格式（response?.data 和 response），確保垃圾桶切換時資料正確顯示 (evidence: src/components/admin/AnnouncementManagement.jsx line 86-99)

## Risks & Assumptions
- 2025-10-03: 假設現有 AuthContext 已正確實作基礎認證功能，只需擴充 role 管理
- 2025-10-03: 風險：權限中間件實作不當可能導致安全漏洞，需要嚴格測試
- 2025-10-03: 假設 PostgreSQL 資料庫架構允許擴充欄位而不影響現有功能
- 2025-10-03: 風險：CSV 匯入功能可能面臨資料驗證與錯誤處理挑戰
- 2025-10-04: 假設 role_permissions 表結構穩定，權限資料不會頻繁異動
- 2025-10-04: 風險：權限快取機制可能在權限變更時產生延遲更新問題
- 2025-10-04: 假設前端權限檢查主要用於 UI 控制，實際安全仍依賴後端驗證
- 2025-10-04: 風險：權限 API 錯誤處理不完善可能影響使用者體驗

## Notes
- 2025-10-03: [Info] 專案當前已實作志工報名多時段選擇功能（commit: f180ada）
- 2025-10-03: [Info] 目前使用 NLSC Taiwan tiles 作為地圖底圖（commit: a455902）
- 2025-10-03: [Reminder] 需要確認現有 users 表結構，避免與現有欄位衝突
- 2025-10-03: [Reminder] 實作權限系統前應先備份資料庫，確保可回滾
- 2025-10-04: [Info] 權限系統架構：5 層角色（guest → user → grid_manager → admin → super_admin）
- 2025-10-04: [Info] 權限資源類別：11 種（災區、網格、志工、物資、使用者、黑名單、公告、稽核日誌、系統設定、權限管理、報告）
- 2025-10-04: [Info] 權限動作：5 種（view, create, edit, delete, manage）
- 2025-10-04: [Info] 權限資料庫表：role_permissions (id, role, resource, can_view, can_create, can_edit, can_delete, can_manage)
- 2025-10-04: [Info] 權限檢查流程：前端 Hook/組件 → 後端 API middleware → 資料庫 role_permissions 表
- 2025-10-04: [Reminder] 新增功能頁面需套用 PermissionGate 或 usePermission 進行權限控制
- 2025-10-04: [Reminder] 敏感操作（刪除、權限變更）需記錄到稽核日誌
- 2025-10-04: [Tech] usePermission Hook 提供快取機制，避免重複 API 呼叫
- 2025-10-04: [Tech] PermissionButton 自動禁用無權限按鈕，提供一致的 UI 體驗
- 2025-10-04: [Tech] withPermission HOC 可包裝整個頁面元件進行權限保護
- 2025-10-04: [Tech] announcements 表 priority 欄位支援三種值：low, normal, high（預設 normal）
- 2025-10-04: [Bug-Fixed] 修復公告 CSV 匯出錯誤：新增 priority 欄位、修正 updated_at → updated_date 欄位名稱
- 2025-10-04: [Bug-Fixed] 修復需求管理垃圾桶視圖問題：垃圾桶按鈕 onClick 新增 getTrashGrids() 呼叫，確保切換時重新載入最新資料
- 2025-10-04: [Tech] 垃圾桶視圖資料載入邏輯：切換時主動呼叫 API 取得最新垃圾桶項目，避免僅依賴初次載入的資料
- 2025-10-04: [Verification] 完成垃圾桶功能檢查：需求管理（已修復）、災區管理（正常）、公告管理（已修復），統一採用「切換狀態 + 重新載入資料」模式
- 2025-10-04: [Bug-Fixed] 修復公告管理垃圾桶問題：loadTrashAnnouncements 函數未正確處理 API 回傳格式，新增資料格式檢查處理 response?.data 和 response 兩種格式
- 2025-10-04: [Tech] 垃圾桶資料處理統一模式：三個垃圾桶功能（需求管理、災區管理、公告管理）現在都使用一致的資料處理邏輯，確保資料格式正確處理
- 2025-10-04: [Tech] API 回傳格式相容性：處理兩種可能的回傳格式 {data: []} 或直接陣列 []，增強系統容錯性
