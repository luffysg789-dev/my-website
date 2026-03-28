const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const config = fs.readFileSync(path.join(rootDir, 'public', 'games-config.js'), 'utf8');
const css = fs.readFileSync(path.join(rootDir, 'public', 'styles.css'), 'utf8');
const gamesHtml = fs.readFileSync(path.join(rootDir, 'public', 'games.html'), 'utf8');

test('games page uses unified start button text for all game cards', () => {
  assert.match(config, /gomoku:\s*'开始游戏'/);
  assert.match(config, /minesweeper:\s*'开始游戏'/);
  assert.match(config, /fortune:\s*'开始游戏'/);
  assert.match(config, /muyu:\s*'开始游戏'/);
});

test('games page loads the latest game config bundle and keeps piano cards on /piano/', () => {
  assert.match(gamesHtml, /<script src="\/games-config\.js\?v=20260328-02"><\/script>/);
  assert.match(config, /slug:\s*'piano'[\s\S]*route:\s*'\/piano\/'/);
  assert.match(config, /if \(fallback\.route\) \{[\s\S]*const legacyRoute = `\/games\/\$\{encodeURIComponent\(slug\)\}`;[\s\S]*if \(!route \|\| route === legacyRoute\) route = fallback\.route;/);
});

test('games page cards stretch body and keep actions aligned at the bottom', () => {
  assert.match(css, /\.game-card\s*\{[\s\S]*display:\s*flex;[\s\S]*flex-direction:\s*column;/);
  assert.match(css, /\.game-card__body\s*\{[\s\S]*flex:\s*1 1 auto;/);
  assert.match(css, /\.game-card__actions\s*\{[\s\S]*margin-top:\s*auto;/);
});
