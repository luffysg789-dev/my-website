const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const configPath = path.join(rootDir, 'public', 'games-config.js');
const htmlPath = path.join(rootDir, 'public', 'hk-web3-carnival', 'index.html');
const shortHtmlPath = path.join(rootDir, 'public', 'hk', 'index.html');
const cssPath = path.join(rootDir, 'public', 'hk-web3-carnival', 'style.css');
const jsPath = path.join(rootDir, 'public', 'hk-web3-carnival', 'script.js');
const dataPath = path.join(rootDir, 'public', 'hk-web3-carnival', 'data.js');

test('hong kong web3 carnival is wired into games hub', () => {
  const config = fs.readFileSync(configPath, 'utf8');

  assert.match(config, /slug:\s*'hk-web3-carnival'/);
  assert.match(config, /name:\s*'2026 · 香港 Web3 嘉年华'/);
  assert.match(config, /route:\s*'\/hk\/'/);
  assert.match(config, /showInGamesHub:\s*1/);
});

test('hong kong web3 carnival static page includes filter and list hooks', () => {
  assert.equal(fs.existsSync(htmlPath), true);
  assert.equal(fs.existsSync(shortHtmlPath), true);
  const html = fs.readFileSync(htmlPath, 'utf8');
  const shortHtml = fs.readFileSync(shortHtmlPath, 'utf8');

  assert.match(html, /<title>Claw800 2026 · 香港 Web3 嘉年华<\/title>/);
  assert.match(html, /data-carnival-app/);
  assert.match(html, /id="carnivalHero"/);
  assert.match(html, /id="carnivalSearchInput"/);
  assert.match(html, /id="carnivalDateFilter"/);
  assert.match(html, /id="carnivalStateFilter"/);
  assert.match(html, /id="carnivalTypeFilter"/);
  assert.match(html, /id="carnivalEventList"/);
  assert.match(html, /id="carnivalLoadMore"/);
  assert.match(html, /href="https:\/\/www\.nexaexworth\.com\/"/);
  assert.match(html, /id="carnivalContactButton"/);
  assert.match(html, /id="carnivalQrModal"/);
  assert.match(html, /contact-qr\.jpg/);
  assert.match(html, /\/hk-web3-carnival\/data\.js\?v=20260418-01/);
  assert.match(html, /\/hk-web3-carnival\/script\.js\?v=20260418-04/);
  assert.match(html, /\/hk-web3-carnival\/style\.css\?v=20260418-04/);
  assert.match(shortHtml, /<title>Claw800 2026 · 香港 Web3 嘉年华<\/title>/);
  assert.match(shortHtml, /\/hk-web3-carnival\/script\.js\?v=20260418-04/);
});

test('hong kong web3 carnival data snapshot includes summary and event items', () => {
  assert.equal(fs.existsSync(dataPath), true);
  const data = fs.readFileSync(dataPath, 'utf8');

  assert.match(data, /window\.__HK_WEB3_CARNIVAL_DATA__/);
  assert.match(data, /2026 · 香港 Web3 嘉年华/);
  assert.match(data, /香港 Web3 嘉年华将于 2026 年 4 月 20 - 23 日/);
  assert.match(data, /Gate x Red Bull/);
  assert.match(data, /Crypto 2026：从加密货币到智能经济/);
  assert.match(data, /"total":\s*91/);
});

test('hong kong web3 carnival css and script define the mirrored activity layout', () => {
  assert.equal(fs.existsSync(cssPath), true);
  assert.equal(fs.existsSync(jsPath), true);
  const css = fs.readFileSync(cssPath, 'utf8');
  const js = fs.readFileSync(jsPath, 'utf8');

  assert.match(css, /\.carnival-shell\s*\{/);
  assert.match(css, /\.carnival-hero\s*\{/);
  assert.match(css, /\.carnival-search-panel,/);
  assert.match(css, /\.carnival-event-card\s*\{/);
  assert.match(css, /\.carnival-status--live/);
  assert.match(css, /\.carnival-modal\[hidden\]/);
  assert.match(css, /\.carnival-hero__download/);
  assert.match(css, /\.carnival-hero__contact/);
  assert.match(css, /@media \(max-width:\s*860px\)/);

  assert.match(js, /function renderHero\(/);
  assert.match(js, /function renderEvents\(/);
  assert.match(js, /function applyFilters\(/);
  assert.match(js, /function loadMore\(/);
  assert.match(js, /function openQrModal\(/);
  assert.match(js, /function closeQrModal\(/);
  assert.match(js, /BOOK/);
});
