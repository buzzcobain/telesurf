const fetch = require('cross-fetch');

// Basic HTML sanitizer to strip all tags
function sanitizeHTML(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Function to get weather
async function fetchWeather(timeZone) {
  try {
    // Attempt to parse city from TimeZone (e.g. Europe/London -> London)
    const parts = timeZone.split('/');
    let city = parts[parts.length - 1].replace(/_/g, ' ');

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
    
    // Fetch last 5 events
    const eventRes = await fetch(`https://www.thesportsdb.com/api/v1/json/3/eventslast.php?id=${team.idTeam}`);
    const eventData = await eventRes.json();
    
    let results = [];
    if (eventData.results) {
      results = eventData.results.slice(0, 3).map(event => ({
        event: sanitizeHTML(event.strEvent),
        homeScore: sanitizeHTML(event.intHomeScore || '0'),
        awayScore: sanitizeHTML(event.intAwayScore || '0'),
        date: sanitizeHTML(event.dateEvent)
      }));
    }

    return {
      success: true,
      team: sanitizeHTML(team.strTeam),
      stadium: sanitizeHTML(team.strStadium),
      results
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
