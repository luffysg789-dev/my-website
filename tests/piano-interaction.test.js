const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const pianoScriptPath = path.join(rootDir, 'public', 'piano', 'script.js');
const {
  buildKeyboardModel,
  buildKeyboardShortcuts,
  createPressedNotesStore
} = require(pianoScriptPath);

test('buildKeyboardModel returns 14 white keys and 10 black keys', () => {
  const model = buildKeyboardModel();

  assert.equal(model.whiteKeys.length, 14);
  assert.equal(model.blackKeys.length, 10);
  assert.equal(model.whiteKeys[0].note, 'C4');
  assert.equal(model.whiteKeys.at(-1).note, 'B5');
});

test('buildKeyboardShortcuts maps left-to-right white-key shortcuts for desktop play', () => {
  const shortcuts = buildKeyboardShortcuts();

  assert.equal(shortcuts.KeyA, 'C4');
  assert.equal(shortcuts.KeyS, 'D4');
  assert.equal(shortcuts.KeyD, 'E4');
  assert.equal(shortcuts.KeyK, 'C5');
  assert.equal(shortcuts.Enter, 'G5');
  assert.equal(shortcuts.BracketLeft, 'A5');
  assert.equal(shortcuts.BracketRight, 'B5');
  assert.equal(shortcuts.Minus, 'F#5');
  assert.equal(shortcuts.Equal, 'G#5');
  assert.equal(shortcuts.Backspace, 'A#5');
});

test('createPressedNotesStore tracks multiple simultaneous notes in insertion order', () => {
  const store = createPressedNotesStore();

  store.press('C4', 'pointer');
  store.press('E4', 'pointer');

  assert.deepEqual(store.notes(), ['C4', 'E4']);

  store.release('C4');
  assert.deepEqual(store.notes(), ['E4']);
});
