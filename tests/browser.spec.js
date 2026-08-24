const { test, expect, _electron: electron } = require('@playwright/test');
const path = require('path');

test.describe('Telesurf Browser E2E Tests', () => {
  let electronApp;
  let window;

  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [path.join(__dirname, '..', 'main.js')]
    });
    window = await electronApp.firstWindow();
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test('App boots with correct spoofed name and stealth flags', async () => {
    const appName = await electronApp.evaluate(async ({ app }) => {
      return app.name;
    });
    expect(appName).toBe('Google Chrome');
    
    // Check if AutomationControlled is disabled
    const commandLine = await electronApp.evaluate(async ({ app }) => {
      return app.commandLine.hasSwitch('disable-blink-features');
    });
    expect(commandLine).toBe(true);
  });

  test('UI Shell renders correctly', async () => {
    const title = await window.title();
    expect(title).toBe('Telesurf Shell');

    // Check address bar exists
    const addressBar = window.locator('#url-input');
    await expect(addressBar).toBeVisible();

    // Check navigation buttons exist
    await expect(window.locator('#back-btn')).toBeVisible();
    await expect(window.locator('#forward-btn')).toBeVisible();
    await expect(window.locator('#refresh-btn')).toBeVisible();
    await expect(window.locator('#home-btn')).toBeVisible();
  });
});
