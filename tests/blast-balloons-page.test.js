const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const htmlPath = path.join(rootDir, 'public', 'blast-balloons', 'index.html');
const cssPath = path.join(rootDir, 'public', 'blast-balloons', 'style.css');
const jsPath = path.join(rootDir, 'public', 'blast-balloons', 'script.js');
const configPath = path.join(rootDir, 'public', 'games-config.js');
const dbPath = path.join(rootDir, 'src', 'db.js');
const serverPath = path.join(rootDir, 'src', 'server.js');

test('blast balloons game files exist', () => {
  assert.equal(fs.existsSync(htmlPath), true);
  assert.equal(fs.existsSync(cssPath), true);
  assert.equal(fs.existsSync(jsPath), true);
});

test('blast balloons game is listed in config, db defaults, and server route map', () => {
  const config = fs.readFileSync(configPath, 'utf8');
  const db = fs.readFileSync(dbPath, 'utf8');
  const server = fs.readFileSync(serverPath, 'utf8');

  assert.match(config, /slug:\s*'blast-balloons'/);
  assert.match(config, /route:\s*'\/blast-balloons\/'/);
  assert.match(config, /name:\s*'爆炸游戏'/);
  assert.match(config, /'blast-balloons':\s*'开始游戏'/);
  assert.match(db, /slug:\s*'blast-balloons'/);
  assert.match(server, /'blast-balloons':\s*'\/blast-balloons\/'/);
});

test('blast balloons html includes setup overlay, board, and end controls', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');

  assert.match(html, /id="balloonsBoard"/);
  assert.match(html, /id="balloonsBombsLeft"/);
  assert.match(html, /id="balloonsSafeLeft"/);
  assert.match(html, /id="balloonsOverlay"/);
  assert.match(html, /id="balloonsBombCountValue"/);
  assert.match(html, /id="balloonsBombCountRange"[\s\S]*min="1"[\s\S]*max="49"/);
  assert.match(html, /id="balloonsStartBtn"/);
  assert.match(html, /id="balloonsReplayBtn"/);
  assert.match(html, /id="balloonsResetSetupBtn"/);
  assert.match(html, /game-tip\.css\?v=/);
  assert.match(html, /game-tip\.js\?v=/);
});

