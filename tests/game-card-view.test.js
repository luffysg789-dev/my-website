const test = require('node:test');
const assert = require('node:assert/strict');

const { getGameCardMediaMarkup } = require('../src/game-card-view');

test('woodfish game uses built-in drawn icon even when cover image exists', () => {
  const markup = getGameCardMediaMarkup({
    slug: 'muyu',
    name: '敲木鱼',
    icon: '🪵',
    cover_image: '/uploads/games/muyu-cover.png'
  });

  assert.match(markup, /game-card__icon game-card__icon--muyu/);
  assert.match(markup, /game-card__muyu-body/);
  assert.doesNotMatch(markup, /game-card__cover/);
  assert.doesNotMatch(markup, /<img /);
});

test('non-woodfish game still uses large cover markup when cover image exists', () => {
  const markup = getGameCardMediaMarkup({
    slug: 'fortune',
    name: '今日运势',
    icon: '🧧',
    cover_image: '/uploads/games/fortune-cover.png'
  });

  assert.match(markup, /game-card__cover/);
});
