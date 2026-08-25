const fetch = require('cross-fetch');

// Basic HTML sanitizer to strip all tags
function sanitizeHTML(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Function to get weather
async function fetchWeather(city) {
  try {
    // 1. Geocode city
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&format=json`);
    const geoData = await geoRes.json();
    
    if (!geoData.results || geoData.results.length === 0) {
      throw new Error("Location not found");
    }

    const { latitude, longitude, name } = geoData.results[0];

    // 2. Fetch Weather
    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
    const weatherData = await weatherRes.json();

    const current = weatherData.current_weather;
    
    // Teletext-style weather formatting
    return {
      success: true,
      city: sanitizeHTML(name),
      temp: sanitizeHTML(current.temperature.toString()),
      wind: sanitizeHTML(current.windspeed.toString()),
      code: current.weathercode
    };

  } catch (error) {
    console.error("Weather fetch failed:", error);
    return { success: false, error: "DATA UNAVAILABLE" };
  }
}

// Function to get sports (Using TheSportsDB free tier key '3')
async function fetchSports(teamName) {
  try {
    const cleanTeam = encodeURIComponent(teamName.trim());
    
    // Fetch team info
    const teamRes = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${cleanTeam}`);
    const teamData = await teamRes.json();

    if (!teamData.teams || teamData.teams.length === 0) {
      return { success: false, error: "TEAM NOT FOUND" };
    }

    const team = teamData.teams[0];
    
    // Fetch last event
    const lastRes = await fetch(`https://www.thesportsdb.com/api/v1/json/3/eventslast.php?id=${team.idTeam}`);
    const lastData = await lastRes.json();
    
    // Fetch next event
    const nextRes = await fetch(`https://www.thesportsdb.com/api/v1/json/3/eventsnext.php?id=${team.idTeam}`);
    const nextData = await nextRes.json();
    
    let lastEvent = null;
    if (lastData.results && lastData.results.length > 0) {
      const e = lastData.results[0];
      const isHome = e.idHomeTeam === team.idTeam;
      lastEvent = {
        name: sanitizeHTML(e.strEvent),
        date: sanitizeHTML(e.dateEvent),
        homeScore: sanitizeHTML(e.intHomeScore || '0'),
        awayScore: sanitizeHTML(e.intAwayScore || '0'),
        isHome: isHome,
        opponent: isHome ? sanitizeHTML(e.strAwayTeam) : sanitizeHTML(e.strHomeTeam)
      };
    }

    let nextEvent = null;
    if (nextData.events && nextData.events.length > 0) {
      const e = nextData.events[0];
      const isHome = e.idHomeTeam === team.idTeam;
      nextEvent = {
        name: sanitizeHTML(e.strEvent),
        date: sanitizeHTML(e.dateEvent),
        isHome: isHome,
        opponent: isHome ? sanitizeHTML(e.strAwayTeam) : sanitizeHTML(e.strHomeTeam)
      };
    }

    return {
      success: true,
      team: sanitizeHTML(team.strTeam),
      stadium: sanitizeHTML(team.strStadium),
      lastEvent,
      nextEvent
    };
  } catch (error) {
    console.error("Sports fetch failed:", error);
    return { success: false, error: "API ERROR OR RATE LIMITED" };
  }
}

module.exports = {
  fetchWeather,
  fetchSports
};
