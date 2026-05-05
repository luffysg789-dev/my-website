const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const htmlPath = path.join(rootDir, 'public', 'u-card-query', 'index.html');
const cssPath = path.join(rootDir, 'public', 'u-card-query', 'style.css');
const jsPath = path.join(rootDir, 'public', 'u-card-query', 'script.js');
const adminHtmlPath = path.join(rootDir, 'public', 'admin.html');
const adminJsPath = path.join(rootDir, 'public', 'admin.js');

test('U card query page includes language toggle after platform count', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert.match(html, /<span id="platformCount">0<\/span>[\s\S]*?<div class="lang-toggle"/);
  assert.match(html, /id="langZh"[\s\S]*data-lang="zh"[\s\S]*>中<\/button>/);
  assert.match(html, /id="langEn"[\s\S]*data-lang="en"[\s\S]*EN/);
  assert.match(html, /id="platformSearch" class="platform-search" type="search"[\s\S]*aria-label="搜索平台"/);
  assert.match(html, /id="platformPager" class="platform-pager"/);
  assert.match(html, /\/u-card-query\/style\.css\?v=20260506-03/);
  assert.match(html, /\/u-card-query\/script\.js\?v=20260506-03/);
});

test('U card query script translates fixed UI and selected results', () => {
  const js = fs.readFileSync(jsPath, 'utf8');
  assert.match(js, /currentLang = localStorage\.getItem\('uCardQueryLang'\) === 'en' \? 'en' : 'zh'/);
  assert.match(js, /const PLATFORMS_PER_PAGE = 21/);
  assert.match(js, /const SWIPE_MIN_DISTANCE = 48/);
  assert.match(js, /function stripParenthetical\(value\)/);
  assert.match(js, /function displayPlatformName\(value\)/);
  assert.match(js, /selectPlatform:\s*'选择'/);
  assert.match(js, /selectPlatform:\s*'Select'/);
  assert.match(js, /searchPlaceholder:\s*'搜索'/);
  assert.match(js, /searchPlaceholder:\s*'Search'/);
  assert.match(js, /function getFilteredPlatforms\(\)/);
  assert.match(js, /platformSearch\.addEventListener\('input'/);
  assert.match(js, /renderPlatforms\(getFilteredPlatforms\(\)\)/);
  assert.match(js, /supportedCardsTitle:\s*\(name\) => `Cards that support \$\{name\}`/);
  assert.match(js, /clickPlatformHint:\s*'After clicking a platform, cards available for payment will appear here\.'/);
  assert.match(js, /\['微信', 'WeChat'\]/);
  assert.match(js, /fetch\('\/api\/translate'/);
  assert.match(js, /resultTitle\.textContent = platform \? t\('supportedCardsTitle', displayPlatformName\(platform\.name\)\) : t\('resultTitle'\)/);
  assert.match(js, /issuerRegionLabel:\s*'发行地'/);
  assert.match(js, /issuerRegionLabel:\s*'Issued in'/);
  assert.match(js, /\['香港', 'Hong Kong'\]/);
  assert.match(js, /<span class="bin">\$\{escapeHtml\(t\('binPrefix'\)\)\} \$\{escapeHtml\(card\.bin\)\}<\/span>/);
  assert.match(js, /<span class="issuer-region">\$\{escapeHtml\(t\('issuerRegionLabel'\)\)\} \$\{escapeHtml\(displayName\(card\.issuer_region\)\)\}<\/span>/);
  assert.match(js, /platformPager\.addEventListener\('click'/);
  assert.match(js, /function changePlatformPage\(delta\)/);
  assert.match(js, /platformPanel\.addEventListener\('touchstart'/);
  assert.match(js, /platformPanel\.addEventListener\('touchend'/);
  assert.match(js, /changePlatformPage\(deltaX < 0 \? 1 : -1\)/);
});

test('U card query CSS styles the language toggle compactly', () => {
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.match(css, /\.section-actions\s*\{[\s\S]*?display:\s*inline-flex;[\s\S]*?gap:\s*8px;[\s\S]*?\}/);
  assert.match(css, /\.lang-toggle\s*\{[\s\S]*?border-radius:\s*999px;[\s\S]*?\}/);
  assert.match(css, /\.lang-toggle-btn\.active\s*\{[\s\S]*?background:\s*var\(--brand\);[\s\S]*?color:\s*#fff;[\s\S]*?\}/);
  assert.match(css, /\.platform-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);[\s\S]*?\}/);
  assert.match(css, /\.platform-search\s*\{[\s\S]*?border-radius:\s*999px;[\s\S]*?\}/);
  assert.match(css, /\.platform-panel\s*\{[\s\S]*?touch-action:\s*pan-y;[\s\S]*?\}/);
  assert.match(css, /\.platform-pager\s*\{[\s\S]*?display:\s*flex;[\s\S]*?justify-content:\s*center;[\s\S]*?\}/);
  assert.match(css, /\.issuer-region\s*\{[\s\S]*?background:\s*#f6f8f6;[\s\S]*?\}/);
});

test('U card admin supports optional issuer region on add and edit forms', () => {
  const adminHtml = fs.readFileSync(adminHtmlPath, 'utf8');
  const adminJs = fs.readFileSync(adminJsPath, 'utf8');

  assert.match(adminHtml, /id="uCardIssuerRegionLabel"[\s\S]*name="issuerRegion"[\s\S]*value="美国"[\s\S]*value="香港"[\s\S]*value="新加坡"/);
  assert.match(adminHtml, /id="uCardSyncUpstreamBtn"[\s\S]*一键同步上游场景资料/);
  assert.match(adminHtml, /\/admin\.js\?v=20260319-04/);
  assert.match(adminJs, /uCardIssuerRegionLabel:\s*'发行地'/);
  assert.match(adminJs, /uCardIssuerRegionNone:\s*'不选择'/);
  assert.match(adminJs, /uCardSyncUpstreamBtn:\s*'一键同步上游场景资料'/);
  assert.match(adminJs, /\/api\/admin\/u-card\/sync-upstream/);
  assert.match(adminJs, /function renderUCardIssuerRegionOptions\(selectedValue = ''\)/);
  assert.match(adminJs, /id="uCardIssuerRegion-\$\{card\.id\}"/);
  assert.match(adminJs, /issuerRegion:\s*String\(document\.getElementById\(`uCardIssuerRegion-\$\{id\}`\)\?\.value \|\| ''\)\.trim\(\)/);
  assert.match(adminJs, /issuerRegion:\s*String\(formData\.get\('issuerRegion'\) \|\| ''\)\.trim\(\)/);
});
