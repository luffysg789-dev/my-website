const TOTAL_BALLOONS = 50;
const MIN_BOMB_COUNT = 1;
const MAX_BOMB_COUNT = 49;
const DEFAULT_BOMB_COUNT = 6;
const BALLOON_TONES = 5;
const EXPLOSION_DURATION = 0.96;
const EXPLOSION_GAIN = 0.58;

const ui = {
  board: document.getElementById('balloonsBoard'),
  bombsLeft: document.getElementById('balloonsBombsLeft'),
  safeLeft: document.getElementById('balloonsSafeLeft'),
  overlay: document.getElementById('balloonsOverlay'),
  overlayEyebrow: document.getElementById('balloonsOverlayEyebrow'),
  overlayTitle: document.getElementById('balloonsOverlayTitle'),
  overlayDesc: document.getElementById('balloonsOverlayDesc'),
  setupControls: document.getElementById('balloonsSetupControls'),
  bombCountRange: document.getElementById('balloonsBombCountRange'),
  bombCountValue: document.getElementById('balloonsBombCountValue'),
  startBtn: document.getElementById('balloonsStartBtn'),
  replayBtn: document.getElementById('balloonsReplayBtn'),
  resetSetupBtn: document.getElementById('balloonsResetSetupBtn'),
  presetButtons: Array.from(document.querySelectorAll('[data-bomb-preset]'))
};

const state = {
  phase: 'setup',
  bombCountSetting: DEFAULT_BOMB_COUNT,
  remainingBombs: DEFAULT_BOMB_COUNT,
  bombIndexes: new Set(),
  poppedIndexes: new Set(),
  boardBuilt: false
};

let audioContext = null;

function clampBombCount(value) {
  return Math.max(MIN_BOMB_COUNT, Math.min(MAX_BOMB_COUNT, Number(value) || DEFAULT_BOMB_COUNT));
}

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) audioContext = new AudioContextClass();
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

function playPopSound() {
  const context = getAudioContext();
  if (!context) return;
  const startAt = context.currentTime + 0.01;
  const osc = context.createOscillator();
  const gain = context.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(780, startAt);
  osc.frequency.exponentialRampToValueAtTime(320, startAt + 0.08);

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(0.12, startAt + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.11);

  osc.connect(gain);
  gain.connect(context.destination);
  osc.start(startAt);
  osc.stop(startAt + 0.12);
}

function playExplosionSound() {
  const context = getAudioContext();
  if (!context) return;
  const duration = EXPLOSION_DURATION;
  const buffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate);
  const data = buffer.getChannelData(0);

  for (let index = 0; index < data.length; index += 1) {
    const progress = index / data.length;
    const envelope = Math.pow(1 - progress, 2);
    data[index] = (Math.random() * 2 - 1) * envelope;
  }

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  const startAt = context.currentTime + 0.01;
  const subOsc = context.createOscillator();
  const subGain = context.createGain();

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(980, startAt);
  filter.frequency.exponentialRampToValueAtTime(150, startAt + duration);

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(EXPLOSION_GAIN, startAt + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  subOsc.type = 'triangle';
  subOsc.frequency.setValueAtTime(112, startAt);
  subOsc.frequency.exponentialRampToValueAtTime(44, startAt + duration);

  subGain.gain.setValueAtTime(0.0001, startAt);
  subGain.gain.exponentialRampToValueAtTime(0.24, startAt + 0.03);
  subGain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  source.buffer = buffer;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  subOsc.connect(subGain);
  subGain.connect(context.destination);
  source.start(startAt);
  subOsc.start(startAt);
  subOsc.stop(startAt + duration);
}

function createBombIndexes(total, count) {
  const indexes = new Set();
  while (indexes.size < count) {
    indexes.add(Math.floor(Math.random() * total));
  }
  return indexes;
}

function updatePresetButtons() {
  ui.presetButtons.forEach((button) => {
    button.classList.toggle('is-active', Number(button.dataset.bombPreset) === state.bombCountSetting);
  });
}

function updateStats() {
  ui.bombsLeft.textContent = `${state.remainingBombs}`;
  ui.safeLeft.textContent = `${Math.max(TOTAL_BALLOONS - state.poppedIndexes.size, 0)}`;
}

function updateBombSetting(value) {
  state.bombCountSetting = clampBombCount(value);
  ui.bombCountRange.value = `${state.bombCountSetting}`;
  ui.bombCountValue.textContent = `${state.bombCountSetting}`;
  updatePresetButtons();
  if (state.phase !== 'playing') {
    state.remainingBombs = state.bombCountSetting;
    updateStats();
  }
}

