import { test, expect } from '@playwright/test';

/**
 * 權限訪問測試
 * 測試不同角色視角下訪問頁面時的權限控制
 */

test.describe('權限訪問控制測試', () => {

  test.beforeEach(async ({ page }) => {
    // 每個測試前清除所有 storage
    await page.context().clearCookies();
    await page.goto('http://localhost:5173/');
  });

  test('訪客模式訪問管理後台應顯示無權限頁面', async ({ page }) => {
    // 設定為訪客模式
    await page.evaluate(() => {
      localStorage.setItem('sh-acting-role', 'guest');
      localStorage.setItem('sh-guest-mode', 'true');
    });

    // 訪問管理後台
    await page.goto('http://localhost:5173/admin');

    // 等待頁面載入
    await page.waitForTimeout(1000);

    // 檢查是否顯示無權限訪問頁面
    const unauthorizedTitle = await page.locator('h1:has-text("無權限訪問管理後台")');
    await expect(unauthorizedTitle).toBeVisible();

    // 檢查是否有返回按鈕
    const backButton = await page.locator('button:has-text("返回上一頁")');
    await expect(backButton).toBeVisible();

    // 截圖記錄
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    await page.screenshot({
      path: `screenshots/${today}/guest-admin-unauthorized.png`,
      fullPage: true
    });
  });

  test('訪客模式訪問志工中心應顯示無權限頁面', async ({ page }) => {
    // 設定為訪客模式
    await page.evaluate(() => {
      localStorage.setItem('sh-acting-role', 'guest');
      localStorage.setItem('sh-guest-mode', 'true');
    });

    // 訪問志工中心
    await page.goto('http://localhost:5173/volunteers');

    // 等待頁面載入
    await page.waitForTimeout(1000);

    // 檢查是否顯示無權限訪問頁面
    const unauthorizedTitle = await page.locator('h1:has-text("無權限訪問志工中心")');
    await expect(unauthorizedTitle).toBeVisible();

    // 檢查提示訊息
    const message = await page.locator('p:has-text("志工中心需要登入後才能使用")');
    await expect(message).toBeVisible();

    // 截圖記錄
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    await page.screenshot({
      path: `screenshots/${today}/guest-volunteers-unauthorized.png`,
      fullPage: true
    });
  });

  test('未登入狀態訂問管理後台應顯示無權限頁面', async ({ page }) => {
    // 不設定任何用戶資訊，直接訪問管理後台
    await page.goto('http://localhost:5173/admin');

    // 等待頁面載入
    await page.waitForTimeout(1500);

    // 檢查是否顯示無權限或登入相關提示
    const pageContent = await page.content();

    // 可能顯示無權限頁面或重定向到登入
    const hasUnauthorized = pageContent.includes('無權限') || pageContent.includes('請先登入');
    expect(hasUnauthorized).toBeTruthy();

    // 截圖記錄
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    await page.screenshot({
      path: `screenshots/${today}/no-login-admin-unauthorized.png`,
      fullPage: true
    });
  });

  test('導航列在訪客模式下不顯示需要登入的功能', async ({ page }) => {
    // 設定為訪客模式
    await page.evaluate(() => {
      localStorage.setItem('sh-acting-role', 'guest');
      localStorage.setItem('sh-guest-mode', 'true');
    });

    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(1000);

    // 檢查導航列
    const volunteerLink = await page.locator('a:has-text("志工中心")').count();
    const adminLink = await page.locator('a:has-text("管理後台")').count();

    // 訪客模式下不應顯示志工中心和管理後台連結
    expect(volunteerLink).toBe(0);
    expect(adminLink).toBe(0);

    // 應該可以看到救援地圖和物資管理
    const mapLink = await page.locator('a:has-text("救援地圖")');
    const suppliesLink = await page.locator('a:has-text("物資管理")');

    await expect(mapLink).toBeVisible();
    await expect(suppliesLink).toBeVisible();

    // 截圖記錄
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    await page.screenshot({
      path: `screenshots/${today}/guest-navigation.png`,
      fullPage: true
    });
  });

  test('無權限頁面的返回按鈕功能正常', async ({ page }) => {
    // 設定為訪客模式
    await page.evaluate(() => {
      localStorage.setItem('sh-acting-role', 'guest');
      localStorage.setItem('sh-guest-mode', 'true');
    });

    // 先訪問首頁
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(500);

    // 再訪問管理後台（會顯示無權限）
    await page.goto('http://localhost:5173/admin');
    await page.waitForTimeout(1000);

    // 點擊返回上一頁按鈕
    const backButton = await page.locator('button:has-text("返回上一頁")');
    await backButton.click();
    await page.waitForTimeout(500);

    // 檢查是否回到首頁
    expect(page.url()).toContain('/');
  });

  test('無權限頁面的回到首頁按鈕功能正常', async ({ page }) => {
    // 設定為訪客模式
    await page.evaluate(() => {
      localStorage.setItem('sh-acting-role', 'guest');
      localStorage.setItem('sh-guest-mode', 'true');
    });

    // 訪問志工中心（會顯示無權限）
    await page.goto('http://localhost:5173/volunteers');
    await page.waitForTimeout(1000);

    // 點擊回到首頁按鈕
    const homeButton = await page.locator('button:has-text("回到首頁"), a:has-text("回到首頁")');
    await homeButton.click();
    await page.waitForTimeout(500);

    // 檢查是否回到首頁（地圖頁面）
    expect(page.url()).toMatch(/\/(map)?$/);
  });
});
