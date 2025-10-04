// @ts-check
const { test, expect } = require('@playwright/test');

// 測試配置
const BASE_URL = 'http://localhost:5173';
const API_BASE = 'http://localhost:8787';

// 模擬管理員和一般用戶的 Token
const ADMIN_TOKEN = 'mock-admin-token';
const USER_TOKEN = 'mock-user-token';

test.describe('權限管理系統測試', () => {
  test.beforeEach(async ({ page }) => {
    // 訪問首頁
    await page.goto(BASE_URL);
  });

  test('訪客無法看到管理後台選單', async ({ page }) => {
    // 檢查導航列沒有管理後台連結
    await expect(page.locator('nav a:has-text("管理後台")')).toBeHidden();

    // 直接訪問管理後台應該被拒絕或重導向
    await page.goto(`${BASE_URL}/admin`);

    // 截圖記錄
    await page.screenshot({
      path: `screenshots/${new Date().toISOString().slice(0,10)}/visitor-no-admin-access.png`,
      fullPage: true
    });
  });

  test('管理員可以看到所有管理功能', async ({ page }) => {
    // 模擬管理員登入
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({
        id: 'admin-001',
        name: '系統管理員',
        email: 'admin@example.com',
        role: 'admin'
      }));
    }, ADMIN_TOKEN);

    // 重新載入頁面
    await page.reload();

    // 檢查管理後台選單出現
    const adminLink = page.locator('nav a:has-text("管理後台")');
    await expect(adminLink).toBeVisible();

    // 點擊進入管理後台
    await adminLink.click();

    // 等待管理頁面載入
    await page.waitForURL(/\/admin/);

    // 檢查所有管理功能頁籤
    await expect(page.locator('button:has-text("災區管理")')).toBeVisible();
    await expect(page.locator('button:has-text("需求管理")')).toBeVisible();
    await expect(page.locator('button:has-text("志工管理")')).toBeVisible();
    await expect(page.locator('button:has-text("物資管理")')).toBeVisible();
    await expect(page.locator('button:has-text("用戶管理")')).toBeVisible();

    // 截圖記錄管理後台
    await page.screenshot({
      path: `screenshots/${new Date().toISOString().slice(0,10)}/admin-dashboard.png`,
      fullPage: true
    });
  });

  test('管理員可以管理用戶權限', async ({ page }) => {
    // 模擬管理員登入
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({
        id: 'admin-001',
        name: '系統管理員',
        email: 'admin@example.com',
        role: 'admin'
      }));
      localStorage.setItem('sh-acting-role', 'admin');
    }, ADMIN_TOKEN);

    // 進入管理後台
    await page.goto(`${BASE_URL}/admin`);

    // 點擊用戶管理頁籤
    await page.click('button:has-text("用戶管理")');

    // 等待用戶列表載入
    await page.waitForSelector('.text-lg.text-gray-900', { timeout: 5000 });

    // 檢查用戶角色選擇器存在
    const roleSelector = page.locator('select').first();
    await expect(roleSelector).toBeVisible();

    // 截圖用戶管理頁面
    await page.screenshot({
      path: `screenshots/${new Date().toISOString().slice(0,10)}/user-management.png`,
      fullPage: true
    });
  });

  test('管理員可以使用垃圾桶功能', async ({ page }) => {
    // 模擬管理員登入
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({
        id: 'admin-001',
        name: '系統管理員',
        email: 'admin@example.com',
        role: 'admin'
      }));
      localStorage.setItem('sh-acting-role', 'admin');
    }, ADMIN_TOKEN);

    // 進入管理後台
    await page.goto(`${BASE_URL}/admin`);

    // 點擊需求管理頁籤
    await page.click('button:has-text("需求管理")');

    // 檢查垃圾桶按鈕存在
    const trashButton = page.locator('button:has-text("垃圾桶")');
    await expect(trashButton).toBeVisible();

    // 檢查批量操作按鈕（需要先選擇網格）
    const checkboxes = page.locator('input[type="checkbox"]');

    if (await checkboxes.count() > 0) {
      // 選擇第一個網格
      await checkboxes.first().check();

      // 檢查批量刪除按鈕出現
      const batchDeleteButton = page.locator('button:has-text("批量刪除")');
      await expect(batchDeleteButton).toBeVisible();

      // 截圖批量操作
      await page.screenshot({
        path: `screenshots/${new Date().toISOString().slice(0,10)}/batch-operations.png`,
        fullPage: true
      });
    }

    // 點擊垃圾桶視圖
    await trashButton.click();

    // 等待垃圾桶視圖載入
    await page.waitForTimeout(1000);

    // 截圖垃圾桶視圖
    await page.screenshot({
      path: `screenshots/${new Date().toISOString().slice(0,10)}/trash-view.png`,
      fullPage: true
    });
  });

  test('一般用戶無法看到管理功能', async ({ page }) => {
    // 模擬一般用戶登入
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({
        id: 'user-001',
        name: '一般用戶',
        email: 'user@example.com',
        role: 'user'
      }));
    }, USER_TOKEN);

    // 重新載入頁面
    await page.reload();

    // 檢查沒有管理後台連結（或有但點擊後無法進入）
    const adminLink = page.locator('nav a:has-text("管理後台")');

    if (await adminLink.isVisible()) {
      // 點擊管理後台
      await adminLink.click();
      await page.waitForTimeout(1000);

      // 檢查沒有用戶管理頁籤
      await expect(page.locator('button:has-text("用戶管理")')).toBeHidden();

      // 檢查沒有批量操作功能
      await expect(page.locator('button:has-text("批量刪除")')).toBeHidden();

      // 檢查沒有垃圾桶按鈕
      await expect(page.locator('button:has-text("垃圾桶")')).toBeHidden();
    }

    // 截圖一般用戶視圖
    await page.screenshot({
      path: `screenshots/${new Date().toISOString().slice(0,10)}/user-limited-access.png`,
      fullPage: true
    });
  });

  test('CSV 匯入匯出功能（僅管理員）', async ({ page }) => {
    // 模擬管理員登入
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({
        id: 'admin-001',
        name: '系統管理員',
        email: 'admin@example.com',
        role: 'admin'
      }));
      localStorage.setItem('sh-acting-role', 'admin');
    }, ADMIN_TOKEN);

    // 進入管理後台
    await page.goto(`${BASE_URL}/admin`);

    // 點擊需求管理頁籤
    await page.click('button:has-text("需求管理")');

    // 檢查 CSV 功能按鈕
    const csvButtons = page.locator('button').filter({ hasText: /匯出|匯入|CSV/i });

    // 至少應該有匯出和匯入按鈕
    const csvButtonCount = await csvButtons.count();
    expect(csvButtonCount).toBeGreaterThan(0);

    // 截圖 CSV 功能
    await page.screenshot({
      path: `screenshots/${new Date().toISOString().slice(0,10)}/csv-functions.png`,
      fullPage: true
    });
  });

  test('響應式設計檢查 - 手機視圖', async ({ page }) => {
    // 設定手機視口
    await page.setViewportSize({ width: 375, height: 667 });

    // 模擬管理員登入
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({
        id: 'admin-001',
        name: '系統管理員',
        email: 'admin@example.com',
        role: 'admin'
      }));
    }, ADMIN_TOKEN);

    // 重新載入頁面
    await page.reload();

    // 檢查漢堡選單出現
    const menuButton = page.locator('button:has(svg)').filter({ hasText: '' }).first();
    await expect(menuButton).toBeVisible();

    // 點擊漢堡選單
    await menuButton.click();

    // 等待選單展開
    await page.waitForTimeout(500);

    // 檢查管理後台連結在移動選單中
    await expect(page.locator('a:has-text("管理後台")')).toBeVisible();

    // 截圖手機視圖
    await page.screenshot({
      path: `screenshots/${new Date().toISOString().slice(0,10)}/mobile-admin-menu.png`,
      fullPage: true
    });
  });

  test('權限切換功能測試', async ({ page }) => {
    // 模擬管理員登入
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({
        id: 'admin-001',
        name: '系統管理員',
        email: 'admin@example.com',
        role: 'admin'
      }));
      localStorage.setItem('sh-acting-role', 'admin');
    }, ADMIN_TOKEN);

    // 進入首頁
    await page.goto(BASE_URL);

    // 檢查用戶頭像按鈕（管理員模式應該有粉紅色光環）
    const avatarButton = page.locator('button').filter({ has: page.locator('.bg-pink-300\\/30') });

    if (await avatarButton.isVisible()) {
      // 點擊頭像打開下拉選單
      await avatarButton.click();

      // 檢查權限切換按鈕
      const roleToggle = page.locator('button:has-text("視角")');

      if (await roleToggle.isVisible()) {
        // 截圖管理員模式
        await page.screenshot({
          path: `screenshots/${new Date().toISOString().slice(0,10)}/admin-mode-active.png`
        });

        // 切換到一般用戶視角
        await roleToggle.click();
        await page.waitForTimeout(500);

        // 截圖一般用戶視角
        await page.screenshot({
          path: `screenshots/${new Date().toISOString().slice(0,10)}/user-mode-active.png`
        });
      }
    }
  });
});

