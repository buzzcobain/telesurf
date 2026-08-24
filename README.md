# Telesurf

**Telesurf** is a retro-styled, Teletext-inspired desktop web browser built on Electron. 
It seamlessly injects a high-contrast, structural Text User Interface (TUI) theme into *every* website you visit on the fly, while perfectly preserving modern layout geometries and keeping images visible.

It looks like the 80s, but it browses like today.

## Features

- **Global TUI Injection**: Aggressively overrides standard web styling to force a monospace, Dracula-inspired high contrast color scheme.
- **Structural Borders**: Automatically wraps `div`, `section`, `main` and other semantic tags in retro containment boxes.
- **Modern Engine**: Built on Electron 32 (Chromium 128) for 100% web compatibility.
- **Stealth Mode**: Leverages clean User-Agent resolution and native C++ `AutomationControlled` flags to easily bypass strict CDN bot protections (Akamai, Cloudflare) that usually block Electron apps.
- **DuckDuckGo Fallback**: Address bar acts as a hybrid URL/Search bar.
- **Keyboard Navigation**:
  - `Cmd/Ctrl + T`: New Tab
  - `Cmd/Ctrl + W`: Close Tab
  - `Cmd/Ctrl + L`: Focus Address Bar
  - `Cmd/Ctrl + R`: Refresh
  - `Cmd/Ctrl + N`: New Window

## Installation

```bash
git clone https://github.com/yourusername/telesurf-browser.git
cd telesurf-browser
npm install
npm start
```

*(Note: Requires Node.js >= 22.12.0 for Electron 32 compatibility)*

## License
MIT
