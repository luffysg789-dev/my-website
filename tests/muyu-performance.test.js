const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'muyu.html'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, '..', 'public', 'muyu.js'), 'utf8');

test('woodfish page uses dedicated lightweight stylesheet', () => {
  assert.match(html, /href="\/muyu\.css\?v=/);
  assert.doesNotMatch(html, /href="\/styles\.css\?v=/);
});

test('woodfish page no longer loads shared games bootstrap script', () => {
  assert.doesNotMatch(html, /src="\/games-config\.js\?v=/);
});

test('woodfish boot uses lightweight bootstrap config first', () => {
  assert.match(js, /fetchBootstrapConfig/);
  assert.match(js, /\/api\/games\/\$\{encodeURIComponent\(GAME_SLUG\)\}\/bootstrap/);
});

test('woodfish boot avoids heavy cached full-config parsing on load', () => {
  assert.match(js, /MAX_INLINE_GAME_CONFIG_CACHE_SIZE/);
  assert.match(js, /window\.localStorage\.removeItem\(GAME_CONFIG_CACHE_KEY\)/);
  assert.match(js, /background_music_file:\s*''/);
});

test('woodfish bootstrap payload stays lightweight and strips inline assets', () => {
  const serverJs = fs.readFileSync(path.join(__dirname, '..', 'src', 'server.js'), 'utf8');
  assert.match(serverJs, /function toLightweightGameAssetRef/);
  assert.match(serverJs, /cover_image:\s*toLightweightGameAssetRef\(row\.cover_image\)/);
  assert.match(serverJs, /secondary_image:\s*toLightweightGameAssetRef\(row\.secondary_image\)/);
});
