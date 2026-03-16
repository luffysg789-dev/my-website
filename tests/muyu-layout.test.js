const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'muyu.html'), 'utf8');

test('woodfish page uses 总功德 in the hero board', () => {
  assert.match(html, /<span>总功德<\/span>/);
});

test('woodfish page no longer renders lower total merit card', () => {
  assert.doesNotMatch(html, /id="muyuTotalCount"/);
  assert.match(html, /id="muyuTodayCount"/);
  assert.match(html, /id="muyuMusicToggleBtn"/);
  assert.match(html, /id="muyuResetBtn"/);
});
