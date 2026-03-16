const test = require('node:test');
const assert = require('node:assert/strict');

const { shouldRestartHtmlAudio } = require('../src/muyu-audio');

test('shouldRestartHtmlAudio returns false for already playing audio', () => {
  const fakeAudio = {
    paused: false,
    ended: false,
    currentTime: 12.5
  };

  assert.equal(shouldRestartHtmlAudio(fakeAudio), false);
});

test('shouldRestartHtmlAudio returns true when audio is paused', () => {
  const fakeAudio = {
    paused: true,
    ended: false,
    currentTime: 0
  };

  assert.equal(shouldRestartHtmlAudio(fakeAudio), true);
});
