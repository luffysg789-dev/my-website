const { getGameCardMediaMarkup } = typeof window === 'undefined'
  ? require('../src/game-card-view')
  : { getGameCardMediaMarkup: null };

const DEFAULT_GAMES = [
  {
    slug: 'gomoku',
    name: '五子棋',
    description: '15x15 棋盘，支持真人对战与人机对战。',
    cover_image: '',
    secondary_image: '',
    sound_file: '',
    background_music_file: '',
    is_enabled: 1,
    sort_order: 40,
    route: '/gomoku/',
    icon: '⚫',
    actionText: '开始游戏'
  },
  {
    slug: 'minesweeper',
    name: '扫雷',
    description: '经典扫雷网页小游戏，支持手机版触控、插旗模式、难度切换和重新开始。',
    cover_image: '',
    secondary_image: '',
    sound_file: '',
    background_music_file: '',
    is_enabled: 1,
    sort_order: 30,
    route: '/minesweeper.html',
    icon: '💣',
    actionText: '开始游戏'
  },
  {
    slug: 'fortune',
    name: '今日运势',
    description: '结合东方抽签氛围的轻量小游戏，点击签筒摇一摇，抽出你今天的财运签。',
    cover_image: '',
    secondary_image: '',
    sound_file: '',
    background_music_file: '',
    is_enabled: 1,
    sort_order: 20,
    route: '/fortune.html',
    icon: '🧧',
    actionText: '开始游戏'
  },
  {
    slug: 'muyu',
    name: '敲木鱼',
    description: '轻点木鱼一下，功德 +1。',
    cover_image: '',
    secondary_image: '',
    sound_file: '',
    background_music_file: '',
    is_enabled: 1,
    sort_order: 10,
    route: '/muyu.html',
    icon: '🪵',
    actionText: '开始游戏'
  }
];

const GAME_ACTION_TEXT = {
  gomoku: '开始游戏',
  minesweeper: '开始游戏',
  fortune: '开始游戏',
  muyu: '开始游戏'
};
const MUYU_OLD_DESCRIPTION = '轻点木鱼一下，功德 +1。保留简洁仪式感，支持手机触控、音效和自动保存。';
const MUYU_NEW_DESCRIPTION = '轻点木鱼一下，功德 +1。';

const GAME_CONFIG_CACHE_PREFIX = 'claw800_game_config_cache_v1:';

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function buildGameCardMediaMarkup(item) {
  if (getGameCardMediaMarkup) {
    return getGameCardMediaMarkup(item);
  }
  const slug = String(item?.slug || '').trim();
  if (slug === 'muyu') {
    return `
      <div class="game-card__icon game-card__icon--muyu" aria-hidden="true">
        <span class="game-card__muyu-body"></span>
        <span class="game-card__muyu-groove"></span>
        <span class="game-card__muyu-base"></span>
      </div>
    `.trim();
  }
  if (item.cover_image) {
    return `<div class="game-card__cover"><img src="${escapeHtml(item.cover_image)}" alt="${escapeHtml(item.name)}" /></div>`;
  }
  return `<div class="game-card__icon" aria-hidden="true">${escapeHtml(item.icon)}</div>`;
}

function cloneDefaultGame(slug) {
  const fallback = DEFAULT_GAMES.find((item) => item.slug === slug);
  return fallback ? { ...fallback } : null;
}

function getGameCacheKey(slug) {
  return `${GAME_CONFIG_CACHE_PREFIX}${String(slug || '').trim()}`;
}

