const { test, expect, _electron: electron } = require('@playwright/test');
const path = require('path');

test.describe('Telesurf Regression Tests', () => {
  test('Regression (Bug #1): App does not crash with "Object has been destroyed" when window is closed during navigation', async () => {
    // Launch a fresh Electron instance
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '..', 'main.js')]
    });
    const window = await electronApp.firstWindow();

    // Trigger a navigation
    const addressBar = window.locator('#url-input');
    await expect(addressBar).toBeVisible();
    await addressBar.fill('https://example.com');
    await addressBar.press('Enter');

    // IMMEDIATELY close the window while the WebContentsView is still loading the page
    // Prior to the fix, the background tab would finish loading, attempt to send 'url-updated' 
    // to the destroyed window, and crash the entire main process.
    await window.close();

    // Wait for 1 second to allow any lingering async IPC messages to fire
    await new Promise(resolve => setTimeout(resolve, 1000));

    // If the main process crashed, evaluating anything on it will fail.
    // We check if we can still communicate with the main process.
    const isAlive = await electronApp.evaluate(() => {
      return true;
    });

    expect(isAlive).toBe(true);

    await electronApp.close();
  });

  test('Regression (Bug #2): App does not crash when opening and closing multiple tabs rapidly', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '..', 'main.js')]
    });
    const window = await electronApp.firstWindow();

    // Rapidly open 5 tabs
    for (let i = 0; i < 5; i++) {
      await window.keyboard.press('Meta+t'); // or Control+T depending on OS
    }

    // Rapidly close them
    for (let i = 0; i < 5; i++) {
      await window.keyboard.press('Meta+w');
    }

    // Ensure the app is still responsive
    const isAlive = await electronApp.evaluate(() => true);
    expect(isAlive).toBe(true);

    await electronApp.close();
  });
});
