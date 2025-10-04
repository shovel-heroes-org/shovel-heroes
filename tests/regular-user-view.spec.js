import { test, expect } from '@playwright/test';

test('一般用戶視角查看網格管理', async ({ page }) => {
  // 前往首頁
  await page.goto('http://localhost:5173');

  // 等待頁面載入
  await page.waitForTimeout(2000);

  // 截圖：首頁
  await page.screenshot({ path: 'screenshots/01-homepage.png', fullPage: true });

  // 查找並點擊「管理後台」連結
  const adminLink = page.locator('a:has-text("管理後台")');
  if (await adminLink.count() > 0) {
    await adminLink.click();
    await page.waitForTimeout(2000);

    // 截圖：管理後台頁面
    await page.screenshot({ path: 'screenshots/02-admin-page.png', fullPage: true });

    // 打開 Console 並記錄
    page.on('console', msg => {
      if (msg.text().includes('DEBUG')) {
        console.log('瀏覽器 Console:', msg.text());
      }
    });

    // 等待並截圖網格管理區域
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/03-grid-management.png', fullPage: true });

    // 檢查是否有「需求管理」標題
    const gridSection = page.locator('text=需求管理').first();
    if (await gridSection.count() > 0) {
      console.log('✓ 找到「需求管理」區域');
    }

    // 檢查網格卡片數量
    const gridCards = page.locator('[class*="grid"][class*="card"], .border.rounded');
    const cardCount = await gridCards.count();
    console.log(`網格卡片數量: ${cardCount}`);

    // 檢查網格類型按鈕的數字
    const allButton = page.locator('button:has-text("全部")').first();
    if (await allButton.count() > 0) {
      const buttonText = await allButton.textContent();
      console.log('「全部」按鈕文字:', buttonText);
    }

  } else {
    console.log('❌ 未找到「管理後台」連結');
    await page.screenshot({ path: 'screenshots/no-admin-link.png', fullPage: true });
  }
});
