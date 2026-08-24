// view-preload.js
// This script runs in the actual web pages to spoof browser APIs

// Hide navigator.webdriver
Object.defineProperty(navigator, 'webdriver', {
  get: () => false,
});

// Fake Chrome runtime
window.chrome = {
  runtime: {}
};

// Fake plugins to look like a real browser
Object.defineProperty(navigator, 'plugins', {
  get: () => [1, 2, 3],
});

Object.defineProperty(navigator, 'languages', {
  get: () => ['en-US', 'en'],
});
