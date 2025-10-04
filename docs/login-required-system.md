# 登入檢查系統說明

## 概述

本系統實作了完善的登入檢查機制，確保訪客在執行受保護的操作時會被提示登入。這提供了更好的使用者體驗，並保護了需要身份驗證的功能。

## 核心概念

### 使用者狀態

系統中有兩種使用者狀態：

1. **訪客模式（Guest Mode）**
   - 未登入的使用者
   - 可以瀏覽公開資訊
   - 無法執行需要身份驗證的操作

2. **已登入使用者（Authenticated User）**
   - 透過 LINE 登入的使用者
   - 可以執行所有受保護的操作
   - 擁有個人資料和歷史記錄

### 受保護的操作

以下操作需要使用者登入才能執行：

1. **建立救援需求網格**（RequestHelp 頁面）
2. **報名志工**（GridDetailModal）
3. **捐贈物資**（GridDetailModal）
4. **發表留言討論**（GridDetailModal）

## 技術實作

### 1. 自定義 Hook：useRequireLogin

**檔案位置**：`src/hooks/useRequireLogin.js`

#### 功能說明

提供一個可重複使用的 Hook，用於檢查使用者登入狀態並管理登入對話框。

#### 參數

- `action` (string): 操作描述，例如「建立救援需求」、「報名志工」
  - 預設值：`"執行此操作"`

#### 回傳值

回傳一個物件，包含以下屬性：

```javascript
{
  requireLogin: Function,      // 檢查登入狀態的函數
  showLoginDialog: boolean,    // 登入對話框顯示狀態
  setShowLoginDialog: Function, // 設定對話框狀態的函數
  action: string               // 操作描述
}
```

#### 使用範例

```javascript
import { useRequireLogin } from '@/hooks/useRequireLogin';

function MyComponent() {
  const volunteerLogin = useRequireLogin("報名志工");

  const handleSubmit = () => {
    // 檢查登入狀態
    if (!volunteerLogin.requireLogin(() => {
      // 已登入時執行的回調函數
      console.log("使用者已登入，繼續執行");
    })) {
      // 未登入，會自動顯示登入對話框
      return;
    }
  };

  return (
    <>
      <button onClick={handleSubmit}>報名</button>

      <LoginRequiredDialog
        open={volunteerLogin.showLoginDialog}
        onOpenChange={volunteerLogin.setShowLoginDialog}
        action={volunteerLogin.action}
      />
    </>
  );
}
```

#### 核心邏輯

```javascript
const requireLogin = useCallback((callback) => {
  // 檢查是否為訪客模式或未登入
  if (!user || guestMode) {
    setShowLoginDialog(true);
    return false;
  }

  // 已登入，執行回調
  if (callback && typeof callback === 'function') {
    callback();
  }
  return true;
}, [user, guestMode]);
```

### 2. 登入請求對話框：LoginRequiredDialog

**檔案位置**：`src/components/common/LoginRequiredDialog.jsx`

#### 功能說明

顯示一個友善的對話框，提示訪客登入以使用特定功能。

#### Props

- `open` (boolean): 對話框是否顯示
- `onOpenChange` (Function): 對話框狀態改變時的回調
- `action` (string): 要執行的操作描述
  - 預設值：`"執行此操作"`

#### UI 特色

- 清楚說明為何需要登入
- 列出登入後的好處：
  - 建立救災需求網格
  - 報名成為志工
  - 捐贈物資
  - 查看活動記錄
- 提供「取消」和「前往登入」兩個選項

#### 登入流程

點擊「前往登入」後，會導向 LINE 登入頁面：

```javascript
const handleLogin = () => {
  window.location.href = '/api/auth/line/login';
};
```

### 3. 整合範例

#### 範例一：建立救援需求（RequestHelp.jsx）

```javascript
import { useRequireLogin } from '@/hooks/useRequireLogin';
import LoginRequiredDialog from '@/components/common/LoginRequiredDialog';

export default function RequestHelpPage() {
  const [showModal, setShowModal] = useState(false);
  const createGridLogin = useRequireLogin("建立救援需求");

  return (
    <>
      <Button
        onClick={() => {
          // 檢查登入狀態
          if (createGridLogin.requireLogin(() => setShowModal(true))) {
            // 已登入，開啟建立網格的彈窗
            return;
          }
          // 未登入，會自動顯示登入對話框
        }}
      >
        立即申請人力支援
      </Button>

      {/* 登入請求對話框 */}
      <LoginRequiredDialog
        open={createGridLogin.showLoginDialog}
        onOpenChange={createGridLogin.setShowLoginDialog}
        action={createGridLogin.action}
      />
    </>
  );
}
```

#### 範例二：報名志工（GridDetailModal.jsx）

