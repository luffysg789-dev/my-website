const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const configPath = path.join(rootDir, 'public', 'games-config.js');
const dbPath = path.join(rootDir, 'src', 'db.js');
const serverPath = path.join(rootDir, 'src', 'server.js');
const htmlPath = path.join(rootDir, 'public', 'tigang-master', 'index.html');
const cssPath = path.join(rootDir, 'public', 'tigang-master', 'style.css');
const jsPath = path.join(rootDir, 'public', 'tigang-master', 'script.js');

test('tigang-master game files exist', () => {
  assert.equal(fs.existsSync(htmlPath), true);
  assert.equal(fs.existsSync(cssPath), true);
  assert.equal(fs.existsSync(jsPath), true);
});

test('tigang-master is listed in frontend config and backend defaults', () => {
  const config = fs.readFileSync(configPath, 'utf8');
  const db = fs.readFileSync(dbPath, 'utf8');
  const server = fs.readFileSync(serverPath, 'utf8');

  assert.match(config, /slug:\s*'tigang-master'/);
  assert.match(config, /name:\s*'提肛大师'/);
  assert.match(config, /route:\s*'\/tigang-master\/'/);
  assert.match(db, /slug:\s*'tigang-master'/);
  assert.match(server, /'tigang-master':\s*'\/tigang-master\/'/);
});

test('tigang-master html includes home and records tabs plus the squeeze button', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');

  assert.match(html, /<title>Claw800 提肛大师<\/title>/);
  assert.match(html, /data-tigang-app/);
  assert.match(html, /\/game-tip\.css\?v=20260321-01/);
  assert.match(html, /\/game-tip\.js\?v=20260321-01/);
  assert.match(html, /class="tigang-back" href="\/games\.html" aria-label="返回游戏大全" title="返回游戏大全"/);
  assert.match(html, /id="tigangLanguageToggle"/);
  assert.match(html, /data-tab="home"/);
  assert.match(html, /data-tab="records"/);
  assert.match(html, /id="tigangActionButton"/);
  assert.match(html, /id="tigangStatusText"/);
  assert.match(html, /id="tigangTimerValue"/);
  assert.match(html, /id="tigangReminderText"/);
  assert.match(html, /id="tigangTodayCount"/);
  assert.match(html, /id="tigangTodayGoal"/);
  assert.match(html, /id="tigangRecentList"/);
  assert.match(html, /id="tigangRecordList"/);
  assert.match(html, /data-game-tip-root/);
});

test('tigang-master script keeps local record state without page-level Nexa auth hooks', () => {
  const js = fs.readFileSync(jsPath, 'utf8');

  assert.match(js, /const TIGANG_STORAGE_KEY = 'claw800:tigang-master:records';/);
  assert.match(js, /const TIGANG_LANGUAGE_STORAGE_KEY = 'claw800:tigang-master:language';/);
  assert.match(js, /const DAILY_GOAL_COUNT = 5;/);
  assert.match(js, /const TRANSLATIONS = \{/);
  assert.match(js, /zh:/);
  assert.match(js, /en:/);
  assert.match(js, /function applyLanguage\(/);
  assert.match(js, /function loadTigangRecords\(/);
  assert.match(js, /function saveTigangRecords\(/);
  assert.match(js, /function createTigangEntry\(/);
  assert.match(js, /function buildTodaySummary\(/);
  assert.match(js, /function groupRecordsByDay\(/);
  assert.match(js, /slice\(0,\s*5\)/);
  assert.match(js, /const FIRST_DAILY_CHEER_TEXT = '哇，你太棒了。坚持哦。';/);
  assert.match(js, /const DAILY_GOAL_CHEER_TEXT = '哇，恭喜你又健康了，希望你分享给更多朋友，一起健康。';/);
  assert.match(js, /function setInlineReminder\(/);
  assert.match(js, /function renderInlineReminder\(/);
  assert.doesNotMatch(js, /function speakText\(/);
  assert.doesNotMatch(js, /function resolveSpeechVoice\(/);
  assert.doesNotMatch(js, /function warmSpeechSynthesis\(/);
  assert.doesNotMatch(js, /function speakFirstDailyCheer\(/);
  assert.doesNotMatch(js, /function speakDailyGoalCheer\(/);
  assert.doesNotMatch(js, /function beginNexaLoginFlow\(/);
  assert.doesNotMatch(js, /\/api\/tigang-master\/session/);
  assert.doesNotMatch(js, /\/api\/tigang-master\/session\/logout/);
  assert.doesNotMatch(js, /\/api\/nexa\/tip\/session/);
  assert.doesNotMatch(js, /claw800:tigang-master:nexa-session/);
  assert.match(js, /function handlePressStart\(/);
  assert.match(js, /function handlePressEnd\(/);
  assert.match(js, /appState\.elements\.reminderText/);
});

test('tigang-master hides the inactive tab panel so the squeeze button does not appear on records', () => {
  const css = fs.readFileSync(cssPath, 'utf8');

  assert.match(css, /\.tigang-panel\[hidden\]\s*\{\s*display:\s*none;/);
});

test('tigang-master header includes a back button and a bottom game tip slot', () => {
  const css = fs.readFileSync(cssPath, 'utf8');

  assert.match(css, /\.tigang-header-left\s*\{/);
  assert.match(css, /\.tigang-back\s*\{[\s\S]*width:\s*42px;[\s\S]*height:\s*42px;/);
  assert.match(css, /\.tigang-tip-slot\s*\{/);
});

test('tigang-master squeeze button disables text selection and long-press callout behavior', () => {
  const css = fs.readFileSync(cssPath, 'utf8');
  const js = fs.readFileSync(jsPath, 'utf8');

  assert.match(css, /\.tigang-action-button\s*\{[\s\S]*-webkit-touch-callout:\s*none;/);
  assert.match(css, /\.tigang-action-button\s*\{[\s\S]*user-select:\s*none;/);
  assert.match(css, /\.tigang-action-button\s*\{[\s\S]*touch-action:\s*manipulation;/);
  assert.match(js, /addEventListener\('contextmenu',/);
  assert.match(js, /addEventListener\('selectstart',/);
  assert.match(js, /addEventListener\('dragstart',/);
});
