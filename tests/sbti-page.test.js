const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const configPath = path.join(rootDir, 'public', 'games-config.js');
const dbPath = path.join(rootDir, 'src', 'db.js');
const serverPath = path.join(rootDir, 'src', 'server.js');
const htmlPath = path.join(rootDir, 'public', 'sbti', 'index.html');
const cssPath = path.join(rootDir, 'public', 'sbti', 'style.css');
const jsPath = path.join(rootDir, 'public', 'sbti', 'script.js');

test('sbti game files exist', () => {
  assert.equal(fs.existsSync(htmlPath), true);
  assert.equal(fs.existsSync(cssPath), true);
  assert.equal(fs.existsSync(jsPath), true);
});

test('sbti is listed in frontend config and backend defaults', () => {
  const config = fs.readFileSync(configPath, 'utf8');
  const db = fs.readFileSync(dbPath, 'utf8');
  const server = fs.readFileSync(serverPath, 'utf8');

  assert.match(config, /slug:\s*'sbti'/);
  assert.match(config, /name:\s*'SBTI'/);
  assert.match(config, /route:\s*'\/sbti\/'/);
  assert.match(db, /slug:\s*'sbti'/);
  assert.match(server, /'sbti':\s*'\/sbti\/'/);
});

test('sbti html includes intro, test, and result screens', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');

  assert.match(html, /<title>Claw800 SBTI<\/title>/);
  assert.match(html, /data-sbti-app/);
  assert.match(html, /id="sbtiIntroScreen"/);
  assert.match(html, /id="sbtiTestScreen"/);
  assert.match(html, /id="sbtiResultScreen"/);
  assert.match(html, /id="sbtiStartButton"/);
  assert.match(html, /id="sbtiQuestionList"/);
  assert.match(html, /id="sbtiProgressBar"/);
  assert.match(html, /id="sbtiSubmitButton"/);
  assert.match(html, /id="sbtiResultCode"/);
  assert.match(html, /id="sbtiRestartButton"/);
  assert.match(html, /\/sbti\/style\.css\?v=/);
  assert.match(html, /\/sbti\/script\.js\?v=/);
});

test('sbti script exposes quiz data and result rendering hooks', () => {
  const js = fs.readFileSync(jsPath, 'utf8');

  assert.match(js, /const SBTI_QUESTIONS = \[/);
  assert.match(js, /const SBTI_TYPES = \{/);
  assert.match(js, /function renderSbtiQuestions\(/);
  assert.match(js, /function updateSbtiProgress\(/);
  assert.match(js, /function computeSbtiResult\(/);
  assert.match(js, /function renderSbtiResult\(/);
  assert.match(js, /function restartSbtiQuiz\(/);
});

test('sbti css includes card layout and responsive mobile rules', () => {
  const css = fs.readFileSync(cssPath, 'utf8');

  assert.match(css, /\.sbti-shell\s*\{/);
  assert.match(css, /\.sbti-card\s*\{/);
  assert.match(css, /\.sbti-question-list\s*\{/);
  assert.match(css, /\.sbti-option\s*\{/);
  assert.match(css, /\.sbti-result-grid\s*\{/);
  assert.match(css, /@media \(max-width:\s*720px\)/);
});