```javascript
export default function GridDetailModal({ grid }) {
  const volunteerLogin = useRequireLogin("報名志工");
  const supplyLogin = useRequireLogin("捐贈物資");
  const discussionLogin = useRequireLogin("發表留言");

  const handleVolunteerSubmit = async (e) => {
    e.preventDefault();

    // 檢查登入
    if (!volunteerLogin.requireLogin()) {
      return;
    }

    // 已登入，執行報名邏輯
    await VolunteerRegistration.create({
      grid_id: grid.id,
      // ...其他資料
    });
  };

  return (
    <>
      {/* 志工報名表單 */}
      <form onSubmit={handleVolunteerSubmit}>
        <button type="submit">送出報名</button>
      </form>

      {/* 三個登入對話框 */}
      <LoginRequiredDialog
        open={volunteerLogin.showLoginDialog}
        onOpenChange={volunteerLogin.setShowLoginDialog}
        action={volunteerLogin.action}
      />
      <LoginRequiredDialog
        open={supplyLogin.showLoginDialog}
        onOpenChange={supplyLogin.setShowLoginDialog}
        action={supplyLogin.action}
      />
      <LoginRequiredDialog
        open={discussionLogin.showLoginDialog}
        onOpenChange={discussionLogin.setShowLoginDialog}
        action={discussionLogin.action}
      />
    </>
  );
}
```

## 使用者體驗流程

### 訪客嘗試執行受保護操作

1. **訪客點擊「立即申請人力支援」**
   - 系統檢測到未登入狀態
   - 自動顯示登入請求對話框

2. **對話框顯示**
   - 標題：「需要登入」
   - 說明：「您需要登入才能建立救援需求」
   - 列出登入後的好處

3. **訪客選擇**
   - **選擇「取消」**：關閉對話框，返回原頁面
   - **選擇「前往登入」**：導向 LINE 登入頁面

4. **登入後**
   - 使用者完成 LINE 登入
   - 系統自動返回原頁面
   - 可以正常執行受保護的操作

### 已登入使用者

1. **已登入使用者點擊受保護操作**
   - 系統檢測到已登入
   - 不顯示對話框
   - 直接執行操作

## 實作位置總覽

### 核心元件

| 檔案 | 說明 |
|------|------|
| `src/hooks/useRequireLogin.js` | 登入檢查自定義 Hook |
| `src/components/common/LoginRequiredDialog.jsx` | 登入請求對話框元件 |

### 整合位置

| 檔案 | 受保護操作 |
|------|-----------|
| `src/pages/RequestHelp.jsx` | 建立救援需求網格 |
| `src/components/map/GridDetailModal.jsx` | 報名志工、捐贈物資、發表留言 |

## 設計原則

### 1. 使用者友善

- 清楚說明為何需要登入
- 提供明確的行動選項
- 避免突兀的中斷體驗

### 2. 可重複使用

- `useRequireLogin` Hook 可用於任何需要登入檢查的場景
- `LoginRequiredDialog` 元件可配置不同的操作描述
- 一致的整合模式

### 3. 安全性

- 前端檢查提供良好的使用者體驗
- 後端 API 同樣會驗證使用者身份
- 雙重保護機制

## 新增受保護操作

如果需要為新功能加入登入檢查，請遵循以下步驟：

### 步驟一：匯入必要模組

```javascript
import { useRequireLogin } from '@/hooks/useRequireLogin';
import LoginRequiredDialog from '@/components/common/LoginRequiredDialog';
```

### 步驟二：建立登入檢查實例

```javascript
const myFeatureLogin = useRequireLogin("您的操作描述");
```

### 步驟三：在操作處加入檢查

```javascript
const handleMyAction = () => {
  if (!myFeatureLogin.requireLogin(() => {
    // 已登入時執行的邏輯
    console.log("執行操作");
  })) {
    return;
  }
};
```

### 步驟四：加入對話框元件

```javascript
<LoginRequiredDialog
  open={myFeatureLogin.showLoginDialog}
  onOpenChange={myFeatureLogin.setShowLoginDialog}
  action={myFeatureLogin.action}
/>
```

## 測試檢查清單

- [ ] 訪客點擊受保護操作時顯示登入對話框
- [ ] 已登入使用者可以直接執行操作
- [ ] 對話框顯示正確的操作描述
- [ ] 點擊「取消」可以關閉對話框
- [ ] 點擊「前往登入」導向正確的登入頁面
- [ ] 登入後可以正常執行操作
- [ ] 多個對話框可以同時存在且互不干擾

## 常見問題

### Q: 為什麼需要前端登入檢查？

A: 前端檢查提供更好的使用者體驗，避免使用者填寫完整表單後才發現需要登入。後端 API 仍會進行身份驗證，確保安全性。

### Q: 如何自訂對話框的訊息？

A: 透過 `useRequireLogin` 的參數傳入操作描述：

```javascript
const myLogin = useRequireLogin("您的自訂操作");
```

### Q: 可以在同一個元件使用多個登入檢查嗎？

A: 可以！每個受保護操作都應該有自己的登入檢查實例，如 `GridDetailModal.jsx` 的範例所示。

### Q: 登入後會回到原本的頁面嗎？

A: 是的，LINE 登入完成後會返回原頁面，使用者可以繼續執行操作。

## 未來擴展建議

1. **記住使用者意圖**
   - 登入後自動執行原本要做的操作
   - 例如：登入後自動開啟建立網格的彈窗

2. **更細緻的提示**
   - 根據不同操作顯示不同的登入好處
   - 提供更多情境化的說明

3. **社交登入選項**
   - 除了 LINE，增加其他登入方式
   - Google、Facebook 等選項

4. **訪客模式提示**
   - 在頁面上預先顯示哪些功能需要登入
   - 鼓勵訪客主動登入