function readCachedGame(slug) {
  try {
    const raw = window.localStorage.getItem(getGameCacheKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedGame(item) {
  const slug = String(item?.slug || '').trim();
  if (!slug) return;
  try {
    window.localStorage.setItem(getGameCacheKey(slug), JSON.stringify(item));
  } catch {}
}

function normalizeGame(item, fallback = {}) {
  const slug = String(item?.slug || fallback.slug || '').trim();
  let description = String(item?.description || fallback.description || '').trim();
  if (slug === 'muyu' && description === MUYU_OLD_DESCRIPTION) {
    description = MUYU_NEW_DESCRIPTION;
  }
  return {
    slug,
    name: String(item?.name || fallback.name || '').trim(),
    description,
    cover_image: String(item?.cover_image || fallback.cover_image || '').trim(),
    secondary_image: String(item?.secondary_image || fallback.secondary_image || '').trim(),
    sound_file: String(item?.sound_file || fallback.sound_file || '').trim(),
    background_music_file: String(item?.background_music_file || fallback.background_music_file || '').trim(),
    is_enabled: Number(item?.is_enabled ?? fallback.is_enabled ?? 1) ? 1 : 0,
    sort_order: Number(item?.sort_order ?? fallback.sort_order ?? 0) || 0,
    route: String(item?.route || fallback.route || `/games/${encodeURIComponent(slug)}`).trim(),
    icon: String(item?.icon || fallback.icon || '🎮').trim(),
    actionText: String(item?.actionText || fallback.actionText || GAME_ACTION_TEXT[slug] || '开始')
  };
}

async function fetchJson(path) {
  try {
    const res = await fetch(`${path}${path.includes('?') ? '&' : '?'}t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function gameCardMarkup(item) {
  const coverMarkup = buildGameCardMediaMarkup(item);

  return `
    <article class="game-card">
      ${coverMarkup}
      <div class="game-card__body">
        <h3>${escapeHtml(item.name)}</h3>
        <p>${escapeHtml(item.description)}</p>
      </div>
      <div class="game-card__actions">
        <a class="game-card__play" href="${escapeHtml(item.route)}">${escapeHtml(item.actionText)}</a>
      </div>
    </article>
  `;
}

function applyGamePageConfig(item) {
  if (!item) return;
  window.__GAME_CONFIG__ = item;
  const titleEl = document.getElementById('gamePageTitle');
  const subtitleEl = document.getElementById('gamePageSubtitle');
  if (titleEl) titleEl.textContent = item.name || titleEl.textContent;
  if (subtitleEl && item.description) subtitleEl.textContent = item.description;
  if (item.name) {
    document.title = `Claw800 ${item.name}`;
  }
  const descMeta = document.querySelector('meta[name="description"]');
  if (descMeta && item.description) {
    descMeta.setAttribute('content', `Claw800 ${item.description}`);
  }
  window.dispatchEvent(new CustomEvent('game-config-ready', { detail: item }));
}

async function bootstrapGamesPage() {
  const grid = document.getElementById('gamesGrid');
  if (!grid) return;
  const data = await fetchJson('/api/games');
  const mergedBySlug = new Map(DEFAULT_GAMES.map((item) => [item.slug, { ...item }]));

  if (Array.isArray(data?.items) && data.items.length) {
    data.items.forEach((item) => {
      const normalized = normalizeGame(item, cloneDefaultGame(item.slug) || {});
      mergedBySlug.set(normalized.slug, normalized);
    });
  }

  const items = Array.from(mergedBySlug.values());
  grid.innerHTML = items.filter((item) => item.is_enabled).map(gameCardMarkup).join('');
}

async function bootstrapGamePage(slug) {
  const fallback = cloneDefaultGame(slug);
  if (!fallback) return;
  const cached = readCachedGame(slug);
  if (cached) {
    applyGamePageConfig(normalizeGame(cached, fallback));
  } else {
    applyGamePageConfig(fallback);
  }
  const data = await fetchJson(`/api/games/${encodeURIComponent(slug)}`);
  if (data?.item) {
    const normalized = normalizeGame(data.item, fallback);
    writeCachedGame(normalized);
    applyGamePageConfig(normalized);
  }
}

window.ClawGamesConfig = {
  bootstrapGamesPage,
  bootstrapGamePage,
  getCurrentGameConfig() {
    return window.__GAME_CONFIG__ || null;
  }
};
