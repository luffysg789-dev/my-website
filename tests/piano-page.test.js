const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const configPath = path.join(rootDir, 'public', 'games-config.js');
const dbPath = path.join(rootDir, 'src', 'db.js');
const serverPath = path.join(rootDir, 'src', 'server.js');
const htmlPath = path.join(rootDir, 'public', 'piano', 'index.html');
const cssPath = path.join(rootDir, 'public', 'piano', 'style.css');
const jsPath = path.join(rootDir, 'public', 'piano', 'script.js');
const sampleDir = path.join(rootDir, 'public', 'audio', 'piano-samples');

test('piano game is listed in config, db defaults, and server route map', () => {
  const config = fs.readFileSync(configPath, 'utf8');
  const db = fs.readFileSync(dbPath, 'utf8');
  const server = fs.readFileSync(serverPath, 'utf8');

  assert.match(config, /slug:\s*'piano'/);
  assert.match(config, /route:\s*'\/piano\/'/);
  assert.match(config, /name:\s*'钢琴'/);
  assert.match(config, /piano:\s*'开始演奏'/);
  assert.match(db, /slug:\s*'piano'/);
  assert.match(server, /piano:\s*'\/piano\/'/);
});

test('server redirects legacy /games/piano route to the standalone piano page', () => {
  const server = fs.readFileSync(serverPath, 'utf8');

  assert.match(server, /app\.get\('\/games\/:slug',\s*\(req,\s*res\)\s*=>/);
  assert.match(server, /const route = getGameRouteBySlug\(slug\);/);
  assert.match(server, /if \(route === `\/games\/\$\{encodeURIComponent\(slug\)\}`\) \{/);
  assert.match(server, /return res\.redirect\(302,\s*route\);/);
});

test('piano html includes the standalone shell and latest bundles', () => {
  assert.equal(fs.existsSync(htmlPath), true);

  const html = fs.readFileSync(htmlPath, 'utf8');

  assert.match(html, /<title>Claw800 钢琴<\/title>/);
  assert.match(html, /\/game-tip\.css\?v=20260328-19/);
  assert.match(html, /\/piano\/style\.css\?v=20260328-19/);
  assert.match(html, /\/games-config\.js\?v=20260328-19/);
  assert.match(html, /\/piano\/script\.js\?v=20260328-19/);
  assert.match(html, /\/game-tip\.js\?v=20260328-19/);
  assert.match(html, /class="piano-back" href="\/games\.html" aria-label="返回游戏大全" title="返回游戏大全"/);
  assert.match(html, /id="pianoKeyboard"/);
  assert.match(html, /id="pianoKeys"/);
  assert.match(html, /data-game-tip-root/);
  assert.doesNotMatch(html, /id="gamePageTitle"/);
  assert.doesNotMatch(html, /id="pianoOrientationHint"/);
});

test('piano html exposes a two-octave keyboard with white and black key groups', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');

  assert.match(html, /data-key-type="white"/);
  assert.match(html, /data-key-type="black"/);
  assert.match(html, /data-note="C4"/);
  assert.match(html, /data-note="B5"/);
  assert.match(html, /data-keyboard-code="KeyA"/);
  assert.match(html, /data-keyboard-code="KeyW"/);
  assert.match(html, /data-keyboard-code="Enter"/);
  assert.match(html, /data-keyboard-code="BracketLeft"/);
  assert.match(html, /data-keyboard-code="BracketRight"/);
  assert.match(html, /data-keyboard-code="Minus"/);
  assert.match(html, /data-keyboard-code="Equal"/);
  assert.match(html, /data-keyboard-code="Backspace"/);
  assert.match(html, /class="piano-key__solfege">1<\/span>/);
  assert.match(html, /class="piano-key__solfege">7<\/span>/);
  assert.match(html, /class="piano-key__solfege">1·<\/span>/);
  assert.match(html, /class="piano-key__solfege">#1<\/span>/);
  assert.doesNotMatch(html, /class="piano-key__note">/);
  assert.doesNotMatch(html, /data-keyboard-code="Backslash"/);
  assert.doesNotMatch(html, /data-note="C6"/);
});

test('piano css keeps the mobile piano isolated from desktop layout breakpoints and near fullscreen', () => {
  assert.equal(fs.existsSync(cssPath), true);

  const css = fs.readFileSync(cssPath, 'utf8');

  assert.match(css, /--piano-white-key-count:\s*14;/);
  assert.match(css, /\.piano-keys\s*\{[\s\S]*display:\s*grid;/);
  assert.match(css, /@media \(orientation:\s*landscape\)/);
  assert.match(css, /@media \(orientation:\s*portrait\)/);
  assert.match(css, /@media \(min-width:\s*900px\) and \(hover:\s*hover\) and \(pointer:\s*fine\)/);
  assert.match(css, /\.piano-keyboard\s*\{[\s\S]*touch-action:\s*manipulation;/);
  assert.match(css, /\.piano-key\s*\{[\s\S]*touch-action:\s*manipulation;/);
  assert.match(css, /\.piano-page\s*\{[\s\S]*user-select:\s*none;/);
  assert.match(css, /\.piano-page\s*\{[\s\S]*-webkit-user-select:\s*none;/);
  assert.match(css, /\.piano-page\s*\{[\s\S]*-webkit-touch-callout:\s*none;/);
  assert.match(css, /\.piano-page\.is-mobile-device\s*\{[\s\S]*display:\s*flex;/);
  assert.match(css, /\.piano-page\.is-mobile-device\s+\.piano-stage\s*\{[\s\S]*position:\s*fixed;/);
  assert.match(css, /\.piano-page\.is-mobile-device\s+\.piano-stage\s*\{[\s\S]*rotate\(90deg\)/);
  assert.match(css, /@media \(orientation:\s*landscape\)[\s\S]*\.piano-page\.is-mobile-device\s+\.piano-stage\s*\{[\s\S]*rotate\(0deg\)/);
  assert.match(css, /\.piano-page\.is-mobile-device\s+\.piano-stage\s*\{[\s\S]*width:\s*calc\(100dvh - 2px\);/);
  assert.match(css, /\.piano-page\.is-mobile-device\s+\.piano-shell\s*\{[\s\S]*min-height:\s*calc\(100vw - 2px\);/);
  assert.match(css, /\.piano-page\.is-mobile-device\s+\.piano-shell\s*\{[\s\S]*padding:\s*2px;/);
  assert.match(css, /\.piano-page\.is-mobile-device\s+\.piano-tip-slot\s*\{[\s\S]*display:\s*none;/);
  assert.match(css, /@media \(orientation:\s*portrait\)[\s\S]*\.piano-page\.is-mobile-device\s+\.piano-stage\s*\{[\s\S]*width:\s*calc\(100dvh - 18px\);/);
  assert.match(css, /@media \(orientation:\s*portrait\)[\s\S]*\.piano-page\.is-mobile-device\s+\.piano-shell\s*\{[\s\S]*min-height:\s*calc\(100vw - 10px\);/);
  assert.match(css, /@media \(orientation:\s*landscape\)[\s\S]*\.piano-page\.is-mobile-device\s+\.piano-stage\s*\{[\s\S]*width:\s*calc\(100vw - 20px\);/);
  assert.match(css, /@media \(orientation:\s*landscape\)[\s\S]*\.piano-page\.is-mobile-device\s+\.piano-shell\s*\{[\s\S]*min-height:\s*calc\(100dvh - 20px\);/);
  assert.match(css, /@media \(orientation:\s*landscape\)[\s\S]*\.piano-page\.is-mobile-device\s+\.piano-shell\s*\{[\s\S]*border-radius:\s*22px;/);
  assert.match(css, /@media \(orientation:\s*landscape\)[\s\S]*\.piano-page\.is-mobile-device\s+\.piano-keyboard\s*\{[\s\S]*padding:\s*8px 6px 10px;/);
  assert.match(css, /--piano-shell-glow:\s*rgba\(157,\s*219,\s*255,\s*0\.2\);/);
  assert.match(css, /\.piano-key\s*\{[\s\S]*transform 45ms ease-out,/);
  assert.match(css, /\.piano-key--white\.is-active\s*\{[\s\S]*translateY\(4px\)/);
  assert.match(css, /\.piano-key--black\.is-active\s*\{[\s\S]*translateX\(-50%\) translateY\(2px\)/);
});

test('piano page includes a low-emphasis NexaPay tip section below the keyboard', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const css = fs.readFileSync(cssPath, 'utf8');

  assert.match(html, /data-game-tip-root/);
  assert.match(css, /\.piano-tip-slot\s*\{/);
  assert.match(css, /\.piano-tip-slot\s*\{[\s\S]*margin-top:/);
});

test('piano script includes pointer, keyboard, and release handling hooks', () => {
  const js = fs.readFileSync(jsPath, 'utf8');

  assert.match(js, /function attachPointerHandlers\(/);
  assert.match(js, /function attachTouchHandlers\(/);
  assert.match(js, /key\.addEventListener\('touchstart',\s*\(event\)\s*=>\s*\{/);
  assert.match(js, /key\.addEventListener\('touchmove',\s*\(event\)\s*=>\s*\{/);
  assert.match(js, /key\.addEventListener\('touchend',\s*\(event\)\s*=>\s*\{/);
  assert.match(js, /event\.currentTarget\.setPointerCapture\?\.\(event\.pointerId\);/);
  assert.match(js, /event\.currentTarget\.releasePointerCapture\?\.\(event\.pointerId\);/);
  assert.match(js, /function attachKeyboardHandlers\(/);
  assert.match(js, /function releaseAllNotes\(/);
  assert.match(js, /document\.addEventListener\('selectionchange'/);
  assert.match(js, /window\.getSelection\(\)\?\.removeAllRanges\(\)/);
  assert.match(js, /keyboard\.addEventListener\('contextmenu',\s*\(event\)\s*=>\s*\{/);
  assert.match(js, /document\.addEventListener\('selectstart',\s*\(event\)\s*=>\s*\{/);
  assert.match(js, /window\.addEventListener\('blur',\s*releaseAllNotes\)/);
});

test('piano script keeps mobile phones on the dedicated piano layout even in landscape', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const css = fs.readFileSync(cssPath, 'utf8');
  const js = fs.readFileSync(jsPath, 'utf8');

  assert.match(html, /id="pianoShortcutHint"/);
  assert.match(html, /白键:\s*A S D F G H J K L ; ' 回车 \[ \]/);
  assert.match(html, /黑键:\s*W E T Y U O P - = ⌫/);
  assert.match(css, /\.piano-shortcut-hint/);
  assert.match(css, /\.piano-key__solfege/);
  assert.match(css, /\.piano-key__kbd/);
  assert.match(css, /\.piano-page\.is-mobile-device[\s\S]*\.piano-key__kbd\s*\{[\s\S]*display:\s*none;/);
  assert.match(css, /\.piano-page\.is-mobile-device[\s\S]*\.piano-key__solfege\s*\{[\s\S]*display:\s*none;/);
  assert.match(css, /\.piano-page\.is-mobile-device[\s\S]*\.piano-back\s*\{[\s\S]*display:\s*none;/);
  assert.match(js, /function createAudioEngine\(/);
  assert.match(js, /new AudioContextCtor\(\{\s*latencyHint:\s*'interactive'\s*\}\)/);
  assert.match(js, /resumeAudioContextIfNeeded/);
  assert.match(js, /function scheduleSampleWarmup\(/);
  assert.match(js, /function playTouchResponsiveNote\(/);
  assert.match(js, /const cachedSample = sampleBufferCache\.get\(sampleNote\);/);
  assert.match(js, /window\.requestIdleCallback/);
  assert.match(js, /window\.requestIdleCallback\(warmupTask,\s*\{\s*timeout:\s*1500\s*\}\)/);
  assert.match(js, /window\.setTimeout\(\(\)\s*=>\s*\{/);
  assert.match(js, /window\.setTimeout\(resolve,\s*90\)/);
  assert.match(js, /},\s*420\)/);
  assert.match(js, /scheduleSampleWarmup\(sampleNote\);/);
  assert.match(js, /const shouldUseCachedSampleDirectly = Boolean\(preferImmediateSynth && cachedSample\);/);
  assert.match(js, /fadeOutSynthLayer\(context,\s*synthLayer,\s*0\.08\)/);
  assert.match(js, /function isLikelyMobileDevice\(/);
  assert.match(js, /window\.matchMedia\('\(pointer: coarse\)'\)\.matches/);
  assert.match(js, /navigator\.maxTouchPoints > 0/);
  assert.match(js, /function syncOrientationState\(/);
  assert.match(js, /const isMobile = isLikelyMobileDevice\(\);/);
  assert.match(js, /page\.classList\.toggle\('is-mobile-device', isMobile\)/);
  assert.doesNotMatch(js, /classList\.toggle\('is-portrait'/);
});

test('piano script uses a richer piano tone model instead of a basic two-oscillator synth', () => {
  const js = fs.readFileSync(jsPath, 'utf8');

  assert.match(js, /function createPianoPeriodicWave\(/);
  assert.match(js, /function createHammerNoiseBuffer\(/);
  assert.match(js, /const MIN_NOTE_HOLD_SECONDS = 0\.48;/);
  assert.match(js, /function getVoiceStopAt\(context,\s*voice\) \{/);
  assert.match(js, /const remainingHold = Math\.max\(0,\s*MIN_NOTE_HOLD_SECONDS - elapsed\);/);
  assert.match(js, /const detuneOffsets = \[-7,\s*0,\s*7\];/);
  assert.match(js, /oscillator\.setPeriodicWave\(periodicWave\);/);
  assert.match(js, /noiseSource = context\.createBufferSource\(\);/);
  assert.match(js, /noiseFilter\.type = 'bandpass';/);
  assert.match(js, /const attackDuration = Number\(options\.attackDuration \?\? 0\.004\);/);
  assert.match(js, /const peakGain = Number\(options\.peakGain \?\? 0\.98\);/);
  assert.match(js, /masterGain\.gain\.linearRampToValueAtTime\(0\.24,\s*now \+ 0\.004\);/);
  assert.match(js, /masterGain\.gain\.exponentialRampToValueAtTime\(0\.0001,\s*now \+ 3\.2\);/);
  assert.match(js, /const stopAt = getVoiceStopAt\(context,\s*voice\);/);
  assert.match(js, /function fadeOutSynthLayer\(/);
});

test('piano page ships local real piano sample assets and loads them before falling back', () => {
  const js = fs.readFileSync(jsPath, 'utf8');

  assert.equal(fs.existsSync(path.join(sampleDir, 'C4v4.mp3')), true);
  assert.equal(fs.existsSync(path.join(sampleDir, 'D%234v4.mp3')), true);
  assert.equal(fs.existsSync(path.join(sampleDir, 'F%234v4.mp3')), true);
  assert.equal(fs.existsSync(path.join(sampleDir, 'A4v4.mp3')), true);
  assert.equal(fs.existsSync(path.join(sampleDir, 'C5v4.mp3')), true);
  assert.equal(fs.existsSync(path.join(sampleDir, 'D%235v4.mp3')), true);
  assert.equal(fs.existsSync(path.join(sampleDir, 'F%235v4.mp3')), true);
  assert.equal(fs.existsSync(path.join(sampleDir, 'A5v4.mp3')), true);
  assert.match(js, /const PIANO_SAMPLE_FILES = \{/);
  assert.match(js, /function getNearestSampleNote\(/);
  assert.match(js, /fetch\(sampleUrl\)/);
  assert.match(js, /decodeAudioData\(/);
  assert.match(js, /loadSampleBuffer\(sampleNote\)/);
});
