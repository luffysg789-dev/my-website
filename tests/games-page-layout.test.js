const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const config = fs.readFileSync(path.join(rootDir, 'public', 'games-config.js'), 'utf8');
const css = fs.readFileSync(path.join(rootDir, 'public', 'styles.css'), 'utf8');

test('games page uses unified start button text for all game cards', () => {
  assert.match(config, /gomoku:\s*'开始游戏'/);
  assert.match(config, /minesweeper:\s*'开始游戏'/);
  assert.match(config, /fortune:\s*'开始游戏'/);
  assert.match(config, /muyu:\s*'开始游戏'/);
});

test('games page cards stretch body and keep actions aligned at the bottom', () => {
  assert.match(css, /\.game-card\s*\{[\s\S]*display:\s*flex;[\s\S]*flex-direction:\s*column;/);
  assert.match(css, /\.game-card__body\s*\{[\s\S]*flex:\s*1 1 auto;/);
  assert.match(css, /\.game-card__actions\s*\{[\s\S]*margin-top:\s*auto;/);
});
