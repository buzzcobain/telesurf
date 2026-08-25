# Telesurf Browser 🏄‍♂️📟

Hey there! I thought it would be a fun project to see if I could force the entire modern internet to look like it was built in 1989, without actually breaking how any of it works. 

Welcome to **Telesurf**. 

I've always loved the aesthetic of old Unix terminals, BBC Ceefax, and French Minitel systems—that chunky, high-contrast, text-heavy vibe where everything is neatly boxed and glowing in phosphor green. I wanted to browse the web like that, but I still needed things like Javascript, Flexbox grids, and images to actually load so the sites were usable. 

So, I built this custom browser using Electron. It basically acts like a modern Chromium browser under the hood, but it aggressively injects a universal Text User Interface (TUI) theme into *every single website* you visit on the fly. 

It strips away fancy backgrounds and rounded corners, forces a universal monospace font, and draws structural ASCII-style borders around every `div`, `section`, and `article` to give it that true structural terminal feel.

### The Stealth Anti-Bot Tech
One thing I discovered building this: if you build a custom browser, military-grade CDNs like Akamai and Cloudflare immediately assume you are a bot and block you from visiting sites like Sky News or Ticketmaster. 

To fix this, I had to bake in some serious stealth tech. Telesurf uses the absolute newest version of Chromium (v128) via Electron 32, dynamically strips all "Electron" footprints out of the User-Agent to ensure the TLS network signatures perfectly match a standard Google Chrome install, and uses native C++ `AutomationControlled` flags to hide the fact that it's a wrapper. It effortlessly browses 100% of the web.

## Features

- **Global TUI Injection**: Aggressively overrides standard web styling to force a monospace, Dracula-inspired high contrast color scheme.
- **Structural Borders**: Automatically wraps `div`, `section`, `main` and other semantic tags in retro containment boxes.
- **Modern Engine**: Built on Electron 32 (Chromium 128) for 100% web compatibility.
- **Stealth Mode**: Leverages clean User-Agent resolution and native C++ `AutomationControlled` flags to easily bypass strict CDN bot protections.
- **DuckDuckGo Fallback**: Address bar acts as a hybrid URL/Search bar.
- **Keyboard Navigation**:
  - `Cmd/Ctrl + T`: New Tab
  - `Cmd/Ctrl + W`: Close Tab
  - `Cmd/Ctrl + L`: Focus Address Bar
  - `Cmd/Ctrl + R`: Refresh
  - `Cmd/Ctrl + N`: New Window

## Try it out

Make sure you have a very recent version of Node installed (Node 22+).

```bash
git clone https://github.com/buzzcobain/telesurf.git
cd telesurf
npm install
npm start
```

Have fun surfing! 

## License
MIT
