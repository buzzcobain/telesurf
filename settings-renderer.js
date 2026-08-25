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

// --- Dashboard Logic ---
const widgetWeather = document.getElementById('widget-weather');
const widgetSports = document.getElementById('widget-sports');
const widgetGames = document.getElementById('widget-games');
const sportsTeam = document.getElementById('sports-team');

let dashboardConfig = JSON.parse(localStorage.getItem('tui-dashboard') || '{}');
// Default config
if (dashboardConfig.weather === undefined) dashboardConfig.weather = true;
if (dashboardConfig.sports === undefined) dashboardConfig.sports = true;
if (dashboardConfig.games === undefined) dashboardConfig.games = true;
if (!dashboardConfig.team) dashboardConfig.team = 'Arsenal'; // Default for the sports API

widgetWeather.checked = dashboardConfig.weather;
widgetSports.checked = dashboardConfig.sports;
widgetGames.checked = dashboardConfig.games;
sportsTeam.value = dashboardConfig.team;

function saveDashboardConfig() {
  dashboardConfig.weather = widgetWeather.checked;
  dashboardConfig.sports = widgetSports.checked;
  dashboardConfig.games = widgetGames.checked;
  dashboardConfig.team = sportsTeam.value.trim() || 'Arsenal';
  
  localStorage.setItem('tui-dashboard', JSON.stringify(dashboardConfig));
  window.electronAPI.setDashboardConfig(dashboardConfig);
}

widgetWeather.addEventListener('change', saveDashboardConfig);
widgetSports.addEventListener('change', saveDashboardConfig);
widgetGames.addEventListener('change', saveDashboardConfig);
sportsTeam.addEventListener('input', saveDashboardConfig);

// Set on load
window.electronAPI.setDashboardConfig(dashboardConfig);

updateSelection();
