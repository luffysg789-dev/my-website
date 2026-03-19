const strikeBtn = document.getElementById('muyuStrikeBtn');
const resetBtn = document.getElementById('muyuResetBtn');
const musicToggleBtn = document.getElementById('muyuMusicToggleBtn');
const autoToggleBtn = document.getElementById('muyuAutoToggleBtn');
const todayCountEl = document.getElementById('muyuTodayCount');
const heroCountEl = document.getElementById('muyuHeroCount');
const hintEl = document.getElementById('muyuHint');
const blessingTextEl = document.getElementById('muyuBlessingText');

const GAME_SLUG = 'muyu';
const GAME_CONFIG_CACHE_KEY = `claw800_game_config_cache_v1:${GAME_SLUG}`;
const MAX_INLINE_GAME_CONFIG_CACHE_SIZE = 120 * 1024;
const DEFAULT_GAME_CONFIG = {
  slug: GAME_SLUG,
  name: '敲木鱼',
  description: '轻点木鱼一下，功德 +1。',
  cover_image: '',
  secondary_image: '',
  sound_file: '',
  background_music_file: ''
};

function shouldRestartHtmlAudio(audio) {
  if (!audio) return true;
  return Boolean(audio.paused || audio.ended);
}

const STORAGE_KEY = 'claw800_muyu_state_v1';
const TIP_SUCCESS_STORAGE_KEY = 'claw800_nexa_tip_last_success_v1';
const TIP_REWARD_MARKER_KEY = 'claw800_muyu_tip_reward_marker_v1';
const DEFAULT_STRIKE_AUDIO_SRC = '/audio/muyu-strike.mp3';
const DEFAULT_FISH_IMAGE_SRC = '/assets/muyu-fish-fixed.webp';
const DEFAULT_MALLET_IMAGE_SRC = '/assets/muyu-mallet-fixed.png';
const AUTO_STRIKE_INTERVAL_MS = 1000;
const TIP_MERIT_REWARD = 100;
const DESKTOP_BACKGROUND_MUSIC_VOLUME = 0.22;
const MOBILE_BACKGROUND_MUSIC_VOLUME = 0.015;
const DESKTOP_AMBIENT_MASTER_GAIN = 0.014;
const MOBILE_AMBIENT_MASTER_GAIN = 0.001;
const STRIKE_BODY_GAIN = 0.18;
const STRIKE_CLICK_GAIN = 0.05;

let audioContext = null;
let isStriking = false;
let autoStrikeTimer = null;
let ambientNodes = null;
let externalStrikeAudioAvailable = true;
let externalBackgroundMusicAvailable = false;
let strikeAudioSrc = DEFAULT_STRIKE_AUDIO_SRC;
let strikeAudioProbe = null;
let backgroundMusicSrc = '';
let backgroundMusicAudio = null;
let strikeAudioPrepared = false;
let backgroundMusicPrepared = false;
let fullConfigLoaded = false;
let lastRewardedTipOrderNo = '';

function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const narrowViewport = typeof window.innerWidth === 'number' && window.innerWidth <= 768;
  return coarse || narrowViewport;
}

function getBackgroundMusicVolume() {
  return isMobileDevice() ? MOBILE_BACKGROUND_MUSIC_VOLUME : DESKTOP_BACKGROUND_MUSIC_VOLUME;
}

function getAmbientMasterGain() {
  return isMobileDevice() ? MOBILE_AMBIENT_MASTER_GAIN : DESKTOP_AMBIENT_MASTER_GAIN;
}

