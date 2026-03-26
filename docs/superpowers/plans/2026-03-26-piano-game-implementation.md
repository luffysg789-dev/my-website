# Piano Game Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new mobile-landscape-first web piano game, add it to the games directory, and keep a NexaPay tip button below the piano without distracting from the keyboard.

**Architecture:** Add a new standalone game page under `public/piano/` following the existing game-directory pattern, reuse `games-config.js` and shared game-tip integration, and implement the piano as a focused front-end module with a two-octave DOM keyboard, Web Audio playback, and unified pointer/keyboard state handling. Cover the new route and layout with static page tests plus focused interaction tests that validate keyboard structure, mapping, and press-state behavior.

**Tech Stack:** Static HTML/CSS/JavaScript, Node `node:test`, existing Express static routing/server config, existing NexaPay tip flow via `public/game-tip.js`

---

## Chunk 1: Entry And Page Skeleton

### Task 1: Add the game to the directory config and server defaults

**Files:**
- Modify: `public/games-config.js`
- Modify: `src/db.js`
- Modify: `src/server.js`
- Test: `tests/piano-page.test.js`

- [ ] **Step 1: Write the failing test**

```js
test('piano game is listed in config, db defaults, and server route map', () => {
  assert.match(config, /slug:\s*'piano'/);
  assert.match(config, /route:\s*'\/piano\/'/);
  assert.match(config, /name:\s*'钢琴'/);
  assert.match(config, /piano:\s*'开始演奏'/);
  assert.match(db, /slug:\s*'piano'/);
  assert.match(server, /piano:\s*'\/piano\/'/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/piano-page.test.js`
