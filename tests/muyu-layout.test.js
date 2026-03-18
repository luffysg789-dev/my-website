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
  assert.match(html, /id="muyuAutoToggleBtn"/);
  assert.match(html, /id="muyuResetBtn"/);
});

test('woodfish mobile mallet uses larger responsive sizing and higher placement', () => {
  assert.match(
    css,
    /@media \(max-width: 720px\)[\s\S]*?\.container\s*\{[\s\S]*?width:\s*min\(100%,\s*96vw\);[\s\S]*?\}[\s\S]*?\.muyu-mallet\s*\{[\s\S]*?right:\s*14%;[\s\S]*?top:\s*52px;[\s\S]*?width:\s*clamp\(108px,\s*26vw,\s*138px\);[\s\S]*?\}/
  );
  assert.match(
    css,
    /@media \(max-width: 480px\)[\s\S]*?\.muyu-page \.container\s*\{[\s\S]*?max-width:\s*none;[\s\S]*?padding:\s*0 6px;[\s\S]*?\}[\s\S]*?\.muyu-mallet\s*\{[\s\S]*?right:\s*11%;[\s\S]*?top:\s*58px;[\s\S]*?width:\s*clamp\(118px,\s*31vw,\s*148px\);[\s\S]*?\}/
  );
  assert.match(
    css,
    /\.muyu-wood\.is-striking \.muyu-mallet\s*\{[\s\S]*?translate\(-10px,\s*22px\);[\s\S]*?\}/
  );
  assert.match(
    css,
    /@media \(max-width: 720px\)[\s\S]*?\.muyu-wood__label,\s*\.muyu-hint,\s*\.muyu-controls-grid\s*\{[\s\S]*?transform:\s*translateY\(-30px\);[\s\S]*?\}/
  );
});

test('woodfish auto-strike button and timer logic exist', () => {
  const js = fs.readFileSync(path.join(__dirname, '..', 'public', 'muyu.js'), 'utf8');
  assert.match(html, /自动敲击：关/);
  assert.match(html, /class="muyu-toolbar"[\s\S]*?class="muyu-back"[\s\S]*?id="muyuAutoToggleBtn"/);
  assert.match(css, /\.muyu-toolbar\s*\{[\s\S]*?display:\s*flex;[\s\S]*?justify-content:\s*space-between;/);
  assert.match(css, /\.muyu-back\s*\{[\s\S]*?width:\s*42px;[\s\S]*?height:\s*42px;/);
  assert.match(css, /\.muyu-auto-btn\s*\{[\s\S]*?min-height:\s*42px;/);
  assert.match(css, /@media \(max-width: 480px\)[\s\S]*?\.muyu-back\s*\{[\s\S]*?width:\s*36px;[\s\S]*?height:\s*36px;/);
  assert.match(css, /@media \(max-width: 480px\)[\s\S]*?\.muyu-auto-btn\s*\{[\s\S]*?min-height:\s*36px;/);
  assert.match(js, /const AUTO_STRIKE_INTERVAL_MS = 1000;/);
  assert.match(js, /const MOBILE_BACKGROUND_MUSIC_VOLUME = 0\.015;/);
  assert.match(js, /const MOBILE_AMBIENT_MASTER_GAIN = 0\.001;/);
  assert.match(js, /const STRIKE_BODY_GAIN = 0\.18;/);
  assert.match(js, /const STRIKE_CLICK_GAIN = 0\.05;/);
  assert.match(js, /function isMobileDevice\(\)/);
  assert.match(js, /function toggleAutoStrike\(\)/);
  assert.match(js, /window\.setInterval\(\(\) => \{\s*strikeWood\(\);/);
});

test('woodfish listens for tip success and adds 100 merit to total and today', () => {
  const js = fs.readFileSync(path.join(__dirname, '..', 'public', 'muyu.js'), 'utf8');
  assert.match(js, /const TIP_MERIT_REWARD = 100;/);
  assert.match(js, /function runAfterNextPaint\(callback\)/);
  assert.match(js, /function commitTipMeritReward\(\)/);
  assert.match(js, /function applyTipMeritReward\(/);
  assert.match(js, /function commitTipMeritReward\(\) \{[\s\S]*?state\.total \+= TIP_MERIT_REWARD;[\s\S]*?state\.today \+= TIP_MERIT_REWARD;[\s\S]*?saveState\(\);[\s\S]*?renderState\(\);[\s\S]*?hintEl\.textContent = `谢谢打赏，佛祖会保佑您,功德\+100! 今日已积 \$\{state\.today\}`;/);
  assert.match(js, /runAfterNextPaint\(\(\) => \{[\s\S]*?window\.alert\('谢谢打赏，佛祖会保佑您,功德\+100!'\);[\s\S]*?commitTipMeritReward\(\);[\s\S]*?\}\);/);
  assert.match(js, /alert\('谢谢打赏，佛祖会保佑您,功德\+100!'\);/);
  assert.match(js, /window\.addEventListener\('claw800:tip-success'/);
  assert.match(js, /if \(String\(event\.detail\?\.gameSlug \|\| ''\)\.trim\(\) !== GAME_SLUG\) return;/);
  assert.match(js, /window\.addEventListener\('pageshow', \(\) => \{[\s\S]*?renderState\(\);[\s\S]*?\}\);/);
});
