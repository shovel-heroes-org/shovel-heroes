# 貢獻指南（Contributing Guide）

感謝你願意協助「鏟子英雄」！以下流程能確保大家在救災期間快速、穩定且安全地協作。

## 快速開始
- 需要環境：Node.js **18+**（LTS）
- 安裝：`npm install`
- 開發：`npm run dev`
- 建置：`npm run build`
> 以上命令與 Vite + React 腳手架一致，與倉庫 README 相符。

## 分支與提交流程
1. 從 `main` 切出功能分支：`feat/xxx`、`fix/yyy`、`docs/zzz`
2. **提交訊息：採用 Conventional Commits**
   - `feat: 新增任務清單檢視`
   - `fix: 修正地圖 marker 點擊崩潰`
   - `chore(docs): 新增 SECURITY.md`
3. 每個 PR 盡量聚焦單一目的；如僅更新 `package.json`，請與功能變更分開 PR（回應 PR #1 的維護者建議）。

## 程式碼風格與品質
- Lint：本專案已含 `eslint.config.js`，請在提交前執行 `npm run lint`。
- 型別／錯誤處理：建立 `Result` 風格回傳或一致的錯誤邏輯，避免在 UI 泄漏內部錯誤細節。
- UI：Tailwind CSS 已配置，請沿用既有樣式系統與設計 Token。

## 安全與隱私要求（與 SECURITY.md 對齊）
- 新增表單或 API 呼叫：務必加入**輸入驗證**、**錯誤訊息最小化**、**前端人機驗證（視風險）**。
- 涉及建立／修改動作的 API：請加入**伺服端率限制**，並支援 `Idempotency-Key`。
- 不得在程式碼提交任何金鑰或個資；提供 `.env.example` 指引環境變數。

## PR 檢核清單（Review Checklist）
- [ ] 有對應 Issue 或清楚描述
- [ ] 有測試或可手動驗收步驟
- [ ] 通過 Lint/Build
- [ ] 不引入敏感資訊、金鑰或多餘權限
- [ ] 對文件（README/CLAUDE.md/SECURITY.md/OpenAPI）同步更新

## Issue 回報格式建議
- 現象／重現步驟／預期與實際行為／螢幕截圖或日誌節錄（若含個資，請遮罩處理）／可能影響範圍

## 行為準則
我們採用 Contributor Covenant 原則：尊重、安全、包容、聚焦任務。
