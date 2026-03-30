const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const configPath = path.join(rootDir, 'public', 'games-config.js');
const dbPath = path.join(rootDir, 'src', 'db.js');
const serverPath = path.join(rootDir, 'src', 'server.js');
const htmlPath = path.join(rootDir, 'public', 'p-mining', 'index.html');
const cssPath = path.join(rootDir, 'public', 'p-mining', 'style.css');
const jsPath = path.join(rootDir, 'public', 'p-mining', 'script.js');

test('p-mining stays as a standalone page config and route, but is hidden from the games hub', () => {
  const config = fs.readFileSync(configPath, 'utf8');
  const db = fs.readFileSync(dbPath, 'utf8');
  const server = fs.readFileSync(serverPath, 'utf8');

  assert.match(config, /slug:\s*'p-mining'/);
  assert.match(config, /name:\s*'P-Mining'/);
  assert.match(config, /route:\s*'\/p-mining\/'/);
  assert.match(config, /showInGamesHub:\s*0/);
  assert.match(db, /slug:\s*'p-mining'/);
  assert.match(server, /'p-mining':\s*'\/p-mining\/'/);
});

test('p-mining html includes host header, tab panels, and script mounts', () => {
  assert.equal(fs.existsSync(htmlPath), true);

  const html = fs.readFileSync(htmlPath, 'utf8');

  assert.match(html, /<title>Claw800 P-Mining<\/title>/);
  assert.match(html, /data-p-mining-app/);
  assert.match(html, /id="pMiningHostStatus"/);
  assert.match(html, /data-locale-toggle="en"/);
  assert.match(html, /data-locale-toggle="zh"/);
  assert.match(html, /data-tab="mining"/);
  assert.match(html, /data-tab="invite"/);
  assert.match(html, /data-tab="purchase"/);
  assert.match(html, /data-tab="records"/);
  assert.match(html, /data-tab="profile"/);
  assert.match(html, /id="pMiningClaimButton"/);
  assert.match(html, /class="p-mining-claim-ring"/);
  assert.match(html, /class="p-mining-claim-ring__mine-icon"/);
  assert.match(html, /id="pMiningClaimCountdown">60</);
  assert.doesNotMatch(html, /id="pMiningClaimCountdown">00:00:00</);
  assert.match(html, /id="pMiningStatsGrid"/);
  assert.match(html, /id="pMiningEstimatedTodayOutput"/);
  assert.match(html, /data-record-filter="claims"/);
  assert.match(html, /data-record-filter="invites"/);
  assert.match(html, /data-record-filter="power"/);
  assert.match(html, /id="pMiningPurchasePanel"/);
  assert.match(html, /data-purchase-tier="starter"/);
  assert.match(html, /data-purchase-tier="boost"/);
  assert.match(html, /\/games-config\.js/);
  assert.match(html, /\/p-mining\/script\.js/);
});

test('p-mining purchase is a standalone tab placed between invite and records', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');

  assert.doesNotMatch(html, /id="pMiningOpenPurchaseButton"/);
  assert.match(html, /data-tab-target="invite"[\s\S]*data-tab-target="purchase"[\s\S]*data-tab-target="records"/);
  assert.match(html, /data-i18n="tabPurchase"/);
  assert.match(html, /<section class="p-mining-panel" data-tab="purchase" hidden>[\s\S]*id="pMiningPurchasePanel"/);
});

