const themeOptions = document.querySelectorAll('.theme-option');

let currentTheme = localStorage.getItem('tui-theme') || 'ceefax';

function updateSelection() {
  themeOptions.forEach(opt => {
    if (opt.getAttribute('data-theme') === currentTheme) {
      opt.classList.add('selected');
    } else {
      opt.classList.remove('selected');
    }
  });
}

themeOptions.forEach(opt => {
  opt.addEventListener('click', () => {
    const theme = opt.getAttribute('data-theme');
    currentTheme = theme;
    localStorage.setItem('tui-theme', theme);
    updateSelection();
    
    // Broadcast theme change to the main process
    window.electronAPI.setTheme(theme);
  });
});

window.electronAPI.onThemeChanged((theme) => {
  currentTheme = theme;
  localStorage.setItem('tui-theme', theme);
  updateSelection();
});

document.getElementById('close-btn').addEventListener('click', () => {
  window.close();
});

// --- Cookie Preferences Logic ---
const cookiePrefSelect = document.getElementById('cookie-pref');
let currentCookiePref = localStorage.getItem('tui-cookie-pref') || 'decline';
cookiePrefSelect.value = currentCookiePref;

// Set it on load so main process gets it
window.electronAPI.setCookiePref(currentCookiePref);

cookiePrefSelect.addEventListener('change', (e) => {
  const pref = e.target.value;
  currentCookiePref = pref;
  localStorage.setItem('tui-cookie-pref', pref);
  window.electronAPI.setCookiePref(pref);
});

updateSelection();
