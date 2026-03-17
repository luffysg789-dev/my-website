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

test('woodfish page no longer preloads legacy fallback images on first paint', () => {
  assert.doesNotMatch(html, /rel="preload" as="image" href="\/assets\/muyu-fish\.svg"/);
  assert.doesNotMatch(html, /rel="preload" as="image" href="\/assets\/muyu-mallet\.svg"/);
});

test('woodfish page uses fixed server mallet asset as fallback image', () => {
  assert.match(html, /data-default-src="\/assets\/muyu-mallet-fixed\.png"/);
  assert.match(js, /const DEFAULT_MALLET_IMAGE_SRC = '\/assets\/muyu-mallet-fixed\.png';/);
});

test('woodfish page uses fixed server fish asset as fallback image', () => {
  assert.match(html, /data-default-src="\/assets\/muyu-fish-fixed\.webp"/);
  assert.match(js, /const DEFAULT_FISH_IMAGE_SRC = '\/assets\/muyu-fish-fixed\.webp';/);
});

test('woodfish page always prefers fixed fish and mallet assets over remote config images', () => {
  assert.match(js, /const fishImage = DEFAULT_FISH_IMAGE_SRC;/);
  assert.match(js, /const malletImage = DEFAULT_MALLET_IMAGE_SRC;/);
  assert.doesNotMatch(js, /const fishImage = config\.cover_image/);
  assert.doesNotMatch(js, /const malletImage = config\.secondary_image/);
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
