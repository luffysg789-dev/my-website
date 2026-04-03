const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const htmlPath = path.join(rootDir, 'public', 'gomoku', 'index.html');
const cssPath = path.join(rootDir, 'public', 'gomoku', 'style.css');
const jsPath = path.join(rootDir, 'public', 'gomoku', 'script.js');
const configPath = path.join(rootDir, 'public', 'games-config.js');
const dbPath = path.join(rootDir, 'src', 'db.js');

test('gomoku game files exist', () => {
  assert.equal(fs.existsSync(htmlPath), true);
  assert.equal(fs.existsSync(cssPath), true);
  assert.equal(fs.existsSync(jsPath), true);
});

test('gomoku game is listed in games config', () => {
  const config = fs.readFileSync(configPath, 'utf8');
  assert.match(config, /slug:\s*'gomoku'/);
  assert.match(config, /route:\s*'\/gomoku\/'/);
  assert.match(config, /name:\s*'五子棋'/);
});

test('gomoku is included in backend defaults and game page merges api items with defaults', () => {
  const config = fs.readFileSync(configPath, 'utf8');
  const db = fs.readFileSync(dbPath, 'utf8');
  const server = fs.readFileSync(path.join(rootDir, 'src', 'server.js'), 'utf8');

  assert.match(
    config,
    /const mergedBySlug = new Map\(DEFAULT_GAMES\.map\(\(item\) => \[item\.slug, \{ \.\.\.item \}\]\)\);[\s\S]*?mergedBySlug\.set\(normalized\.slug, normalized\);[\s\S]*?Array\.from\(mergedBySlug\.values\(\)\)/
  );
  assert.match(db, /slug:\s*'gomoku'/);
  assert.match(server, /gomoku:\s*'\/gomoku\/'/);
});

test('gomoku html includes setup controls and board canvas', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert.doesNotMatch(html, /Strategy Board/);
  assert.doesNotMatch(html, /id="gamePageTitle">五子棋<\/h1>/);
  assert.doesNotMatch(html, /最近一步/);
  assert.doesNotMatch(html, /落子后会显示坐标，并在棋盘上高亮最后一步。/);
  assert.doesNotMatch(html, /当前回合/);
  assert.doesNotMatch(html, /黑棋先手，准备开局。/);
  assert.doesNotMatch(html, /开始前设置/);
  assert.doesNotMatch(html, /先选模式，再开始对局/);
  assert.doesNotMatch(html, /操作区/);
  assert.doesNotMatch(html, /当前：人机对战，中级 AI，你执黑先手。/);
  assert.match(html, /id="gomokuOverlayModeHuman"/);
  assert.match(html, /id="gomokuOverlayModeAi"[\s\S]*?class="gomoku-choice is-active"/);
  assert.match(html, /id="gomokuOverlaySettings"/);
  assert.match(html, /id="gomokuDifficultyHigh"/);
  assert.match(html, /id="gomokuOrderSecond"/);
  assert.match(html, /id="gomokuBoard"/);
  assert.match(html, /id="gomokuBoardOverlay"/);
  assert.match(html, /id="gomokuBoardStartBtn"/);
  assert.match(html, /id="gomokuStatusTitle">等待<\/h2>/);
  assert.doesNotMatch(html, /id="gomokuModeBadge"/);
  assert.match(html, /id="gomokuUndoBtn"/);
  assert.match(html, /id="gomokuRestartBtn"/);
  assert.doesNotMatch(html, /gomoku-secondary-link/);
  assert.doesNotMatch(html, /gomoku-setup-card/);
});

test('gomoku old verbose description is removed from defaults', () => {
  const config = fs.readFileSync(configPath, 'utf8');
  const db = fs.readFileSync(dbPath, 'utf8');
  assert.doesNotMatch(config, /15x15 五子棋网页游戏，支持真人对战、人机对战、难度选择、悔棋与胜负判断。/);
  assert.doesNotMatch(db, /15x15 五子棋网页游戏，支持真人对战、人机对战、难度选择、悔棋与胜负判断。/);
});

test('gomoku script includes ai profiles and winner handling', () => {
  const js = fs.readFileSync(jsPath, 'utf8');
  assert.match(js, /const AI_LEVELS = \{/);
  assert.match(js, /mode:\s*'ai'/);
  assert.match(js, /function playStoneSound\(/);
  assert.match(js, /gomokuBoardOverlay/);
  assert.match(js, /gomokuOverlayModeHuman/);
  assert.match(js, /gomokuOverlayModeAi/);
  assert.match(js, /gomokuOverlaySettings/);
  assert.match(js, /if \(ui\.modeBadge\) \{\s*ui\.modeBadge\.textContent = modeLabel\(state\.mode\);/);
  assert.doesNotMatch(js, /Math\.max\(320,\s*Math\.min\(ui\.board\.parentElement\.clientWidth,\s*720\)\)/);
  assert.match(js, /function placeMove\([\s\S]*?render\(\);/);
  assert.match(js, /function chooseAiMove\(/);
  assert.match(js, /function checkWinner\(/);
  assert.match(js, /showResultModal\(/);
});

test('gomoku mobile css keeps board flush and overlay compact', () => {
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.match(css, /\.gomoku-canvas-wrap\s*\{[\s\S]*?padding:\s*0;[\s\S]*?background:\s*transparent;[\s\S]*?\}/);
  assert.match(css, /\.gomoku-board-overlay\s*\{[\s\S]*?inset:\s*0;[\s\S]*?\}/);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?\.gomoku-canvas-wrap\s*\{[\s\S]*?padding:\s*0;[\s\S]*?background:\s*transparent;[\s\S]*?\}/);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?\.gomoku-board-overlay__card\s*\{[\s\S]*?max-height:\s*calc\(100% - 8px\);[\s\S]*?overflow:\s*auto;[\s\S]*?\}/);
});
