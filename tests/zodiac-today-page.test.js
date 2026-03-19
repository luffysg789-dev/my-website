const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const htmlPath = path.join(rootDir, 'public', 'zodiac-today', 'index.html');
const cssPath = path.join(rootDir, 'public', 'zodiac-today', 'style.css');
const jsPath = path.join(rootDir, 'public', 'zodiac-today', 'script.js');
const configPath = path.join(rootDir, 'public', 'games-config.js');
const dbPath = path.join(rootDir, 'src', 'db.js');
const serverPath = path.join(rootDir, 'src', 'server.js');

test('zodiac today game files exist', () => {
  assert.equal(fs.existsSync(htmlPath), true);
  assert.equal(fs.existsSync(cssPath), true);
  assert.equal(fs.existsSync(jsPath), true);
});

test('zodiac today game is listed in config, db defaults, and server route map', () => {
  const config = fs.readFileSync(configPath, 'utf8');
  const db = fs.readFileSync(dbPath, 'utf8');
  const server = fs.readFileSync(serverPath, 'utf8');

  assert.match(config, /slug:\s*'zodiac-today'/);
  assert.match(config, /name:\s*'今日星座运势'/);
  assert.match(config, /route:\s*'\/zodiac-today\/'/);
  assert.match(config, /'zodiac-today':\s*'开始游戏'/);
  assert.match(db, /slug:\s*'zodiac-today'/);
  assert.match(server, /'zodiac-today':\s*'\/zodiac-today\/'/);
});

test('zodiac today html includes name form, birthday input, and analysis sections', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');

  assert.match(html, /class="zodiac-stars"/);
  assert.match(html, /class="zodiac-stars zodiac-stars--hero"/);
  assert.match(html, /id="zodiacNameInput"/);
  assert.match(html, /id="zodiacBirthdayInput"/);
  assert.match(html, /id="zodiacBirthdayInput"[\s\S]*type="text"/);
  assert.match(html, /placeholder="YYYY-MM-DD"/);
  assert.match(html, /inputmode="numeric"/);
  assert.match(html, /pattern="\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$"/);
  assert.match(html, /id="zodiacSubmitBtn"/);
  assert.match(html, /id="zodiacResult"/);
  assert.match(html, /id="zodiacSignName"/);
  assert.match(html, /id="zodiacSummary"/);
  assert.match(html, /id="zodiacLove"/);
  assert.match(html, /id="zodiacCareer"/);
  assert.match(html, /id="zodiacWealth"/);
  assert.match(html, /id="zodiacHealth"/);
  assert.match(html, /id="zodiacSocial"/);
  assert.match(html, /id="zodiacLuckyColor"/);
  assert.match(html, /id="zodiacLuckyNumber"/);
  assert.match(html, /id="zodiacAdvice"/);
  assert.match(html, /game-tip\.css\?v=/);
  assert.match(html, /game-tip\.js\?v=/);
});

test('zodiac today script includes zodiac resolution and seeded daily analysis', () => {
  const js = fs.readFileSync(jsPath, 'utf8');

  assert.match(js, /const ZODIAC_SIGNS = \[/);
  assert.match(js, /const ANALYSIS_DIMENSIONS = \[/);
  assert.match(js, /const STORAGE_KEY = 'claw800_zodiac_today_state_v1';/);
  assert.match(js, /function getZodiacSign\(/);
  assert.match(js, /function createSeedFromProfile\(/);
  assert.match(js, /function createSeededRandom\(/);
  assert.match(js, /function normalizeBirthdayInput\(/);
  assert.match(js, /function isValidBirthday\(/);
  assert.match(js, /function buildDailyReading\(/);
  assert.match(js, /function renderReading\(/);
  assert.match(js, /name: '白羊座'/);
  assert.match(js, /name: '双鱼座'/);
  assert.match(js, /window\.ClawGamesConfig\?\.bootstrapGamePage\?\.?\('zodiac-today'\)/);
});

test('zodiac today css uses a responsive form and multi-card result layout', () => {
  const css = fs.readFileSync(cssPath, 'utf8');

  assert.match(css, /--zodiac-night:/);
  assert.match(css, /\.zodiac-shell::before/);
  assert.match(css, /\.zodiac-stars/);
  assert.match(css, /@keyframes zodiacTwinkle/);
  assert.match(css, /\.zodiac-form\s*\{[\s\S]*display:\s*grid;/);
  assert.match(css, /\.zodiac-result-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/);
  assert.match(css, /\.zodiac-shell\s*\{[\s\S]*border-radius:\s*28px;/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*\.zodiac-form\s*\{[\s\S]*grid-template-columns:\s*1fr;/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*\.zodiac-result-grid\s*\{[\s\S]*grid-template-columns:\s*1fr;/);
});
