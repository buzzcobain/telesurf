const { parseSearchInput } = require('../utils');

describe('URL Parser and Search Logic', () => {
  it('should parse single words as a search query', () => {
    expect(parseSearchInput('reddit')).toBe('https://duckduckgo.com/?q=reddit');
  });

  it('should parse multiple words as a search query', () => {
    expect(parseSearchInput('funny cats and dogs')).toBe('https://duckduckgo.com/?q=funny%20cats%20and%20dogs');
  });

  it('should format domains missing http:// with https://', () => {
    expect(parseSearchInput('example.com')).toBe('https://example.com');
    expect(parseSearchInput('news.ycombinator.com')).toBe('https://news.ycombinator.com');
  });

  it('should leave fully qualified URLs alone', () => {
    expect(parseSearchInput('https://github.com')).toBe('https://github.com');
    expect(parseSearchInput('http://insecure.local')).toBe('http://insecure.local');
  });

  it('should allow file:// URIs', () => {
    expect(parseSearchInput('file:///Users/david/local.html')).toBe('file:///Users/david/local.html');
  });

  it('should allow tui:// custom URIs', () => {
    expect(parseSearchInput('tui://readme')).toBe('tui://readme');
  });

  it('should default empty input to duckduckgo', () => {
    expect(parseSearchInput('   ')).toBe('https://duckduckgo.com');
  });
});
