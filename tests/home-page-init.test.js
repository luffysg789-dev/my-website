const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const jsPath = path.join(__dirname, '..', 'public', 'main.js');

test('home page boot performs a final list render after async bootstrap settles', () => {
  const js = fs.readFileSync(jsPath, 'utf8');

  assert.match(js, /function renderHomeSitesFromCurrentState\(/);
  assert.match(js, /await Promise\.all\(\[loadSiteConfig\(\), loadCategories\(\), loadSites\(\{ limit: HOME_INITIAL_SITE_LIMIT \}\)\]\)/);
  assert.match(js, /applyLanguage\(\);\s*renderHomeSitesFromCurrentState\(\);/);
});
