const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const configPath = path.join(rootDir, 'public', 'games-config.js');
const dbPath = path.join(rootDir, 'src', 'db.js');
const serverPath = path.join(rootDir, 'src', 'server.js');
const htmlPath = path.join(rootDir, 'public', 'nchat', 'index.html');
const cssPath = path.join(rootDir, 'public', 'nchat', 'style.css');
const jsPath = path.join(rootDir, 'public', 'nchat', 'script.js');
const carnivalScriptPath = path.join(rootDir, 'public', 'hk-web3-carnival', 'script.js');

test('nchat is wired as a standalone Nexa-only app route', () => {
  const config = fs.readFileSync(configPath, 'utf8');
  const db = fs.readFileSync(dbPath, 'utf8');
  const server = fs.readFileSync(serverPath, 'utf8');

  assert.match(config, /slug:\s*'nchat'/);
  assert.match(config, /name:\s*'Nchat'/);
  assert.match(config, /route:\s*'\/nchat\/'/);
  assert.match(config, /showInGamesHub:\s*0/);
  assert.match(db, /slug:\s*'nchat'/);
  assert.match(server, /'nchat':\s*'\/nchat\/'/);
});

test('nchat html includes app shell, tabs, and profile setup hooks', () => {
  assert.equal(fs.existsSync(htmlPath), true);
  const html = fs.readFileSync(htmlPath, 'utf8');

  assert.match(html, /<title>Claw800 Nchat<\/title>/);
  assert.match(html, /data-nchat-app/);
  assert.match(html, /id="nchatGuard"/);
  assert.match(html, /id="nchatChatPanel"/);
  assert.match(html, /id="nchatMePanel"/);
  assert.match(html, /data-tab-target="chat"/);
  assert.match(html, /data-tab-target="me"/);
  assert.match(html, /id="nchatSearchInput"/);
  assert.match(html, /id="nchatConversationList"/);
  assert.match(html, /id="nchatSearchResults"/);
  assert.match(html, /id="nchatConversationView"/);
  assert.match(html, /id="nchatMessageList"/);
  assert.match(html, /id="nchatComposerInput"/);
  assert.match(html, /id="nchatProfileSetupModal"/);
  assert.match(html, /id="nchatProfileAvatarInput"/);
  assert.match(html, /id="nchatProfileNicknameInput"/);
  assert.match(html, /id="nchatProfileFeedback"/);
  assert.match(html, /id="nchatMyAvatar"/);
  assert.match(html, /id="nchatMyNickname"/);
  assert.match(html, /id="nchatMyChatId"/);
  assert.match(html, /id="nchatProfileEditButton"/);
  assert.match(html, /id="nchatProfileAvatarPreview"/);
  assert.match(html, /\/nchat\/style\.css\?v=20260418-01/);
  assert.match(html, /\/nchat\/script\.js\?v=20260418-01/);
});