// 效能測試
test.describe('效能測試', () => {
  test('管理後台載入時間', async ({ page }) => {
    // 模擬管理員登入
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({
        id: 'admin-001',
        name: '系統管理員',
        email: 'admin@example.com',
        role: 'admin'
      }));
    }, ADMIN_TOKEN);

    // 測量載入時間
    const startTime = Date.now();
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForSelector('h1:has-text("管理後台")', { timeout: 10000 });
    const loadTime = Date.now() - startTime;

    // 檢查載入時間應小於 3 秒
    expect(loadTime).toBeLessThan(3000);
    console.log(`管理後台載入時間: ${loadTime}ms`);
  });

  test('批量操作效能', async ({ page }) => {
    // 模擬管理員登入
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({
        id: 'admin-001',
        name: '系統管理員',
        email: 'admin@example.com',
        role: 'admin'
      }));
      localStorage.setItem('sh-acting-role', 'admin');
    }, ADMIN_TOKEN);

    // 進入管理後台
    await page.goto(`${BASE_URL}/admin`);

    // 點擊需求管理
    await page.click('button:has-text("需求管理")');

    // 測量全選操作時間
    const selectButton = page.locator('button:has-text("全選")');

    if (await selectButton.isVisible()) {
      const startTime = Date.now();
      await selectButton.click();
      await page.waitForTimeout(100); // 等待 UI 更新
      const selectTime = Date.now() - startTime;

      // 全選操作應小於 500ms
      expect(selectTime).toBeLessThan(500);
      console.log(`全選操作時間: ${selectTime}ms`);
    }
  });
});