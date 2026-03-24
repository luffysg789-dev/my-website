const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const configPath = path.join(rootDir, 'public', 'games-config.js');
const htmlPath = path.join(rootDir, 'public', 'beauty-light', 'index.html');
const cssPath = path.join(rootDir, 'public', 'beauty-light', 'style.css');
const jsPath = path.join(rootDir, 'public', 'beauty-light', 'script.js');

test('games config exposes cutie fill light entry', () => {
  const source = fs.readFileSync(configPath, 'utf8');
  assert.match(source, /slug:\s*'beauty-light'/);
  assert.match(source, /name:\s*'最萌补光灯'/);
  assert.match(source, /route:\s*'\/beauty-light\/'/);
});

test('beauty light page includes core layout', () => {
  assert.equal(fs.existsSync(htmlPath), true);
  assert.equal(fs.existsSync(cssPath), true);
  assert.equal(fs.existsSync(jsPath), true);

  const html = fs.readFileSync(htmlPath, 'utf8');

  assert.doesNotMatch(html, /<h1[^>]*>\s*最萌补光灯\s*<\/h1>/);
  assert.match(html, /点击屏幕换色/);
  assert.match(html, /少女粉/);
  assert.match(html, /冷白皮/);
  assert.match(html, /奶油光/);
  assert.match(html, /百搭光/);
  assert.match(html, /蜜桃灯/);
  assert.match(html, /清新光/);
  assert.match(html, /网感紫/);
  assert.match(html, /落日灯/);
  assert.match(html, /饱和度/);
  assert.match(html, /屏幕亮度/);
  assert.match(html, /id="beautyLightHue"/);
  assert.match(html, /id="beautyLightSaturation"/);
  assert.match(html, /id="beautyLightBrightness"/);
  assert.match(html, /class="beauty-light-presets"/);
  assert.match(html, /id="beautyLightPanel"/);
  assert.match(html, /id="beautyLightPanelCloseBtn"/);
  assert.match(html, /id="beautyLightPanelHandle"/);
  assert.match(html, /id="beautyLightPanelToggleBtn"/);
  assert.doesNotMatch(html, /beauty-light-camera-fab/);
});

test('beauty light stylesheet defines cute visual tokens', () => {
  const css = fs.readFileSync(cssPath, 'utf8');

  assert.match(css, /--panel-bg/);
  assert.match(css, /--default-light-color/);
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.match(css, /beauty-light-shell/);
  assert.match(css, /touch-action:\s*manipulation/);
  assert.match(css, /beauty-light-camera-pill/);
  assert.match(css, /beauty-light-panel-close/);
  assert.match(css, /@media \(min-width: 768px\)/);
  assert.match(css, /overflow-y:\s*auto/);
  assert.match(css, /max-height:\s*calc\(100dvh - 48px\)/);
  assert.match(css, /top:\s*72px/);
  assert.match(css, /position:\s*fixed/);
  assert.match(css, /is-panel-hidden/);
  assert.match(css, /is-hint-dismissed/);
});

test('beauty light script contains preset colors and swipe handling', () => {
  const js = fs.readFileSync(jsPath, 'utf8');

  assert.match(js, /少女粉/);
  assert.match(js, /冷白皮/);
  assert.match(js, /落日灯/);
  assert.match(js, /click/);
  assert.match(js, /pointerdown/);
  assert.match(js, /saturation/);
  assert.match(js, /brightness/);
  assert.match(js, /hue/);
  assert.match(js, /panelCollapsed/);
  assert.match(js, /hintDismissed/);
  assert.match(js, /function closePanel\(/);
  assert.match(js, /function openPanel\(/);
  assert.match(js, /beautyLightPanelToggleBtn/);
  assert.doesNotMatch(js, /onTouchStart/);
  assert.doesNotMatch(js, /onTouchEnd/);
});