function renderOverlay(mode = 'setup') {
  ui.overlay.classList.remove('is-hidden');

  if (mode === 'setup') {
    state.phase = 'setup';
    ui.overlayEyebrow.textContent = '准备开局';
    ui.overlayTitle.textContent = '设置炸弹数量';
    ui.overlayDesc.textContent = '页面中共有50个气球，先决定要放几个炸弹，再开始挑战。';
    ui.setupControls.classList.remove('hidden');
    ui.startBtn.classList.remove('hidden');
    ui.replayBtn.classList.add('hidden');
    ui.resetSetupBtn.classList.add('hidden');
    return;
  }

  state.phase = 'finished';
  ui.overlayEyebrow.textContent = '游戏结束';
  ui.overlayTitle.textContent = '炸弹已经清零';
  ui.overlayDesc.textContent = `本局使用 ${state.bombCountSetting} 个炸弹，点“重新开始”可沿用上次设置继续。`;
  ui.setupControls.classList.add('hidden');
  ui.startBtn.classList.add('hidden');
  ui.replayBtn.classList.remove('hidden');
  ui.resetSetupBtn.classList.remove('hidden');
}

function hideOverlay() {
  ui.overlay.classList.add('is-hidden');
}

function finishGame() {
  renderOverlay('result');
}

function markBalloonState(index, className) {
  const cell = ui.board.querySelector(`[data-balloon-index="${index}"]`);
  if (!cell) return;
  cell.classList.add(className);
  cell.disabled = true;
}

function handleBalloonPress(index) {
  if (state.phase !== 'playing') return;
  if (state.poppedIndexes.has(index)) return;

  state.poppedIndexes.add(index);

  if (state.bombIndexes.has(index)) {
    state.remainingBombs -= 1;
    playExplosionSound();
    if (navigator.vibrate) navigator.vibrate(120);
    ui.board.classList.add('has-bomb-flash');
    window.setTimeout(() => {
      ui.board.classList.remove('has-bomb-flash');
    }, 520);
    markBalloonState(index, 'is-bomb-hit');
  } else {
    playPopSound();
    markBalloonState(index, 'is-popped');
  }

  updateStats();

  if (state.remainingBombs <= 0) {
    finishGame();
  }
}

function buildBoard() {
  if (state.boardBuilt) return;
  const fragment = document.createDocumentFragment();

  for (let index = 0; index < TOTAL_BALLOONS; index += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'balloon-cell';
    button.innerHTML = '<span class="balloon-cell__bomb" aria-hidden="true">💣</span>';
    button.dataset.balloonIndex = `${index}`;
    button.dataset.tone = `${index % BALLOON_TONES}`;
    button.setAttribute('aria-label', `第 ${index + 1} 个气球`);
    button.addEventListener('pointerdown', () => {
      handleBalloonPress(index);
    });
    fragment.appendChild(button);
  }

  ui.board.appendChild(fragment);
  state.boardBuilt = true;
}

function resetBoardAppearance() {
  ui.board.querySelectorAll('.balloon-cell').forEach((cell, index) => {
    cell.classList.remove('is-popped', 'is-bomb-hit');
    cell.disabled = false;
    cell.dataset.tone = `${index % BALLOON_TONES}`;
  });
}

function startGame(options = {}) {
  buildBoard();
  const useLastSetting = options.useLastSetting !== false;
  const bombCount = useLastSetting ? state.bombCountSetting : clampBombCount(ui.bombCountRange.value);
  updateBombSetting(bombCount);
  state.bombIndexes = createBombIndexes(TOTAL_BALLOONS, bombCount);
  state.poppedIndexes = new Set();
  state.remainingBombs = bombCount;
  state.phase = 'playing';
  resetBoardAppearance();
  updateStats();
  hideOverlay();
}

function bindEvents() {
  ui.bombCountRange.addEventListener('input', (event) => {
    updateBombSetting(event.target.value);
  });

  ui.presetButtons.forEach((button) => {
    button.addEventListener('click', () => {
      updateBombSetting(button.dataset.bombPreset);
    });
  });

  ui.startBtn.addEventListener('click', () => {
    startGame({ useLastSetting: false });
  });

  ui.replayBtn.addEventListener('click', () => {
    startGame({ useLastSetting: true });
  });

  ui.resetSetupBtn.addEventListener('click', () => {
    renderOverlay('setup');
    state.remainingBombs = state.bombCountSetting;
    updateStats();
  });
}

function init() {
  updateBombSetting(DEFAULT_BOMB_COUNT);
  updateStats();
  buildBoard();
  renderOverlay('setup');
  bindEvents();
}

window.ClawGamesConfig?.bootstrapGamePage?.('blast-balloons');
init();
