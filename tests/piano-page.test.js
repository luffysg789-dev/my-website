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

test('piano html includes header, keyboard shell, orientation hint, and tip mount', () => {
  assert.equal(fs.existsSync(htmlPath), true);

  const html = fs.readFileSync(htmlPath, 'utf8');

  assert.match(html, /<title>Claw800 钢琴<\/title>/);
  assert.doesNotMatch(html, /id="gamePageTitle"/);
  assert.doesNotMatch(html, /id="gamePageSubtitle"/);
  assert.match(html, /class="piano-back" href="\/games\.html" aria-label="返回游戏大全" title="返回游戏大全"/);
  assert.match(html, /<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">/);
  assert.doesNotMatch(html, />返回<\/a>/);
  assert.match(html, /id="pianoKeyboard"/);
  assert.match(html, /id="pianoKeys"/);
  assert.match(html, /id="pianoOrientationHint"/);
  assert.match(html, /data-game-tip-root/);
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
  assert.match(html, /class="piano-key__note">C4<\/span>/);
  assert.match(html, /class="piano-key__note">C#4<\/span>/);
  assert.match(html, /class="piano-key__note">B5<\/span>/);
  assert.doesNotMatch(html, /data-keyboard-code="Backslash"/);
  assert.doesNotMatch(html, /data-note="C6"/);
});

test('piano css includes landscape-first keyboard layout and desktop centering', () => {
  assert.equal(fs.existsSync(cssPath), true);

  const css = fs.readFileSync(cssPath, 'utf8');

  assert.match(css, /--piano-white-key-count:\s*14;/);
  assert.match(css, /\.piano-keys\s*\{[\s\S]*display:\s*grid;/);
  assert.match(css, /@media \(orientation:\s*landscape\)/);
  assert.match(css, /@media \(min-width:\s*900px\)/);
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
  assert.match(js, /function attachKeyboardHandlers\(/);
  assert.match(js, /function releaseAllNotes\(/);
  assert.match(js, /window\.addEventListener\('blur',\s*releaseAllNotes\)/);
});

test('piano script prepares note playback and orientation syncing', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const css = fs.readFileSync(cssPath, 'utf8');
  const js = fs.readFileSync(jsPath, 'utf8');

  assert.match(html, /id="pianoShortcutHint"/);
  assert.match(html, /白键:\s*A S D F G H J K L ; ' 回车 \[ \]/);
  assert.match(html, /黑键:\s*W E T Y U O P - = ⌫/);
  assert.match(css, /\.piano-shortcut-hint/);
  assert.match(css, /\.piano-key__note/);
  assert.match(css, /\.piano-key__kbd/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*\.piano-key__kbd\s*\{[\s\S]*display:\s*none;/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*\.piano-key__note\s*\{/);
  assert.match(js, /function createAudioEngine\(/);
  assert.match(js, /audioContext/);
  assert.match(js, /resumeAudioContextIfNeeded/);
  assert.match(js, /function syncOrientationState\(/);
});

test('piano script uses a richer piano tone model instead of a basic two-oscillator synth', () => {
  const js = fs.readFileSync(jsPath, 'utf8');

  assert.match(js, /function createPianoPeriodicWave\(/);
  assert.match(js, /function createHammerNoiseBuffer\(/);
  assert.match(js, /const detuneOffsets = \[-7,\s*0,\s*7\];/);
  assert.match(js, /oscillator\.setPeriodicWave\(periodicWave\);/);
  assert.match(js, /noiseSource = context\.createBufferSource\(\);/);
  assert.match(js, /noiseFilter\.type = 'bandpass';/);
  assert.match(js, /masterGain\.gain\.exponentialRampToValueAtTime\(0\.0001,\s*now \+ 2\.4\);/);
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
  assert.match(js, /await playSampleNote\(note\)/);
});
