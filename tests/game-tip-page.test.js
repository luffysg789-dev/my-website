const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const serverJs = fs.readFileSync(path.join(rootDir, 'src', 'server.js'), 'utf8');
const tipJsPath = path.join(rootDir, 'public', 'game-tip.js');
const tipCssPath = path.join(rootDir, 'public', 'game-tip.css');
const tipJs = fs.readFileSync(tipJsPath, 'utf8');
const fortuneJs = fs.readFileSync(path.join(rootDir, 'public', 'fortune.js'), 'utf8');

const pages = [
  path.join(rootDir, 'public', 'blast-balloons', 'index.html'),
  path.join(rootDir, 'public', 'gomoku', 'index.html'),
  path.join(rootDir, 'public', 'minesweeper.html'),
  path.join(rootDir, 'public', 'fortune.html'),
  path.join(rootDir, 'public', 'muyu.html')
];

test('shared game tip assets exist', () => {
  assert.equal(fs.existsSync(tipJsPath), true);
  assert.equal(fs.existsSync(tipCssPath), true);
});

test('all game pages include the shared mobile tip assets', () => {
  for (const pagePath of pages) {
    const html = fs.readFileSync(pagePath, 'utf8');
    assert.match(html, /game-tip\.css\?v=/);
    assert.match(html, /game-tip\.js\?v=/);
  }
});

