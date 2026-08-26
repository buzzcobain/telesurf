function parseSearchInput(input) {
  let finalUrl = input.trim();
  if (finalUrl === '') {
    return 'https://duckduckgo.com';
  }
  
  if (finalUrl.includes(' ') || (!finalUrl.includes('.') && !finalUrl.startsWith('localhost') && !finalUrl.startsWith('file://') && !finalUrl.startsWith('tui://'))) {
    return 'https://duckduckgo.com/?q=' + encodeURIComponent(finalUrl);
  } else if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://') && !finalUrl.startsWith('file://') && !finalUrl.startsWith('tui://')) {
    return 'https://' + finalUrl;
  }
  return finalUrl;
}

module.exports = {
  parseSearchInput
};
