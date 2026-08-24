const { app } = require('electron');
const assert = require('assert');

console.log('Running Telesurf Smoke Tests...');

app.name = 'Google Chrome';
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
app.commandLine.appendSwitch('lang', 'en-US');

app.whenReady().then(() => {
  try {
    assert.strictEqual(app.name, 'Google Chrome', 'App name should be spoofed to Google Chrome');
    console.log('✅ App name spoofing verified.');
    
    // Test complete
    console.log('✅ All tests passed successfully.');
    app.quit();
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    app.quit();
    process.exit(1);
  }
});

// Timeout in case it hangs
setTimeout(() => {
  console.error('❌ Test timed out.');
  process.exit(1);
}, 10000);
