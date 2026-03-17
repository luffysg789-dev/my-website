const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'muyu.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'muyu.css'), 'utf8');

test('woodfish page uses 总功德 in the hero board', () => {
  assert.match(html, /<span>总功德<\/span>/);
});

test('woodfish page no longer renders lower total merit card', () => {
  assert.doesNotMatch(html, /id="muyuTotalCount"/);
  assert.match(html, /id="muyuTodayCount"/);
  assert.match(html, /id="muyuMusicToggleBtn"/);
  assert.match(html, /id="muyuResetBtn"/);
});

test('woodfish mobile mallet uses larger responsive sizing and higher placement', () => {
  assert.match(
    css,
    /@media \(max-width: 720px\)[\s\S]*?\.muyu-mallet\s*\{[\s\S]*?right:\s*14%;[\s\S]*?top:\s*12px;[\s\S]*?width:\s*clamp\(108px,\s*26vw,\s*138px\);[\s\S]*?\}/
  );
  assert.match(
    css,
    /@media \(max-width: 480px\)[\s\S]*?\.muyu-mallet\s*\{[\s\S]*?right:\s*11%;[\s\S]*?top:\s*18px;[\s\S]*?width:\s*clamp\(118px,\s*31vw,\s*148px\);[\s\S]*?\}/
  );
  assert.match(
    css,
    /\.muyu-wood\.is-striking \.muyu-mallet\s*\{[\s\S]*?translate\(-10px,\s*18px\);[\s\S]*?\}/
  );
});