function readCachedGameConfig() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(GAME_CONFIG_CACHE_KEY);
    if (!raw) return null;
    if (raw.length > MAX_INLINE_GAME_CONFIG_CACHE_SIZE) {
      window.localStorage.removeItem(GAME_CONFIG_CACHE_KEY);
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function toLightweightGameConfig(config) {
  const normalized = normalizeGameConfig(config);
  return {
    ...normalized,
    cover_image: normalized.cover_image.startsWith('data:') ? '' : normalized.cover_image,
    secondary_image: normalized.secondary_image.startsWith('data:') ? '' : normalized.secondary_image,
    sound_file: '',
    background_music_file: ''
  };
}

function writeCachedGameConfig(config) {
  if (typeof window === 'undefined' || !config) return;
  try {
    window.localStorage.setItem(GAME_CONFIG_CACHE_KEY, JSON.stringify(toLightweightGameConfig(config)));
  } catch {}
}

function normalizeGameConfig(config) {
  const source = config && typeof config === 'object' ? config : {};
  return {
    ...DEFAULT_GAME_CONFIG,
    ...source,
    slug: GAME_SLUG,
    name: String(source.name || DEFAULT_GAME_CONFIG.name).trim(),
    description: String(source.description || DEFAULT_GAME_CONFIG.description).trim(),
    cover_image: String(source.cover_image || '').trim(),
    secondary_image: String(source.secondary_image || '').trim(),
    sound_file: String(source.sound_file || '').trim(),
    background_music_file: String(source.background_music_file || '').trim()
  };
}

async function fetchGameConfig(pathname = `/api/games/${encodeURIComponent(GAME_SLUG)}`) {
  try {
    const res = await fetch(`${pathname}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.item ? normalizeGameConfig(data.item) : null;
  } catch {
    return null;
  }
}

async function fetchBootstrapConfig() {
  return fetchGameConfig(`/api/games/${encodeURIComponent(GAME_SLUG)}/bootstrap`);
}

async function ensureFullConfigLoaded() {
  if (fullConfigLoaded) return window.__GAME_CONFIG__;
  const config = await fetchGameConfig(`/api/games/${encodeURIComponent(GAME_SLUG)}`);
  if (config) {
    fullConfigLoaded = true;
    window.__GAME_CONFIG__ = config;
    writeCachedGameConfig(config);
    syncGameConfig();
  }
  return window.__GAME_CONFIG__;
}

function syncGameConfig(options = {}) {
  const { allowFallbackImages = true } = options;
  const config = normalizeGameConfig(window.__GAME_CONFIG__);
  const configuredSrc = config.sound_file;
  const configuredBackgroundMusicSrc = config.background_music_file;
  const fishImage = DEFAULT_FISH_IMAGE_SRC;
  const malletImage = DEFAULT_MALLET_IMAGE_SRC;
  const titleEl = document.getElementById('gamePageTitle');
  const subtitleEl = document.getElementById('gamePageSubtitle');
  strikeAudioSrc = configuredSrc || DEFAULT_STRIKE_AUDIO_SRC;
  backgroundMusicSrc = configuredBackgroundMusicSrc;
  if (titleEl) titleEl.textContent = config.name || DEFAULT_GAME_CONFIG.name;
  if (subtitleEl) subtitleEl.textContent = config.description || DEFAULT_GAME_CONFIG.description;
  document.title = `Claw800 ${config.name || DEFAULT_GAME_CONFIG.name}`;
  const fishImageEl = document.querySelector('.muyu-wood__image');
  const malletImageEl = document.querySelector('.muyu-mallet__image');
  if (fishImageEl) {
    const fallbackFish = String(fishImageEl.dataset.defaultSrc || DEFAULT_FISH_IMAGE_SRC).trim() || DEFAULT_FISH_IMAGE_SRC;
    fishImageEl.src = fishImage || (allowFallbackImages ? fallbackFish : '');
  }
  if (malletImageEl) {
    const fallbackMallet = String(malletImageEl.dataset.defaultSrc || DEFAULT_MALLET_IMAGE_SRC).trim() || DEFAULT_MALLET_IMAGE_SRC;
    malletImageEl.src = malletImage || (allowFallbackImages ? fallbackMallet : '');
  }
  externalBackgroundMusicAvailable = false;
  backgroundMusicAudio = null;
  strikeAudioPrepared = false;
  backgroundMusicPrepared = false;
  if (state.musicEnabled) {
    startAmbientMusic({ forceRestart: false });
  }
}

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDefaultState() {
  return {
    total: 0,
    today: 0,
    dateKey: getTodayKey(),
    musicEnabled: false,
    autoStrikeEnabled: false
  };
}

function loadState() {
  const fallback = getDefaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return fallback;
    if (parsed.dateKey !== fallback.dateKey) {
      return { ...fallback, total: Number(parsed.total) || 0 };
    }
    return {
      total: Number(parsed.total) || 0,
      today: Number(parsed.today) || 0,
      dateKey: parsed.dateKey || fallback.dateKey,
      musicEnabled: Boolean(parsed.musicEnabled),
      autoStrikeEnabled: Boolean(parsed.autoStrikeEnabled)
    };
  } catch {
    return fallback;
  }
}

let state = loadState();

function saveState() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadTipRewardMarker() {
  try {
    return String(window.localStorage.getItem(TIP_REWARD_MARKER_KEY) || '').trim();
  } catch {
    return '';
  }
}

function saveTipRewardMarker(orderNo) {
  lastRewardedTipOrderNo = String(orderNo || '').trim();
  try {
    if (lastRewardedTipOrderNo) {
      window.localStorage.setItem(TIP_REWARD_MARKER_KEY, lastRewardedTipOrderNo);
    }
  } catch {}
}

function renderState() {
  todayCountEl.textContent = `${state.today}`;
  if (heroCountEl) heroCountEl.textContent = `${state.total}`;
  if (musicToggleBtn) {
    musicToggleBtn.textContent = `背景音乐：${state.musicEnabled ? '开' : '关'}`;
    musicToggleBtn.classList.toggle('active', state.musicEnabled);
  }
  if (autoToggleBtn) {
    autoToggleBtn.textContent = `自动敲击：${state.autoStrikeEnabled ? '开' : '关'}`;
    autoToggleBtn.classList.toggle('active', state.autoStrikeEnabled);
  }
}

function runAfterNextPaint(callback) {
  if (typeof callback !== 'function') return;
  if (typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(() => {
      window.setTimeout(callback, 0);
    });
    return;
  }
  window.setTimeout(callback, 0);
}

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) {
    audioContext = new AudioContextClass();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

function playGeneratedWoodSound() {
  const context = getAudioContext();
  if (!context) return;

  const startAt = context.currentTime + 0.01;
  const bodyOsc = context.createOscillator();
  const bodyGain = context.createGain();
  const clickOsc = context.createOscillator();
  const clickGain = context.createGain();
  const resonantFilter = context.createBiquadFilter();

  resonantFilter.type = 'bandpass';
  resonantFilter.frequency.setValueAtTime(820, startAt);
  resonantFilter.Q.setValueAtTime(5.5, startAt);

  bodyOsc.type = 'triangle';
  bodyOsc.frequency.setValueAtTime(430, startAt);
  bodyOsc.frequency.exponentialRampToValueAtTime(185, startAt + 0.22);

  bodyGain.gain.setValueAtTime(0.0001, startAt);
  bodyGain.gain.exponentialRampToValueAtTime(STRIKE_BODY_GAIN, startAt + 0.008);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.24);

  clickOsc.type = 'square';
  clickOsc.frequency.setValueAtTime(1380, startAt);
  clickOsc.frequency.exponentialRampToValueAtTime(620, startAt + 0.05);

  clickGain.gain.setValueAtTime(0.0001, startAt);
  clickGain.gain.exponentialRampToValueAtTime(STRIKE_CLICK_GAIN, startAt + 0.002);
  clickGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.06);

  bodyOsc.connect(resonantFilter);
  resonantFilter.connect(bodyGain);
  bodyGain.connect(context.destination);

  clickOsc.connect(clickGain);
  clickGain.connect(context.destination);

  bodyOsc.start(startAt);
  bodyOsc.stop(startAt + 0.25);
  clickOsc.start(startAt);
  clickOsc.stop(startAt + 0.07);
}

function playWoodSound() {
  prepareStrikeAudio();
  if (!externalStrikeAudioAvailable || typeof Audio === 'undefined') {
    playGeneratedWoodSound();
    return;
  }

  try {
    const sound = strikeAudioProbe?.cloneNode ? strikeAudioProbe.cloneNode() : new Audio(strikeAudioSrc);
    sound.currentTime = 0;
    sound.volume = 1;
    sound.play().catch(() => {
      externalStrikeAudioAvailable = false;
      playGeneratedWoodSound();
    });
  } catch {
    externalStrikeAudioAvailable = false;
    playGeneratedWoodSound();
  }
}

function stopAmbientMusic() {
  if (backgroundMusicAudio) {
    try {
      backgroundMusicAudio.pause();
      backgroundMusicAudio.currentTime = 0;
    } catch {}
  }
  if (!ambientNodes) return;
  const { context, masterGain, nodes = [] } = ambientNodes;
  const now = context.currentTime;
  masterGain.gain.cancelScheduledValues(now);
  masterGain.gain.setValueAtTime(masterGain.gain.value || getAmbientMasterGain(), now);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
  nodes.forEach((node) => {
    try {
      node.stop(now + 0.4);
    } catch {}
  });
  ambientNodes = null;
}

function prepareStrikeAudio() {
  if (strikeAudioPrepared || typeof Audio === 'undefined') return;
  strikeAudioPrepared = true;
  externalStrikeAudioAvailable = true;
  strikeAudioProbe = new Audio(strikeAudioSrc);
  strikeAudioProbe.preload = 'auto';
  strikeAudioProbe.addEventListener('error', () => {
    externalStrikeAudioAvailable = false;
  }, { once: true });
  try {
    strikeAudioProbe.load();
  } catch {}
}

function prepareBackgroundMusic() {
  if (backgroundMusicPrepared || !backgroundMusicSrc || typeof Audio === 'undefined') return;
  backgroundMusicPrepared = true;
  externalBackgroundMusicAvailable = false;
  backgroundMusicAudio = new Audio(backgroundMusicSrc);
  backgroundMusicAudio.preload = 'metadata';
  backgroundMusicAudio.loop = true;
  backgroundMusicAudio.volume = getBackgroundMusicVolume();
  backgroundMusicAudio.addEventListener('canplaythrough', () => {
    externalBackgroundMusicAvailable = true;
    if (state.musicEnabled) {
      try {
        backgroundMusicAudio.play().catch(() => {});
      } catch {}
    }
  });
  backgroundMusicAudio.addEventListener('error', () => {
    externalBackgroundMusicAvailable = false;
  }, { once: true });
  try {
    backgroundMusicAudio.load();
  } catch {}
}

function startAmbientMusic(options = {}) {
  const { forceRestart = false } = options;
  prepareBackgroundMusic();
  if (backgroundMusicAudio) {
    try {
      if (forceRestart || shouldRestartHtmlAudio(backgroundMusicAudio)) {
        if (forceRestart) backgroundMusicAudio.currentTime = 0;
      } else {
        return;
      }
      backgroundMusicAudio.play().catch(() => {
        externalBackgroundMusicAvailable = false;
        startAmbientMusic();
      });
      return;
    } catch {
      externalBackgroundMusicAvailable = false;
    }
  }
  if (ambientNodes) return;
  const context = getAudioContext();
  if (!context) return;

  const masterGain = context.createGain();
  masterGain.gain.setValueAtTime(0.0001, context.currentTime);
  masterGain.gain.exponentialRampToValueAtTime(getAmbientMasterGain(), context.currentTime + 0.6);
  masterGain.connect(context.destination);

  const droneOsc = context.createOscillator();
  const droneGain = context.createGain();
  const droneFilter = context.createBiquadFilter();
  droneOsc.type = 'sine';
  droneOsc.frequency.setValueAtTime(174.61, context.currentTime);
  droneFilter.type = 'lowpass';
  droneFilter.frequency.setValueAtTime(620, context.currentTime);
  droneGain.gain.setValueAtTime(getAmbientMasterGain() * 0.64, context.currentTime);
  droneOsc.connect(droneFilter);
  droneFilter.connect(droneGain);
  droneGain.connect(masterGain);
  droneOsc.start();

  const shimmerOsc = context.createOscillator();
  const shimmerGain = context.createGain();
  const shimmerLfo = context.createOscillator();
  const shimmerLfoGain = context.createGain();
  shimmerOsc.type = 'triangle';
  shimmerOsc.frequency.setValueAtTime(523.25, context.currentTime);
  shimmerGain.gain.setValueAtTime(getAmbientMasterGain() * 0.14, context.currentTime);
  shimmerLfo.type = 'sine';
  shimmerLfo.frequency.setValueAtTime(0.18, context.currentTime);
  shimmerLfoGain.gain.setValueAtTime(getAmbientMasterGain() * 0.1, context.currentTime);
  shimmerLfo.connect(shimmerLfoGain);
  shimmerLfoGain.connect(shimmerGain.gain);
  shimmerOsc.connect(shimmerGain);
  shimmerGain.connect(masterGain);
  shimmerOsc.start();
  shimmerLfo.start();

  ambientNodes = {
    context,
    masterGain,
    nodes: [droneOsc, shimmerOsc, shimmerLfo]
  };
}

function syncAmbientMusic() {
  if (state.musicEnabled) startAmbientMusic({ forceRestart: false });
  else stopAmbientMusic();
}

function stopAutoStrike() {
  if (!autoStrikeTimer) return;
  window.clearInterval(autoStrikeTimer);
  autoStrikeTimer = null;
}

function syncAutoStrike() {
  stopAutoStrike();
  if (!state.autoStrikeEnabled) return;
  autoStrikeTimer = window.setInterval(() => {
    strikeWood();
  }, AUTO_STRIKE_INTERVAL_MS);
}

function strikeWood() {
  if (isStriking) return;
  isStriking = true;
  if (!fullConfigLoaded) {
    ensureFullConfigLoaded().catch(() => {});
  }
  playWoodSound();

  const todayKey = getTodayKey();
  if (state.dateKey !== todayKey) {
    state.dateKey = todayKey;
    state.today = 0;
  }

  state.total += 1;
  state.today += 1;
  saveState();
  renderState();

  strikeBtn.classList.add('is-striking');
  blessingTextEl?.classList.remove('is-active');
  void blessingTextEl?.offsetWidth;
  blessingTextEl?.classList.add('is-active');
  hintEl.textContent = `功德 +1，今日已积 ${state.today}`;

  window.setTimeout(() => {
    strikeBtn.classList.remove('is-striking');
    isStriking = false;
  }, 180);
  window.setTimeout(() => {
    blessingTextEl?.classList.remove('is-active');
  }, 1200);
}

function applyTipMeritReward() {
  const todayKey = getTodayKey();
  if (state.dateKey !== todayKey) {
    state.dateKey = todayKey;
    state.today = 0;
  }

  state.total += TIP_MERIT_REWARD;
  state.today += TIP_MERIT_REWARD;
  saveState();
  renderState();
  hintEl.textContent = `谢谢打赏，佛祖会保佑您,功德+100! 今日已积 ${state.today}`;
  runAfterNextPaint(() => {
    window.alert('谢谢打赏，佛祖会保佑您,功德+100!');
  });
}

function readTipSuccessReceipt() {
  try {
    const raw = window.localStorage.getItem(TIP_SUCCESS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function clearTipSuccessReceipt() {
  try {
    window.localStorage.removeItem(TIP_SUCCESS_STORAGE_KEY);
  } catch {}
}

function applyTipRewardFromDetail(detail) {
  const gameSlug = String(detail?.gameSlug || '').trim();
  const orderNo = String(detail?.orderNo || '').trim();
  if (gameSlug !== GAME_SLUG || !orderNo) return false;
  if (orderNo === lastRewardedTipOrderNo) {
    clearTipSuccessReceipt();
    return false;
  }
  saveTipRewardMarker(orderNo);
  clearTipSuccessReceipt();
  applyTipMeritReward();
  return true;
}

function syncTipRewardReceipt() {
  const receipt = readTipSuccessReceipt();
  if (!receipt) return false;
  return applyTipRewardFromDetail(receipt);
}

function resetState() {
  state = getDefaultState();
  saveState();
  renderState();
  syncAmbientMusic();
  syncAutoStrike();
  hintEl.textContent = '已经清零，可以重新开始积功德。';
}

function toggleMusic() {
  state.musicEnabled = !state.musicEnabled;
  saveState();
  renderState();
  if (state.musicEnabled) {
    ensureFullConfigLoaded()
      .catch(() => {})
      .finally(() => {
        syncAmbientMusic();
      });
    hintEl.textContent = '背景音乐正在开启，静心积功德。';
    return;
  }
  syncAmbientMusic();
  hintEl.textContent = '背景音乐已关闭。';
}

function toggleAutoStrike() {
  state.autoStrikeEnabled = !state.autoStrikeEnabled;
  saveState();
  renderState();
  syncAutoStrike();
  hintEl.textContent = state.autoStrikeEnabled
    ? '自动敲击已开启，每秒自动敲击 1 下。'
    : '自动敲击已关闭。';
}

renderState();
syncAmbientMusic();
syncAutoStrike();
lastRewardedTipOrderNo = loadTipRewardMarker();
syncTipRewardReceipt();
const initialCachedConfig = readCachedGameConfig();
window.__GAME_CONFIG__ = normalizeGameConfig(initialCachedConfig || DEFAULT_GAME_CONFIG);
syncGameConfig({
  allowFallbackImages: Boolean(initialCachedConfig?.cover_image || initialCachedConfig?.secondary_image)
});

if (typeof window !== 'undefined') {
  const schedule = typeof window.requestIdleCallback === 'function'
    ? window.requestIdleCallback.bind(window)
    : (cb) => window.setTimeout(cb, 120);
  schedule(() => {
    prepareStrikeAudio();
    if (state.musicEnabled) prepareBackgroundMusic();
  });
  fetchBootstrapConfig().then((config) => {
    if (!config) {
      syncGameConfig({ allowFallbackImages: true });
      return;
    }
    window.__GAME_CONFIG__ = config;
    writeCachedGameConfig(config);
    syncGameConfig({ allowFallbackImages: true });
  }).catch(() => {
    syncGameConfig({ allowFallbackImages: true });
  });
}

strikeBtn?.addEventListener('click', strikeWood);
resetBtn?.addEventListener('click', resetState);
musicToggleBtn?.addEventListener('click', toggleMusic);
autoToggleBtn?.addEventListener('click', toggleAutoStrike);
window.addEventListener('claw800:tip-success', (event) => {
  applyTipRewardFromDetail(event.detail);
});

window.addEventListener('pageshow', () => {
  state = loadState();
  renderState();
  syncTipRewardReceipt();
});

window.addEventListener('beforeunload', () => {
  stopAutoStrike();
});