test('p-mining css includes dark glass tokens, bottom nav, and circular claim layout', () => {
  assert.equal(fs.existsSync(cssPath), true);

  const css = fs.readFileSync(cssPath, 'utf8');

  assert.match(css, /--p-mining-accent:\s*#F27D26/i);
  assert.match(css, /--p-mining-power:\s*#/);
  assert.match(css, /\.p-mining-balance-card\s*\{/);
  assert.match(css, /\.p-mining-claim-ring\s*\{/);
  assert.match(css, /\.p-mining-claim-ring__countdown\s*\{[\s\S]*color:\s*var\(--p-mining-text\);/);
  assert.match(css, /\.p-mining-nav\s*\{/);
  assert.match(css, /\.p-mining-nav__item\.is-active/);
  assert.match(css, /\.p-mining-stats-grid\s*\{/);
  assert.match(css, /\.p-mining-page:not\(\.is-ready\)\s+\.p-mining-claim-ring__countdown\s*\{/);
  assert.match(css, /\.p-mining-header\s*\{[\s\S]*display:\s*flex;[\s\S]*justify-content:\s*space-between;/);
  assert.match(css, /\.p-mining-header__actions\s*\{[\s\S]*margin-left:\s*auto;/);
  assert.match(css, /\.p-mining-host-status\s*\{[\s\S]*border-radius:\s*999px;/);
  assert.match(css, /\.p-mining-locale-toggle__button\.is-active/);
  assert.match(css, /backdrop-filter:\s*blur\(/);
  assert.match(css, /padding-bottom:\s*calc\(.*env\(safe-area-inset-bottom\)/);
});

test('p-mining mobile layout is tightened for smaller phone screens', () => {
  const css = fs.readFileSync(cssPath, 'utf8');

  assert.match(css, /@media \(max-width:\s*720px\)[\s\S]*?\.p-mining-page\s*\{[\s\S]*?padding-top:\s*12px;[\s\S]*?padding-right:\s*14px;[\s\S]*?padding-left:\s*14px;/);
  assert.match(css, /@media \(max-width:\s*720px\)[\s\S]*?\.p-mining-brand__icon\s*\{[\s\S]*?width:\s*52px;[\s\S]*?height:\s*52px;/);
  assert.match(css, /@media \(max-width:\s*720px\)[\s\S]*?\.p-mining-balance-card\s*\{[\s\S]*?min-height:\s*184px;/);
  assert.match(css, /@media \(max-width:\s*720px\)[\s\S]*?\.p-mining-balance-card__value\s*\{[\s\S]*?font-size:\s*clamp\(2\.15rem,\s*9vw,\s*3\.5rem\);/);
  assert.match(css, /@media \(max-width:\s*720px\)[\s\S]*?\.p-mining-claim-ring\s*\{[\s\S]*?width:\s*min\(29vw,\s*132px\);/);
  assert.match(css, /@media \(max-width:\s*720px\)[\s\S]*?\.p-mining-card\s*\{[\s\S]*?padding:\s*14px;/);
  assert.match(css, /@media \(max-width:\s*720px\)[\s\S]*?\.p-mining-stat-card__value\s*\{[\s\S]*?font-size:\s*clamp\(1\.18rem,\s*4\.1vw,\s*1\.7rem\);/);
});

test('p-mining mobile stats stay in a compact two-column dashboard layout', () => {
  const css = fs.readFileSync(cssPath, 'utf8');

  assert.match(css, /@media \(max-width:\s*720px\)[\s\S]*?\.p-mining-stats-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/);
  assert.match(css, /@media \(max-width:\s*720px\)[\s\S]*?\.p-mining-stats-grid\s*\{[\s\S]*?gap:\s*8px;/);
  assert.match(css, /@media \(max-width:\s*720px\)[\s\S]*?\.p-mining-two-col\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/);
  assert.match(css, /@media \(max-width:\s*720px\)[\s\S]*?\.p-mining-rule-card\s*\{[\s\S]*?line-height:\s*1\.5;/);
});

test('p-mining mobile typography scales down across all tabs for a denser phone layout', () => {
  const css = fs.readFileSync(cssPath, 'utf8');

  assert.match(css, /@media \(max-width:\s*720px\)[\s\S]*?\.p-mining-balance-card__value\s*\{[\s\S]*?font-size:\s*clamp\(2\.15rem,\s*9vw,\s*3\.5rem\);/);
  assert.match(css, /@media \(max-width:\s*720px\)[\s\S]*?\.p-mining-metric\s*\{[\s\S]*?font-size:\s*clamp\(1\.08rem,\s*4vw,\s*1\.55rem\);/);
  assert.match(css, /@media \(max-width:\s*720px\)[\s\S]*?\.p-mining-claim-ring__countdown\s*\{[\s\S]*?font-size:\s*clamp\(0\.88rem,\s*3vw,\s*1\.15rem\);/);
  assert.match(css, /@media \(max-width:\s*720px\)[\s\S]*?\.p-mining-stat-card__value\s*\{[\s\S]*?font-size:\s*clamp\(1\.18rem,\s*4\.1vw,\s*1\.7rem\);/);
  assert.match(css, /@media \(max-width:\s*720px\)[\s\S]*?\.p-mining-record-card__title\s*\{[\s\S]*?font-size:\s*1\.02rem;/);
  assert.match(css, /@media \(max-width:\s*720px\)[\s\S]*?\.p-mining-record-card__value\s*\{[\s\S]*?font-size:\s*1\.34rem;/);
  assert.match(css, /@media \(max-width:\s*720px\)[\s\S]*?\.p-mining-nav__item\s*\{[\s\S]*?font-size:\s*0\.84rem;/);
});

test('p-mining html includes the expected mining, invite, records, and profile sections', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');

  assert.match(html, /data-i18n="currentHoldings"/);
  assert.match(html, /data-i18n="estimatedPerMinute"/);
  assert.match(html, /data-i18n="estimatedTodayOutput"/);
  assert.match(html, /data-i18n="enterInviteCode"/);
  assert.match(html, /data-i18n="inviteFriends"/);
  assert.match(html, /data-i18n="claimRecords"/);
  assert.match(html, /data-i18n="currentTotalPoints"/);
  assert.match(html, /Every 4 Years \(Next\)/);
  assert.match(html, /P is Pay，P is People，P没有用，是我们的见证，当参与的人数超过 1000 万人时，说不定是一场伟大的胜利。/);
});

test('p-mining script includes the expected UI hooks', () => {
  assert.equal(fs.existsSync(jsPath), true);

  const js = fs.readFileSync(jsPath, 'utf8');

  assert.match(js, /const LOCALE_STORAGE_KEY = 'claw800:p-mining:locale';/);
  assert.match(js, /const PMINING_SESSION_STORAGE_KEY = 'claw800:p-mining:nexa-session';/);
  assert.match(js, /const MAX_NEXA_SESSION_RETENTION_MS = 30 \* 24 \* 60 \* 60 \* 1000;/);
  assert.match(js, /const NEXA_PROTOCOL_AUTH_BASE = 'nexaauth:\/\/oauth\/authorize';/);
  assert.match(js, /const NEXA_PROTOCOL_ORDER_BASE = 'nexaauth:\/\/order';/);
  assert.match(js, /const PMINING_PENDING_PAYMENT_STORAGE_KEY = 'claw800:p-mining:pending-payment';/);
  assert.match(js, /const PMINING_SETTLED_PAYMENT_STORAGE_KEY = 'claw800:p-mining:settled-payment';/);
  assert.match(js, /function loadCachedPMiningSession\(/);
  assert.match(js, /function saveCachedPMiningSession\(/);
  assert.match(js, /function beginNexaLoginFlow\(/);
  assert.match(js, /email:\s*'guest@nexa\.app'/);
  assert.doesNotMatch(js, /luffysg789@gmail\.com/);
  assert.match(js, /const POWER_PURCHASE_OPTIONS = \{/);
  assert.match(js, /function purchasePowerPackage\(/);
  assert.match(js, /function buildNexaPaymentUrl\(/);
  assert.match(js, /function loadPendingPaymentOrder\(/);
  assert.match(js, /function savePendingPaymentOrder\(/);
  assert.match(js, /function saveSettledPaymentReceipt\(/);
  assert.match(js, /function hasSettledPaymentOrder\(/);
  assert.match(js, /function settlePendingPaymentOrder\(/);
  assert.match(js, /function applyPendingInvitePurchaseBonuses\(/);
  assert.doesNotMatch(js, /function togglePurchasePanel\(/);
  assert.match(js, /function calculateEstimatedTodayOutput\(/);
  assert.match(js, /\/api\/p-mining\/session/);
  assert.match(js, /\/api\/p-mining\/session\/logout/);
  assert.match(js, /\/api\/p-mining\/bootstrap/);
  assert.match(js, /\/api\/p-mining\/claim/);
  assert.match(js, /\/api\/p-mining\/invite\/bind/);
  assert.match(js, /\/api\/p-mining\/payment\/create/);
  assert.match(js, /\/api\/p-mining\/payment\/query/);
  assert.match(js, /function syncAppStateFromServer\(/);
  assert.match(js, /function loadPMiningBootstrap\(/);
  assert.match(js, /function toggleLanguage\(/);
  assert.match(js, /function applyTranslations\(/);
  assert.match(js, /function switchTab\(/);
  assert.match(js, /function animateBalanceValue\(/);
  assert.match(js, /globalScope\.window\?\.requestAnimationFrame\?\.bind\(globalScope\.window\)/);
  assert.match(js, /style\.transform = `translateX\(\$\{-shift\}px\)`/);
  assert.match(js, /function renderClaimState\(/);
  assert.match(js, /function handleClaimButtonClick\(/);
  assert.match(js, /function handleInviteSubmit\(/);
  assert.match(js, /function handleCopyInviteCode\(/);
  assert.match(js, /function renderRecordsPanel\(/);
  assert.match(js, /function renderProfilePanel\(/);
  assert.match(js, /else if \(isNexaAppEnvironment\(\)\) \{\s*await beginNexaLoginFlow\(appState,\s*'mining'\)\.catch\(\(\) => false\);/);
  assert.match(js, /root\.classList\.add\('is-ready'\);/);
  assert.match(js, /window\.setInterval\(/);
});

test('p-mining script only refreshes cooldown on interval without auto-advancing network stats', () => {
  const js = fs.readFileSync(jsPath, 'utf8');

  assert.match(js, /window\.setInterval\(\(\)\s*=>\s*\{\s*renderClaimState\(appState\);\s*\},\s*1000\);/);
});