Expected: FAIL because the `piano` route/config entries do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Add the new `piano` entry to `DEFAULT_GAMES` and `GAME_ACTION_TEXT`, then mirror the default slug/route data in `src/db.js` and `src/server.js` using the same structure as existing standalone games.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/piano-page.test.js`
Expected: PASS for the new config/route assertions.

- [ ] **Step 5: Commit**

```bash
git add public/games-config.js src/db.js src/server.js tests/piano-page.test.js
git commit -m "feat: register piano game entry"
```

### Task 2: Create the standalone piano page shell

**Files:**
- Create: `public/piano/index.html`
- Test: `tests/piano-page.test.js`

- [ ] **Step 1: Write the failing test**

```js
test('piano html includes header, keyboard shell, orientation hint, and tip mount', () => {
  assert.match(html, /<title>Claw800 钢琴<\/title>/);
  assert.match(html, /id="pianoKeyboard"/);
  assert.match(html, /id="pianoKeys"/);
  assert.match(html, /id="pianoOrientationHint"/);
  assert.match(html, /data-game-tip-root/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/piano-page.test.js`
Expected: FAIL because `public/piano/index.html` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `public/piano/index.html` with:
- a slim header and back link
- a centered piano shell
- a keyboard container for white/black keys
- a lightweight orientation hint block
- shared `games-config.js` bootstrap
- shared `game-tip.css` and `game-tip.js` includes

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/piano-page.test.js`
Expected: PASS for the shell structure assertions.

- [ ] **Step 5: Commit**

```bash
git add public/piano/index.html tests/piano-page.test.js
git commit -m "feat: add piano page shell"
```

## Chunk 2: Layout And Visual Design

### Task 3: Build the two-octave keyboard markup contract and page styles

**Files:**
- Create: `public/piano/style.css`
- Modify: `public/piano/index.html`
- Test: `tests/piano-page.test.js`

- [ ] **Step 1: Write the failing test**

```js
test('piano html exposes a two-octave keyboard with white and black key groups', () => {
  assert.match(html, /data-key-type="white"/);
  assert.match(html, /data-key-type="black"/);
  assert.match(html, /data-note="C4"/);
  assert.match(html, /data-note="B5"/);
});

test('piano css includes landscape-first keyboard layout and desktop centering', () => {
  assert.match(css, /:root\s*\{[\s\S]*--piano-white-key-count:\s*14;/);
  assert.match(css, /\.piano-keys\s*\{[\s\S]*display:\s*grid;/);
  assert.match(css, /@media \(orientation:\s*landscape\)/);
  assert.match(css, /@media \(min-width:\s*900px\)/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/piano-page.test.js`
Expected: FAIL because the keyboard notes and piano stylesheet are not in place yet.

- [ ] **Step 3: Write minimal implementation**

Add static key markup for 14 white keys and the matching black keys in `index.html`, then create `style.css` for:
- cream-to-gold background
- walnut piano shell
- realistic white/black key styling
- mobile landscape-first proportions
- safe-area handling
- desktop centered presentation

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/piano-page.test.js`
Expected: PASS for the keyboard markup and responsive-style assertions.

- [ ] **Step 5: Commit**

```bash
git add public/piano/index.html public/piano/style.css tests/piano-page.test.js
git commit -m "feat: style piano keyboard layout"
```

### Task 4: Ensure the shared tip area fits the piano page gracefully

**Files:**
- Modify: `public/piano/index.html`
- Modify: `public/piano/style.css`
- Test: `tests/piano-page.test.js`

- [ ] **Step 1: Write the failing test**

```js
test('piano page includes a low-emphasis NexaPay tip section below the keyboard', () => {
  assert.match(html, /data-game-tip-root/);
  assert.match(css, /\.piano-tip-slot\s*\{/);
  assert.match(css, /\.piano-tip-slot\s*\{[\s\S]*margin-top:/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/piano-page.test.js`
Expected: FAIL because the dedicated piano tip placement styles are missing.

- [ ] **Step 3: Write minimal implementation**

Add a dedicated tip slot wrapper below the keyboard and style it so the shared donate bar sits calmly under the instrument, with enough spacing on both mobile and desktop layouts.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/piano-page.test.js`
Expected: PASS for piano-specific tip placement assertions.

- [ ] **Step 5: Commit**

```bash
git add public/piano/index.html public/piano/style.css tests/piano-page.test.js
git commit -m "feat: place piano tip section"
```

## Chunk 3: Interaction And Audio

### Task 5: Add failing interaction tests for press state and keyboard mapping

**Files:**
- Create: `tests/piano-interaction.test.js`
- Test: `tests/piano-interaction.test.js`

- [ ] **Step 1: Write the failing test**

```js
test('buildKeyboardModel returns 14 white keys and matching black keys', () => {
  const model = buildKeyboardModel();
  assert.equal(model.whiteKeys.length, 14);
  assert.equal(model.blackKeys.length, 10);
});

test('buildKeyboardShortcuts maps left-to-right notes for desktop play', () => {
  const shortcuts = buildKeyboardShortcuts();
  assert.equal(shortcuts.KeyA, 'C4');
  assert.equal(shortcuts.KeyJ, 'E5');
});

test('createPressedNotesStore tracks multiple simultaneous notes', () => {
  const store = createPressedNotesStore();
  store.press('C4', 'pointer');
  store.press('E4', 'pointer');
  assert.deepEqual(store.notes(), ['C4', 'E4']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/piano-interaction.test.js`
Expected: FAIL because the piano interaction module does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create the piano script module exports needed by the tests:
- keyboard model builder
- desktop shortcut map
- pressed-note state helper

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/piano-interaction.test.js`
Expected: PASS for the pure-state helpers.

- [ ] **Step 5: Commit**

```bash
git add public/piano/script.js tests/piano-interaction.test.js
git commit -m "feat: add piano interaction state helpers"
```

### Task 6: Wire DOM interactions and audio playback

**Files:**
- Modify: `public/piano/script.js`
- Modify: `public/piano/index.html`
- Test: `tests/piano-page.test.js`
- Test: `tests/piano-interaction.test.js`

- [ ] **Step 1: Write the failing test**

```js
test('piano script includes pointer, keyboard, and release handling', () => {
  assert.match(js, /function attachPointerHandlers\(/);
  assert.match(js, /function attachKeyboardHandlers\(/);
  assert.match(js, /function releaseAllNotes\(/);
  assert.match(js, /window\.addEventListener\('blur',\s*releaseAllNotes\)/);
});

test('piano script prepares note playback with Web Audio support', () => {
  assert.match(js, /function createAudioEngine\(/);
  assert.match(js, /audioContext/);
  assert.match(js, /resumeAudioContextIfNeeded/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/piano-page.test.js tests/piano-interaction.test.js`
Expected: FAIL because the DOM/audio wiring has not been added yet.

- [ ] **Step 3: Write minimal implementation**

Implement:
- pointer down/enter/up/cancel handling for touch and mouse
- keyboard down/up handling for desktop
- active-key class toggling
- audio context boot/resume on first gesture
- per-note playback using preloaded audio or a minimal synthesized fallback
- global release cleanup on blur/visibility change

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/piano-page.test.js tests/piano-interaction.test.js`
Expected: PASS with all new interaction and audio assertions green.

- [ ] **Step 5: Commit**

```bash
git add public/piano/index.html public/piano/script.js tests/piano-page.test.js tests/piano-interaction.test.js
git commit -m "feat: implement piano interactions and audio"
```

## Chunk 4: Finish And Verify

### Task 7: Refine orientation behavior and desktop hinting

**Files:**
- Modify: `public/piano/style.css`
- Modify: `public/piano/script.js`
- Test: `tests/piano-page.test.js`

- [ ] **Step 1: Write the failing test**

```js
test('piano page includes orientation hint and desktop shortcut hint hooks', () => {
  assert.match(html, /id="pianoOrientationHint"/);
  assert.match(html, /id="pianoShortcutHint"/);
  assert.match(css, /\.piano-shortcut-hint/);
  assert.match(js, /function syncOrientationState\(/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/piano-page.test.js`
Expected: FAIL because the final hint hooks/state sync are incomplete.

- [ ] **Step 3: Write minimal implementation**

Add a small orientation hint for portrait mobile usage and a subtle desktop shortcut hint that only appears at larger breakpoints, then sync them from JS using current viewport/orientation state.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/piano-page.test.js`
Expected: PASS for the final hint behavior hooks.

- [ ] **Step 5: Commit**

```bash
git add public/piano/style.css public/piano/script.js tests/piano-page.test.js
git commit -m "feat: polish piano orientation and keyboard hints"
```

### Task 8: Run full verification and prepare handoff

**Files:**
- Verify only: `tests/piano-page.test.js`
- Verify only: `tests/piano-interaction.test.js`
- Verify only: existing impacted tests such as `tests/games-page-layout.test.js` and `tests/game-tip-page.test.js`

- [ ] **Step 1: Run focused piano tests**

Run: `node --test tests/piano-page.test.js tests/piano-interaction.test.js`
Expected: PASS

- [ ] **Step 2: Run impacted existing tests**

Run: `node --test tests/games-page-layout.test.js tests/game-tip-page.test.js`
Expected: PASS

- [ ] **Step 3: Do a manual sanity pass**

Run: `npm run dev`
Then confirm:
- `/games.html` shows the new piano card
- `/piano/` loads
- mobile landscape layout keeps the keyboard dominant
- desktop keyboard shortcuts work
- the NexaPay tip bar stays below the piano and does not crowd the keys

- [ ] **Step 4: Commit final polish**

```bash
git add public/games-config.js public/piano src/db.js src/server.js tests/piano-page.test.js tests/piano-interaction.test.js
git commit -m "feat: add mobile-first piano game"
```
