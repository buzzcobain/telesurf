const { fetchWeather, fetchSports } = require('../api-service');
const fetch = require('cross-fetch');

jest.mock('cross-fetch');

describe('API Service Security', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('sanitizes malicious weather data', async () => {
    // Mock the Geocoding API response
    fetch.mockResolvedValueOnce({
      json: async () => ({
        results: [{ latitude: 0, longitude: 0, name: '<script>alert("XSS")</script>London' }]
      })
    });

    // Mock the Weather API response
    fetch.mockResolvedValueOnce({
      json: async () => ({
        current_weather: {
          temperature: '<img src="x" onerror="alert(1)">20',
          windspeed: '<b>10</b>',
          weathercode: 0
        }
      })
    });

    const result = await fetchWeather('Europe/London');
    
    expect(result.success).toBe(true);
    expect(result.city).toBe('&lt;script&gt;alert("XSS")&lt;/script&gt;London');
    expect(result.temp).toBe('&lt;img src="x" onerror="alert(1)"&gt;20');
    expect(result.wind).toBe('&lt;b&gt;10&lt;/b&gt;');
  });

  it('sanitizes malicious sports data', async () => {
    fetch.mockResolvedValueOnce({
      json: async () => ({
        teams: [{ idTeam: '123', strTeam: '<script>alert()</script>Arsenal', strStadium: '<b>Emirates</b>' }]
      })
    });

    fetch.mockResolvedValueOnce({
      json: async () => ({
        results: [{
          strEvent: 'Arsenal vs <script>steal_cookies()</script>',
          intHomeScore: '1',
          intAwayScore: '0',
          dateEvent: '2024-01-01'
        }]
      })
    });

    const result = await fetchSports('Arsenal');

    expect(result.success).toBe(true);
    expect(result.team).toBe('&lt;script&gt;alert()&lt;/script&gt;Arsenal');
    expect(result.stadium).toBe('&lt;b&gt;Emirates&lt;/b&gt;');
    expect(result.results[0].event).toBe('Arsenal vs &lt;script&gt;steal_cookies()&lt;/script&gt;');
  });
});