test('blast balloons script includes 50-balloon gameplay, bomb setup, and audio logic', () => {
  const js = fs.readFileSync(jsPath, 'utf8');

  assert.match(js, /const TOTAL_BALLOONS = 50;/);
  assert.match(js, /const MAX_BOMB_COUNT = 49;/);
  assert.match(js, /const DEFAULT_BOMB_COUNT = 6;/);
  assert.match(js, /const EXPLOSION_DURATION = 0\.96;/);
  assert.match(js, /const EXPLOSION_GAIN = 0\.58;/);
  assert.match(js, /function createBombIndexes\(/);
  assert.match(js, /function playPopSound\(/);
  assert.match(js, /function playExplosionSound\(/);
  assert.match(js, /button\.innerHTML = '<span class="balloon-cell__bomb" aria-hidden="true">💣<\/span>';/);
  assert.match(js, /ui\.board\.classList\.add\('has-bomb-flash'\);/);
  assert.match(js, /window\.setTimeout\(\(\) => \{[\s\S]*?ui\.board\.classList\.remove\('has-bomb-flash'\);[\s\S]*?\}, 520\);/);
  assert.match(js, /function handleBalloonPress\(/);
  assert.match(js, /function startGame\(/);
  assert.match(js, /function finishGame\(/);
  assert.match(js, /remainingBombs <= 0/);
  assert.match(js, /window\.ClawGamesConfig\?\.bootstrapGamePage\?\.?\('blast-balloons'\)/);
});

test('blast balloons css uses responsive grid and centered overlay card', () => {
  const css = fs.readFileSync(cssPath, 'utf8');

  assert.match(css, /\.balloons-board\s*\{[\s\S]*display:\s*grid;/);
  assert.match(css, /grid-template-columns:\s*repeat\(10,\s*minmax\(0,\s*1fr\)\);/);
  assert.match(css, /\.balloons-stat\s*\{[\s\S]*display:\s*flex;[\s\S]*align-items:\s*center;[\s\S]*justify-content:\s*space-between;/);
  assert.match(css, /\.balloons-stat span\s*\{[\s\S]*font-size:\s*24px;[\s\S]*font-weight:\s*700;/);
  assert.match(css, /\.balloons-stat strong\s*\{[\s\S]*font-size:\s*24px;/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*\.balloons-shell\s*\{[\s\S]*padding:\s*8px;[\s\S]*?\}[\s\S]*\.balloons-board-wrap\s*\{[\s\S]*padding:\s*6px;[\s\S]*?\}[\s\S]*\.balloons-board\s*\{[\s\S]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\);[\s\S]*width:\s*min\(100%,\s*308px\);[\s\S]*margin:\s*0 auto;[\s\S]*gap:\s*5px;[\s\S]*min-height:\s*auto;/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*\.balloons-stat strong\s*\{[\s\S]*font-size:\s*22px;/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*\.balloons-stat span\s*\{[\s\S]*font-size:\s*22px;/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*\.balloons-header h2\s*\{[\s\S]*display:\s*none;/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*\.balloons-overlay\s*\{[\s\S]*align-items:\s*start;[\s\S]*padding:\s*10px 8px;[\s\S]*background:\s*rgba\(235,\s*247,\s*255,\s*0\.18\);/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*\.balloons-overlay__card\s*\{[\s\S]*width:\s*min\(280px,\s*calc\(100% - 104px\)\);[\s\S]*padding:\s*14px 12px 12px;[\s\S]*border-radius:\s*18px;/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*\.balloons-overlay__title\s*\{[\s\S]*font-size:\s*22px;/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*\.balloons-setup__value strong\s*\{[\s\S]*font-size:\s*28px;/);
  assert.match(css, /\.balloon-cell\s*\{[\s\S]*aspect-ratio:\s*1;[\s\S]*border-radius:\s*50%;/);
  assert.match(css, /\.balloon-cell::before\s*\{[\s\S]*bottom:\s*-12px;[\s\S]*height:\s*14px;/);
  assert.match(css, /\.balloon-cell::after\s*\{[\s\S]*left:\s*22%;[\s\S]*top:\s*16%;[\s\S]*width:\s*20%;[\s\S]*height:\s*30%;/);
  assert.match(css, /\.balloon-cell__bomb\s*\{[\s\S]*font-size:\s*clamp\(24px,\s*4vw,\s*34px\);/);
  assert.match(css, /\.balloon-cell\.is-bomb-hit\s*\{[\s\S]*opacity:\s*1;/);
  assert.match(css, /@keyframes balloon-bomb[\s\S]*100%\s*\{[\s\S]*transform:\s*scale\(0\.94\);[\s\S]*opacity:\s*1;/);
  assert.match(css, /\.balloon-cell\.is-bomb-hit::before\s*\{[\s\S]*display:\s*none;/);
  assert.match(css, /\.balloon-cell\.is-bomb-hit::after\s*\{[\s\S]*width:\s*140%;[\s\S]*height:\s*140%;/);
  assert.match(css, /\.balloons-board\.has-bomb-flash\s*\{[\s\S]*background:/);
  assert.match(css, /\.balloons-board\.has-bomb-flash::before\s*\{[\s\S]*content:\s*"";/);
  assert.match(css, /\.balloons-board\.has-bomb-flash::after\s*\{[\s\S]*content:\s*"💣 💣 💣/);
  assert.match(css, /animation:\s*balloons-board-shake 360ms ease-in-out;/);
  assert.match(css, /\.balloons-overlay\s*\{[\s\S]*position:\s*absolute;[\s\S]*inset:\s*0;/);
  assert.match(css, /\.balloons-overlay__card\s*\{[\s\S]*width:\s*min\(360px,\s*calc\(100% - 24px\)\);/);
  assert.match(css, /@media \(max-width: 420px\)[\s\S]*\.balloons-board\s*\{[\s\S]*width:\s*min\(100%,\s*286px\);[\s\S]*gap:\s*4px;/);
  assert.match(css, /@media \(max-width: 420px\)[\s\S]*\.balloons-overlay__card\s*\{[\s\S]*width:\s*min\(250px,\s*calc\(100% - 118px\)\);[\s\S]*padding:\s*12px 10px 10px;[\s\S]*border-radius:\s*16px;/);
});