test('nchat css defines mobile app shell, bottom nav, unread badge, and conversation layout', () => {
  assert.equal(fs.existsSync(cssPath), true);
  const css = fs.readFileSync(cssPath, 'utf8');

  assert.match(css, /--nchat-accent:/);
  assert.match(css, /\.nchat-app\s*\{/);
  assert.match(css, /\.nchat-app \[hidden\]\s*\{[\s\S]*display:\s*none !important;/);
  assert.match(css, /\.nchat-panel\s*\{/);
  assert.match(css, /\.nchat-profile-card__actions\s*\{/);
  assert.match(css, /\.nchat-profile-feedback\s*\{/);
  assert.match(css, /\.nchat-profile-preview\s*\{/);
  assert.match(css, /\.nchat-nav\s*\{/);
  assert.match(css, /\.nchat-message-block__time\s*\{/);
  assert.match(css, /\.nchat-nav__item\.is-active/);
  assert.match(css, /\.nchat-conversation-list\s*\{/);
  assert.match(css, /\.nchat-conversation-row\s*\{/);
  assert.match(css, /\.nchat-unread-badge\s*\{/);
  assert.match(css, /\.nchat-message\.is-pending\s*\{/);
  assert.match(css, /\.nchat-modal\[hidden\]\s*\{[\s\S]*display:\s*none;/);
  assert.match(css, /@media \(max-width:\s*720px\)/);
});

test('nchat script includes nexaauth, session/bootstrap/search/message, and realtime hooks', () => {
  assert.equal(fs.existsSync(jsPath), true);
  const js = fs.readFileSync(jsPath, 'utf8');

  assert.match(js, /const NEXA_PROTOCOL_AUTH_BASE = 'nexaauth:\/\/oauth\/authorize';/);
  assert.match(js, /const NCHAT_SESSION_STORAGE_KEY = 'claw800:nchat:nexa-session';/);
  assert.match(js, /const NCHAT_LOCAL_PROFILE_ID_STORAGE_KEY = 'claw800:nchat:local-profile-id';/);
  assert.match(js, /const NCHAT_LOCAL_PROFILE_STORAGE_KEY = 'claw800:nchat:local-profile';/);
  assert.match(js, /const NCHAT_LOCAL_DEMO_MESSAGES_STORAGE_KEY = 'claw800:nchat:local-demo-messages';/);
  assert.match(js, /function beginNexaLoginFlow\(/);
  assert.match(js, /function ensureLocalPreviewSession\(/);
  assert.match(js, /function loadLocalPreviewProfile\(/);
  assert.match(js, /function applyLocalPreviewBootstrap\(/);
  assert.match(js, /function appendLocalDemoMessage\(/);
  assert.match(js, /clearCachedSession\(state\.storage\);/);
  assert.match(js, /const localPreview = isLocalPreview\(\);/);
  assert.match(js, /const authCode = extractAuthCodeFromUrl\(\);/);
  assert.match(js, /if \(!localPreview && !authCode\) \{[\s\S]*clearCachedSession\(state\.storage\);[\s\S]*await clearServerSession\(\);[\s\S]*await beginNexaLoginFlow\(\)\.catch\(\(\) => \{\}\);[\s\S]*return;/);
  assert.match(js, /async function clearServerSession\(\)/);
  assert.match(js, /本地测试/);
  assert.match(js, /function setProfileFeedback\(/);
  assert.match(js, /\/api\/nchat\/session/);
  assert.match(js, /\/api\/nchat\/bootstrap/);
  assert.match(js, /\/api\/nchat\/profile/);
  assert.match(js, /\/api\/nchat\/search/);
  assert.match(js, /\/api\/nchat\/friends/);
  assert.match(js, /\/api\/nchat\/conversations\/.*\/messages/);
  assert.match(js, /\/api\/nchat\/conversations\/.*\/read/);
  assert.match(js, /\/api\/nchat\/events/);
  assert.match(js, /renderConversationList/);
  assert.match(js, /function upsertConversation\(/);
  assert.match(js, /function createOptimisticMessage\(/);
  assert.match(js, /button\.textContent = '连接中\.\.\.'/);
  assert.match(js, /state\.messages = \[\.\.\.\(state\.messages \|\| \[\]\), pendingMessage\]/);
  assert.match(js, /refreshBootstrap\(state\)\.catch\(\(\) => null\)/);
  assert.match(js, /applyUnreadBadge/);
  assert.match(js, /nchat-message-block__time/);
  assert.match(js, /我的客服/);
  assert.match(js, /demo-support/);
  assert.match(js, /请在 Nexa App 内打开 Nchat/);
});

test('hk carnival script recalculates event state from start and end time and refreshes hourly', () => {
  assert.equal(fs.existsSync(carnivalScriptPath), true);
  const js = fs.readFileSync(carnivalScriptPath, 'utf8');

  assert.match(js, /function parseEventDateTime\(/);
  assert.match(js, /function getComputedEventState\(/);
  assert.match(js, /if \(endTime\.getTime\(\) < startTime\.getTime\(\)\) \{/);
  assert.match(js, /endTime\.setDate\(endTime\.getDate\(\) \+ 1\);/);
  assert.match(js, /const matchesState = !stateValue \|\| String\(getComputedEventState\(item\)\) === stateValue;/);
  assert.match(js, /const status = statusMap\[getComputedEventState\(item\)\] \|\| statusMap\[1\];/);
  assert.match(js, /globalThis\.setInterval\(\(\) => \{/);
  assert.match(js, /applyFilters\(\);/);
  assert.match(js, /60 \* 60 \* 1000/);
});