test('shared tip styles keep the donate bar mobile-first and pinned near the bottom content', () => {
  const css = fs.readFileSync(tipCssPath, 'utf8');

  assert.match(css, /\.game-tip\s*\{[\s\S]*display:\s*grid;/);
  assert.match(css, /\.game-tip__copy\s*\{[\s\S]*justify-items:\s*center;/);
  assert.match(css, /\.game-tip__title\s*\{[\s\S]*text-align:\s*center;/);
  assert.match(css, /\.game-tip__desc\s*\{[\s\S]*text-align:\s*center;/);
  assert.match(css, /\.game-tip__button\s*\{[\s\S]*min-height:\s*46px;/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.muyu-page\s+\.game-tip\s*\{[\s\S]*transform:\s*translateY\(-30px\);/);
  assert.doesNotMatch(css, /@media \(max-width: 720px\)\s*\{\s*\.game-tip\s*\{\s*transform:\s*translateY\(-30px\);/);
  assert.match(css, /@media \(min-width: 721px\)[\s\S]*?\.game-tip\s*\{[\s\S]*display:\s*none;/);
});

test('server exposes nexa tip endpoints', () => {
  assert.match(serverJs, /app\.post\('\/api\/nexa\/tip\/session'/);
  assert.match(serverJs, /app\.post\('\/api\/nexa\/tip\/create'/);
  assert.match(serverJs, /app\.post\('\/api\/nexa\/tip\/query'/);
  assert.match(serverJs, /app\.post\('\/api\/nexa\/tip\/notify'/);
});

test('shared tip script uses explicit login-then-pay flow for Nexa app webview', () => {
  assert.match(tipJs, /const TIP_BUTTON_TEXT_LOGIN = 'Nexa 登录后打赏';/);
  assert.match(tipJs, /const TIP_BUTTON_TEXT_PAY = '打赏 0\.1 USDT';/);
  assert.match(tipJs, /const NEXA_PROTOCOL_AUTH_BASE = 'nexaauth:\/\/oauth\/authorize';/);
  assert.match(tipJs, /const NEXA_PROTOCOL_ORDER_BASE = 'nexaauth:\/\/order';/);
  assert.match(tipJs, /const SESSION_STORAGE_KEY = 'claw800_nexa_tip_session_v1';/);
  assert.match(tipJs, /function getPersistentStorage\(\)/);
  assert.match(tipJs, /function isNexaAppEnvironment\(\)/);
  assert.match(tipJs, /function shouldRenderTip\(\)/);
  assert.match(tipJs, /function clearCachedSession\(\)/);
  assert.match(tipJs, /function syncTipCopy\(/);
  assert.match(tipJs, /function updateButtonState\(/);
  assert.match(tipJs, /function buildNexaAuthorizeUrl\(/);
  assert.match(tipJs, /function buildNexaPaymentUrl\(/);
  assert.match(tipJs, /function promptDownloadNexaApp\(\)/);
  assert.match(tipJs, /function launchNexaUrl\(/);
  assert.match(tipJs, /return window\.localStorage;/);
  assert.match(tipJs, /const userAgent = String\(window\.navigator\?\.userAgent \|\| ''\)\.trim\(\);/);
  assert.match(tipJs, /const referrer = String\(document\.referrer \|\| ''\)\.trim\(\);/);
  assert.match(tipJs, /const session = loadCachedSession\(\);/);
  assert.match(tipJs, /const hasNexaMarker = \/nexa\/i\.test\(userAgent\) \|\| \/nexa\/i\.test\(referrer\);/);
  assert.match(tipJs, /return Boolean\(hasNexaMarker \|\| session\);/);
  assert.match(tipJs, /getPersistentStorage\(\)\.getItem\(SESSION_STORAGE_KEY\)/);
  assert.match(tipJs, /getPersistentStorage\(\)\.setItem\(SESSION_STORAGE_KEY,/);
  assert.match(tipJs, /getPersistentStorage\(\)\.removeItem\(SESSION_STORAGE_KEY\)/);
  assert.match(tipJs, /return window\.matchMedia\('\(max-width: 720px\)'\)\.matches;/);
  assert.match(tipJs, /if \(!shouldRenderTip\(\)\) return;/);
  assert.match(tipJs, /if \(!isNexaAppEnvironment\(\)\) \{[\s\S]*?promptDownloadNexaApp\(\);[\s\S]*?return;/);
  assert.match(tipJs, /setStatus\('请下载 Nexa App 玩更多游戏,打赏。', 'error'\);/);
  assert.match(tipJs, /window\.alert\('请下载 Nexa App 玩更多游戏,打赏。'\);/);
  assert.match(tipJs, /launchNexaUrl\(buildNexaAuthorizeUrl\(/);
  assert.match(tipJs, /launchNexaUrl\(buildNexaPaymentUrl\(/);
  assert.match(tipJs, /const session = loadCachedSession\(\);[\s\S]*?if \(!session\)[\s\S]*?await beginLoginFlow\(game\);[\s\S]*?return;/);
  assert.doesNotMatch(tipJs, /window\.confirm\(/);
  assert.match(tipJs, /const RESET_STATUS_DELAY_MS = 3000;/);
  assert.match(tipJs, /setStatus\('支付失败', 'error'\);/);
  assert.match(tipJs, /window\.setTimeout\(\(\) => \{[\s\S]*?clearPendingOrder\(\);[\s\S]*?setStatus\('', ''\);[\s\S]*?updateButtonState\(\);[\s\S]*?\}, RESET_STATUS_DELAY_MS\);/);
  assert.match(tipJs, /window\.dispatchEvent\(new CustomEvent\('claw800:tip-success'/);
  assert.doesNotMatch(tipJs, /game-tip__eyebrow">Nexa 打赏/);
  assert.match(tipJs, /function getTipTitle\(game\)/);
  assert.match(tipJs, /if \(String\(game\?\.slug \|\| ''\)\.trim\(\) === 'muyu'\) return '打赏\+功德';/);
  assert.match(tipJs, /return '喜欢这个小游戏？';/);
  assert.match(tipJs, /\.balloons-shell/);
  assert.match(tipJs, /首次需要授权登录,再次点击打赏即可\./);
  assert.match(tipJs, /descEl\.hidden = Boolean\(session\);/);
  assert.match(tipJs, /setStatus\('已连接 Nexa 账号，后续可直接打赏。', 'success'\);/);
  assert.match(tipJs, /setStatus\('请在 Nexa 中输入六位支付密码完成余额支付。', ''\);/);
  assert.match(tipJs, /if \(isNexaSessionExpiredError\(error\)\) \{[\s\S]*?clearCachedSession\(\);[\s\S]*?setStatus\('Nexa 登录已过期，请重新登录后再打赏。', 'error'\);/);
});

test('fortune game shows a success alert after tip payment succeeds', () => {
  assert.match(fortuneJs, /window\.addEventListener\('claw800:tip-success'/);
  assert.match(fortuneJs, /if \(String\(event\.detail\?\.gameSlug \|\| ''\)\.trim\(\) !== 'fortune'\) return;/);
  assert.match(fortuneJs, /window\.alert\('谢谢打赏，您今天一定行大运发大财!'\);/);
});
