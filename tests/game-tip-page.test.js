const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const serverJs = fs.readFileSync(path.join(rootDir, 'src', 'server.js'), 'utf8');
const tipJsPath = path.join(rootDir, 'public', 'game-tip.js');
const tipCssPath = path.join(rootDir, 'public', 'game-tip.css');

const pages = [
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
  assert.match(css, /\.game-tip__button\s*\{[\s\S]*min-height:\s*46px;/);
  assert.match(css, /@media \(min-width: 721px\)[\s\S]*?\.game-tip\s*\{[\s\S]*display:\s*none;/);
});

test('server exposes nexa tip endpoints', () => {
  assert.match(serverJs, /app\.post\('\/api\/nexa\/tip\/session'/);
  assert.match(serverJs, /app\.post\('\/api\/nexa\/tip\/create'/);
  assert.match(serverJs, /app\.post\('\/api\/nexa\/tip\/query'/);
  assert.match(serverJs, /app\.post\('\/api\/nexa\/tip\/notify'/);
});
