const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const jsPath = path.join(__dirname, '..', 'public', 'main.js');

test('home page boot performs a final list render after async bootstrap settles', () => {
  const js = fs.readFileSync(jsPath, 'utf8');

  assert.match(js, /function renderHomeSitesFromCurrentState\(/);
  assert.match(js, /const bootResults = await Promise\.allSettled\(\[loadSiteConfig\(\), loadCategories\(\), loadSites\(\{ limit: HOME_INITIAL_SITE_LIMIT \}\)\]\);/);
  assert.match(js, /const initialSitesFailed = bootResults\[2\]\?\.status === 'rejected';/);
  assert.match(js, /applyLanguage\(\);\s*renderHomeSitesFromCurrentState\(\);/);
});

test('home page retries a full site load when the first mobile bootstrap list is empty', () => {
  const js = fs.readFileSync(jsPath, 'utf8');

  assert.match(js, /function isDefaultHomeView\(\)/);
  assert.match(js, /let homeEmptyRecoveryAttempts = 0;/);
  assert.match(js, /if \(!siteItems\.length && isDefaultHomeView\(\) && homeEmptyRecoveryAttempts < 1\) \{/);
  assert.match(js, /homeEmptyRecoveryAttempts \+= 1;/);
  assert.match(js, /loadSites\(\{ background: true \}\)\.catch\(\(\) => \{/);
  assert.match(js, /const hasInitialHomeSites = getVisibleSiteItems\(homeAllSitesCache\.length \? homeAllSitesCache : allSitesCache\)\.length > 0;/);
  assert.match(js, /if \(initialSitesFailed \|\| \(!favoriteSitesOnly && !currentCategory && !searchInput\.value\.trim\(\) && !hasInitialHomeSites\)\) \{/);
  assert.match(js, /await loadSites\(\);/);
});

test('home page renders first category and site chunks synchronously and refreshes on pageshow', () => {
  const js = fs.readFileSync(jsPath, 'utf8');

  assert.match(js, /function renderCategories\([\s\S]*?appendChunk\(\);/);
  assert.match(js, /function renderSitesChunked\([\s\S]*?appendChunk\(\);/);
  assert.match(js, /window\.addEventListener\('pageshow', \(\) => \{\s*renderHomeSitesFromCurrentState\(\);\s*\}\);/);
});
