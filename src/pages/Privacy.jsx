import React from 'react';

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">隱私權與 Cookie 使用政策</h1>
      <p className="text-sm text-gray-500">最後更新：2025-10-02</p>

      <section className="space-y-3 text-gray-700 text-sm leading-relaxed">
        <p>本平台為災害救援對接用途，收集與處理資訊僅為促進人力與物資協調之必要。透過本平台提供或公開之資料請自行評估風險。</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">1. 我們收集的資訊</h2>
        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
          <li>志工報名資料：姓名、聯絡方式、可服務時間、技能/裝備（選填）</li>
          <li>物資捐贈資料：姓名、聯絡方式、物資品項、配送方式（選填）</li>
          <li>任務/網格資訊：位置、需求人力、需求物資、聯絡管道</li>
          <li>系統使用紀錄：可能包含匿名化之時間戳記與瀏覽行為（用於改善系統穩定性）</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">2. 資訊使用方式</h2>
        <p className="text-sm text-gray-700">我們將上述資訊用於：</p>
        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
          <li>協調災害現場人力與物資配置</li>
          <li>提供透明資訊供志工/需求方快速決策</li>
          <li>系統安全監控與效能改善</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">3. Cookie 與類似技術</h2>
        <p className="text-sm text-gray-700">我們可能使用以下類型 Cookie：</p>
        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
          <li>必要性 Cookie：維持登入狀態與功能操作（無法關閉）</li>
          <li>分析 Cookie：使用 Google Analytics 以了解使用情況（僅在您同意後載入）</li>
          <li>偏好 Cookie：記住您已同意聲明、不再重複顯示</li>
        </ul>
        <p className="text-xs text-gray-500 mt-1">您可清除瀏覽器 Cookie 以撤回同意；部分功能可能因此受限。</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">4. 第三方服務</h2>
        <p className="text-sm text-gray-700">若啟用分析 Cookie，我們會載入 Google Analytics。該服務可能蒐集匿名化使用統計。請參考 Google 的相關隱私政策。</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">5. 資料保留與刪除</h2>
        <p className="text-sm text-gray-700">公開於平台上的資訊為救援協調必要。若您希望更新或移除特定資料，可聯絡平台維運人員協助處理。</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">6. 資料安全</h2>
        <p className="text-sm text-gray-700">我們採基本技術措施（例如伺服器端存取控管）以降低未授權存取風險，但無法保證絕對安全。</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">7. 您的選擇</h2>
        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
          <li>可選擇不提供電話或使用暫時聯絡方式</li>
          <li>不勾選同意前不載入分析 Cookie</li>
          <li>清除 Cookie 以重置同意狀態</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">8. 聯絡我們</h2>
        <p className="text-sm text-gray-700">若您對本政策有疑問或資料處理需求，請透過平台公告提供的聯絡方式與我們聯繫。</p>
      </section>

      <div className="text-xs text-gray-400 pt-6 border-t">本政策可能隨實際運作調整更新，建議您定期檢視。</div>
    </div>
  );
}
