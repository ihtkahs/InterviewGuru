// utility helpers
function tryParseJSON(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch (e) {}
  // extract first {...} block
  const m = text.match(/\{[\s\S]*\}/);
  if (m) {
    try { return JSON.parse(m[0]); } catch (e) {}
  }
  // try cleaning trailing commas
  const cleaned = text.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
  try { return JSON.parse(cleaned); } catch (e) {}
  return null;
}

module.exports = { tryParseJSON };
