const GAME_SLUG = 'xiangqi';
const FILE_LABELS = ['9', '8', '7', '6', '5', '4', '3', '2', '1'];
const RANK_LABELS = ['9', '8', '7', '6', '5', '4', '3', '2', '1', '0'];
const NEXA_API_KEY = 'NEXA2033522880098676737';
const NEXA_PROTOCOL_AUTH_BASE = 'nexaauth://oauth/authorize';
const NEXA_PROTOCOL_ORDER_BASE = 'nexaauth://order';
const XIANGQI_MOVE_AUDIO_SRC = '/audio/muyu-strike.mp3';
const SESSION_STORAGE_KEY = 'claw800_nexa_tip_session_v1';
const XIANGQI_USER_STORAGE_KEY = 'claw800_xiangqi_user_v1';
const XIANGQI_PENDING_DEPOSIT_KEY = 'claw800_xiangqi_pending_deposit_v1';
const XIANGQI_PENDING_ACTION_KEY = 'claw800_xiangqi_pending_action_v1';
const XIANGQI_BROWSER_LOCAL_OPEN_ID = 'xiangqi-browser-local';
const PIECE_LABELS = {
  RED: {
    rook: '车',
    knight: '马',
    elephant: '相',
    advisor: '仕',
    king: '帅',
    cannon: '炮',
    pawn: '兵'
  },
  BLACK: {
    rook: '車',
    knight: '馬',
    elephant: '象',
    advisor: '士',
    king: '将',
    cannon: '炮',
    pawn: '卒'
  }
};

const ui = {
  shell: document.querySelector('.xiangqi-shell'),
  board: document.getElementById('xiangqiBoard'),
  walletAvailable: document.getElementById('xiangqiWalletAvailable'),
  walletFrozen: document.getElementById('xiangqiWalletFrozen'),
  amountModal: document.getElementById('xiangqiAmountModal'),
  amountInput: document.getElementById('xiangqiAmountInput'),
  amountConfirmBtn: document.getElementById('xiangqiAmountConfirmBtn'),
  amountCancelBtn: document.getElementById('xiangqiAmountCancelBtn'),
  roomSummary: document.getElementById('xiangqiRoomSummary'),
  roomBadge: document.getElementById('xiangqiRoomBadge'),
  matchStake: document.getElementById('xiangqiMatchStake'),
  matchStatus: document.getElementById('xiangqiMatchStatus'),
  topCard: document.getElementById('xiangqiTopCard'),
  topSide: document.getElementById('xiangqiTopSide'),
  topPlayer: document.getElementById('xiangqiTopPlayer'),
  topTime: document.getElementById('xiangqiTopTime'),
  bottomCard: document.getElementById('xiangqiBottomCard'),
  bottomSide: document.getElementById('xiangqiBottomSide'),
  bottomPlayer: document.getElementById('xiangqiBottomPlayer'),
  bottomTime: document.getElementById('xiangqiBottomTime'),
  boardOverlay: document.getElementById('xiangqiBoardOverlay'),
  boardOverlayMessage: document.getElementById('xiangqiBoardOverlayMessage'),
  boardOverlayDetail: document.getElementById('xiangqiBoardOverlayDetail'),
  startMatchBtn: document.getElementById('xiangqiStartMatchBtn'),
  createStake: document.getElementById('xiangqiCreateStake'),
  createTimeControl: document.getElementById('xiangqiCreateTimeControl'),
  joinRoomCode: document.getElementById('xiangqiJoinRoomCode'),
  depositBtn: document.getElementById('xiangqiDepositBtn'),
  withdrawBtn: document.getElementById('xiangqiWithdrawBtn'),
  createRoomBtn: document.getElementById('xiangqiCreateRoomBtn'),
  joinRoomBtn: document.getElementById('xiangqiJoinRoomBtn'),
  cancelRoomBtn: document.getElementById('xiangqiCancelRoomBtn'),
  actionCopyRoomBtn: document.getElementById('xiangqiActionCopyRoomBtn'),
  actionDrawBtn: document.getElementById('xiangqiActionDrawBtn'),
  actionResignBtn: document.getElementById('xiangqiActionResignBtn'),
  stakePresetButtons: Array.from(document.querySelectorAll('[data-stake-preset]')),
  timePresetButtons: Array.from(document.querySelectorAll('[data-time-preset]'))
};

const state = {
  session: null,
  user: null,
  wallet: {
    availableBalance: '0.00',
    frozenBalance: '0.00'
  },
  room: null,
  match: null,
  selected: null,
  roomEventSource: null,
  countdownTimer: 0,
  timeoutSubmitting: false,
  amountRequest: null,
  moveAudio: null,
  moveAudioUnlocked: false
};

function buildPreviewPieces() {
  return [
    { file: 0, rank: 0, side: 'BLACK', type: 'rook' },
    { file: 1, rank: 0, side: 'BLACK', type: 'knight' },
    { file: 2, rank: 0, side: 'BLACK', type: 'elephant' },
    { file: 3, rank: 0, side: 'BLACK', type: 'advisor' },
    { file: 4, rank: 0, side: 'BLACK', type: 'king' },
    { file: 5, rank: 0, side: 'BLACK', type: 'advisor' },
    { file: 6, rank: 0, side: 'BLACK', type: 'elephant' },
    { file: 7, rank: 0, side: 'BLACK', type: 'knight' },
    { file: 8, rank: 0, side: 'BLACK', type: 'rook' },
    { file: 1, rank: 2, side: 'BLACK', type: 'cannon' },
    { file: 7, rank: 2, side: 'BLACK', type: 'cannon' },
    { file: 0, rank: 3, side: 'BLACK', type: 'pawn' },
    { file: 2, rank: 3, side: 'BLACK', type: 'pawn' },
    { file: 4, rank: 3, side: 'BLACK', type: 'pawn' },
    { file: 6, rank: 3, side: 'BLACK', type: 'pawn' },
    { file: 8, rank: 3, side: 'BLACK', type: 'pawn' },
    { file: 0, rank: 9, side: 'RED', type: 'rook' },
    { file: 1, rank: 9, side: 'RED', type: 'knight' },
    { file: 2, rank: 9, side: 'RED', type: 'elephant' },
    { file: 3, rank: 9, side: 'RED', type: 'advisor' },
    { file: 4, rank: 9, side: 'RED', type: 'king' },
    { file: 5, rank: 9, side: 'RED', type: 'advisor' },
    { file: 6, rank: 9, side: 'RED', type: 'elephant' },
    { file: 7, rank: 9, side: 'RED', type: 'knight' },
    { file: 8, rank: 9, side: 'RED', type: 'rook' },
    { file: 1, rank: 7, side: 'RED', type: 'cannon' },
    { file: 7, rank: 7, side: 'RED', type: 'cannon' },
    { file: 0, rank: 6, side: 'RED', type: 'pawn' },
    { file: 2, rank: 6, side: 'RED', type: 'pawn' },
    { file: 4, rank: 6, side: 'RED', type: 'pawn' },
    { file: 6, rank: 6, side: 'RED', type: 'pawn' },
    { file: 8, rank: 6, side: 'RED', type: 'pawn' }
  ];
}

function getPersistentStorage() {
  try {
    return window.localStorage;
  } catch {
    return window.sessionStorage;
  }
}

function loadCachedNexaSession() {
  try {
    const raw = getPersistentStorage().getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.openId || !parsed.sessionKey) return null;
    return {
      openId: String(parsed.openId || '').trim(),
      sessionKey: String(parsed.sessionKey || '').trim()
    };
  } catch {
    return null;
  }
}

function saveCachedSession(session) {
  try {
    const normalizedSession = {
      openId: String(session?.openId || '').trim(),
      sessionKey: String(session?.sessionKey || '').trim()
    };
    if (!normalizedSession.openId || !normalizedSession.sessionKey) return;
    getPersistentStorage().setItem(SESSION_STORAGE_KEY, JSON.stringify(normalizedSession));
  } catch {}
}

function clearCachedSession() {
  try {
    getPersistentStorage().removeItem(SESSION_STORAGE_KEY);
  } catch {}
}

function loadCachedUser() {
  try {
    const raw = getPersistentStorage().getItem(XIANGQI_USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCachedUser(user) {
  try {
    getPersistentStorage().setItem(XIANGQI_USER_STORAGE_KEY, JSON.stringify(user));
  } catch {}
}

function savePendingDeposit(order) {
  try {
    getPersistentStorage().setItem(XIANGQI_PENDING_DEPOSIT_KEY, JSON.stringify(order));
  } catch {}
}

function loadPendingDeposit() {
  try {
    const raw = getPersistentStorage().getItem(XIANGQI_PENDING_DEPOSIT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearPendingDeposit() {
  try {
    getPersistentStorage().removeItem(XIANGQI_PENDING_DEPOSIT_KEY);
  } catch {}
}

function savePendingAction(action) {
  try {
    getPersistentStorage().setItem(XIANGQI_PENDING_ACTION_KEY, JSON.stringify(action));
  } catch {}
}

function loadPendingAction() {
  try {
    const raw = getPersistentStorage().getItem(XIANGQI_PENDING_ACTION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearPendingAction() {
  try {
    getPersistentStorage().removeItem(XIANGQI_PENDING_ACTION_KEY);
  } catch {}
}

function buildCleanReturnUrl() {
  const url = new URL(window.location.href);
  ['code', 'authCode', 'auth_code', 'state'].forEach((key) => url.searchParams.delete(key));
  return url.toString();
}

function buildNexaPaymentUrl(payment) {
  const redirectUrl = buildCleanReturnUrl();
  const params = new URLSearchParams({
    orderNo: String(payment?.orderNo || '').trim(),
    paySign: String(payment?.paySign || '').trim(),
    signType: String(payment?.signType || 'MD5').trim(),
    apiKey: String(payment?.apiKey || NEXA_API_KEY).trim(),
    nonce: String(payment?.nonce || '').trim(),
    timestamp: String(payment?.timestamp || '').trim(),
    redirectUrl
  });
  return `${NEXA_PROTOCOL_ORDER_BASE}?${params.toString()}`;
}

function isNexaAppEnvironment() {
  const userAgent = String(window.navigator?.userAgent || '').trim();
  const referrer = String(document.referrer || '').trim();
  const hasNexaMarker = /nexa/i.test(userAgent) || /nexa/i.test(referrer);
  return Boolean(hasNexaMarker || state.session?.openId);
}

function isLocalDevelopmentHost() {
  const hostname = String(window.location.hostname || '').trim().toLowerCase();
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function buildNexaAuthorizeUrl() {
  const redirectUri = buildCleanReturnUrl();
  return `${NEXA_PROTOCOL_AUTH_BASE}?apikey=${encodeURIComponent(NEXA_API_KEY)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
}

function launchNexaUrl(url) {
  const targetUrl = String(url || '').trim();
  if (!targetUrl) return;
  window.location.href = targetUrl;
}

function primeMoveAudio() {
  if (state.moveAudio) return state.moveAudio;
  try {
    state.moveAudio = new Audio(XIANGQI_MOVE_AUDIO_SRC);
    state.moveAudio.preload = 'auto';
  } catch {
    state.moveAudio = null;
  }
  return state.moveAudio;
}

async function unlockMoveSound() {
  if (state.moveAudioUnlocked) return;
  const audio = primeMoveAudio();
  if (!audio || typeof audio.play !== 'function') return;
  try {
    const previousMuted = Boolean(audio.muted);
    const previousVolume = Number(audio.volume);
    audio.muted = true;
    audio.volume = 0;
    audio.currentTime = 0;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    audio.muted = previousMuted;
    audio.volume = Number.isFinite(previousVolume) ? previousVolume : 1;
    state.moveAudioUnlocked = true;
  } catch {}
}

function playMoveSound() {
  const baseAudio = primeMoveAudio();
  if (!baseAudio) return;
  try {
    const playableAudio = typeof baseAudio.cloneNode === 'function'
      ? baseAudio.cloneNode()
      : new Audio(XIANGQI_MOVE_AUDIO_SRC);
    playableAudio.volume = 0.55;
    playableAudio.currentTime = 0;
    playableAudio.play().catch(() => {});
  } catch {}
}

function speakXiangqiCue(cue) {
  const normalizedCue = String(cue || '').trim().toLowerCase();
  if (normalizedCue !== 'check' && normalizedCue !== 'capture') return;
  try {
    if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance !== 'function') return;
    const utterance = new window.SpeechSynthesisUtterance();
    utterance.lang = 'zh-CN';
    utterance.text = cue === 'check' ? '将军' : '吃';
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  } catch {}
}

function extractAuthCodeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return (
    String(params.get('code') || '').trim() ||
    String(params.get('authCode') || '').trim() ||
    String(params.get('auth_code') || '').trim()
  );
}

function clearAuthCodeFromUrl() {
  const url = new URL(window.location.href);
  ['code', 'authCode', 'auth_code', 'state'].forEach((key) => url.searchParams.delete(key));
  window.history.replaceState({}, document.title, url.toString());
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(String(json?.error || json?.message || '请求失败'));
    error.statusCode = Number(response.status || 0) || 0;
    throw error;
  }
  return json;
}

function postJson(url, body) {
  return fetchJson(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
}

function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.ceil(Number(ms || 0) / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function getFriendlyXiangqiErrorMessage(error, context = '') {
  const code = String(error?.message || error?.error || '').trim().toUpperCase();
  if (code === 'INSUFFICIENT_BALANCE') {
    return context === 'create_room' ? '余额不足，无法创建房间。' : '余额不足，无法加入房间。';
  }
  return String(error?.message || '操作失败，请稍后再试。');
}

function showCreateRoomInsufficientBalanceAlert(message) {
  if (message !== '余额不足，无法创建房间。') return;
  if (typeof window.alert === 'function') {
    window.alert('余额不足，无法创建房间。');
  }
}

function sanitizeMoneyInput(value) {
  const raw = String(value || '');
  let next = raw.replace(/,/g, '.').replace(/[^\d.]/g, '');
  const firstDot = next.indexOf('.');
  if (firstDot >= 0) {
    next = `${next.slice(0, firstDot + 1)}${next.slice(firstDot + 1).replace(/\./g, '')}`;
  }
  const [whole = '', fraction = ''] = next.split('.');
  const normalizedWhole = whole.replace(/^0+(?=\d)/, '');
  if (next.includes('.')) {
    return `${normalizedWhole || '0'}.${fraction.slice(0, 2)}`;
  }
  return normalizedWhole;
}

function closeAmountModal() {
  if (ui.amountModal) {
    ui.amountModal.hidden = true;
  }
  if (ui.amountInput) {
    ui.amountInput.value = '';
  }
  state.amountRequest = null;
}

function openAmountModal(title, resolve) {
  if (!ui.amountModal || !ui.amountInput || !ui.amountConfirmBtn) {
    resolve('');
    return;
  }
  const titleNode = document.getElementById('xiangqiAmountTitle');
  if (titleNode) {
    titleNode.textContent = String(title || '输入金额');
  }
  state.amountRequest = { resolve };
  ui.amountModal.hidden = false;
  ui.amountInput.value = '';
  window.setTimeout(() => {
    ui.amountInput?.focus();
  }, 30);
}

function requestAmount(title) {
  return new Promise((resolve) => {
    openAmountModal(title, resolve);
  });
}

function setStatus(message) {
  if (ui.matchStatus) {
    ui.matchStatus.textContent = String(message || '');
  }
}

function updateLoginButtonState() {
  if (ui.withdrawBtn) {
    ui.withdrawBtn.disabled = !isNexaAppEnvironment();
  }
}

function getCurrentUserSide() {
  if (!state.user || !state.match) return '';
  if (Number(state.user.userId) === Number(state.match.redUserId)) return 'RED';
  if (Number(state.user.userId) === Number(state.match.blackUserId)) return 'BLACK';
  return '';
}

function renderWallet() {
  if (ui.walletAvailable) ui.walletAvailable.textContent = state.wallet.availableBalance;
  if (ui.walletFrozen) ui.walletFrozen.textContent = `${state.wallet.frozenBalance} USDT`;
}

function syncRoomUrl(roomCode) {
  const url = new URL(window.location.href);
  if (roomCode) {
    url.searchParams.set('room', String(roomCode || '').trim().toUpperCase());
  } else {
    url.searchParams.delete('room');
  }
  window.history.replaceState({}, '', url.toString());
}

function applyShellMode() {
  const isRoomMode = Boolean(state.room?.roomCode);
  ui.shell?.classList.toggle('is-room-mode', isRoomMode);
}

function renderRoomSummary() {
  if (!ui.roomSummary) return;
  if (!state.room) {
    ui.roomSummary.innerHTML = '<strong>等待房间</strong><p>输入房间号后即可查看本局押金与局时。</p>';
    return;
  }
  ui.roomSummary.innerHTML = `
    <strong>房间号 ${state.room.roomCode}</strong>
    <p>本局押金 ${state.room.stakeAmount} USDT，局时 ${state.room.timeControlMinutes} 分钟，状态 ${state.room.status}。</p>
  `;
}

function getPlayerCardsViewModel() {
  const room = state.room;
  const match = state.match;
  const currentUserId = Number(state.user?.userId || 0);
  const creatorUserId = Number(room?.creatorUserId || match?.redUserId || 0);
  const joinerUserId = Number(room?.joinerUserId || match?.blackUserId || 0);
  const isBlackSeat = currentUserId > 0 && currentUserId === joinerUserId;
  const isRedSeat = currentUserId > 0 && currentUserId === creatorUserId;

  const topSeat = isBlackSeat
    ? { side: 'RED', label: '红方', name: '房主', userId: creatorUserId }
    : { side: 'BLACK', label: '黑方', name: joinerUserId ? '挑战者' : '挑战者', userId: joinerUserId || null };
  const bottomSeat = isBlackSeat
    ? { side: 'BLACK', label: '黑方', name: '你', userId: joinerUserId || currentUserId || null }
    : { side: 'RED', label: '红方', name: isRedSeat ? '你' : '房主', userId: creatorUserId || null };

  if (match) {
    if (topSeat.side === 'RED') {
      topSeat.name = Number(match.redUserId) === currentUserId ? '你' : '房主';
      bottomSeat.name = Number(match.blackUserId) === currentUserId ? '你' : '挑战者';
    } else {
      topSeat.name = Number(match.blackUserId) === currentUserId ? '你' : '挑战者';
      bottomSeat.name = Number(match.redUserId) === currentUserId ? '你' : '房主';
    }
  }

  return {
    top: topSeat,
    bottom: bottomSeat,
    redTime: formatTime(match?.redTimeLeftMs || Number(room?.timeControlMinutes || 15) * 60 * 1000),
    blackTime: formatTime(match?.blackTimeLeftMs || Number(room?.timeControlMinutes || 15) * 60 * 1000)
  };
}

function applyPlayerCardTone(element, side) {
  if (!element) return;
  const normalizedSide = String(side || '').toUpperCase();
  element.classList.toggle('xiangqi-player-card--red', normalizedSide === 'RED');
  element.classList.toggle('xiangqi-player-card--black', normalizedSide === 'BLACK');
}

function renderPlayers() {
  const viewModel = getPlayerCardsViewModel();
  applyPlayerCardTone(ui.topCard, viewModel.top.side);
  applyPlayerCardTone(ui.bottomCard, viewModel.bottom.side);
  if (ui.topSide) ui.topSide.textContent = viewModel.top.label;
  if (ui.topPlayer) ui.topPlayer.textContent = viewModel.top.name;
  if (ui.topTime) {
    ui.topTime.textContent = viewModel.top.side === 'RED' ? viewModel.redTime : viewModel.blackTime;
  }
  if (ui.bottomSide) ui.bottomSide.textContent = viewModel.bottom.label;
  if (ui.bottomPlayer) ui.bottomPlayer.textContent = viewModel.bottom.name;
  if (ui.bottomTime) {
    ui.bottomTime.textContent = viewModel.bottom.side === 'RED' ? viewModel.redTime : viewModel.blackTime;
  }
}

function syncStakePresetButtons() {
  const currentStake = String(ui.createStake?.value || '').trim();
  ui.stakePresetButtons.forEach((button) => {
    button.classList.toggle('is-active', String(button.dataset.stakePreset || '').trim() === currentStake);
  });
}

function syncTimePresetButtons() {
  const currentTime = String(ui.createTimeControl?.value || '').trim();
  ui.timePresetButtons.forEach((button) => {
    button.classList.toggle('is-active', String(button.dataset.timePreset || '').trim() === currentTime);
  });
}

function getRenderablePieces() {
  if (Array.isArray(state.match?.pieces) && state.match.pieces.length > 0) {
    return state.match.pieces;
  }
  if (state.room) {
    return buildPreviewPieces();
  }
  return [];
}

function shouldFlipBoardPerspective() {
  return getCurrentUserSide() === 'BLACK';
}

function getFinishedMatchOverlayCopy() {
  const result = String(state.match?.result || '').toUpperCase();
  const currentSide = getCurrentUserSide();
  if (result === 'RED_WIN') {
    return {
      message: '红方胜利',
      detail: currentSide === 'RED' ? '赢得押金' : '遗憾落败'
    };
  }
  if (result === 'BLACK_WIN') {
    return {
      message: '黑方胜利',
      detail: currentSide === 'BLACK' ? '赢得押金' : '遗憾落败'
    };
  }
  if (result === 'TIMEOUT_DRAW') {
    return {
      message: '超时和棋',
      detail: '押金已退回'
    };
  }
  if (result === 'DRAW') {
    return {
      message: '和棋',
      detail: '押金已退回'
    };
  }
  return {
    message: '本局结束',
    detail: ''
  };
}

function getRoomOverlayState() {
  const roomStatus = String(state.room?.status || '').toUpperCase();
  const matchStatus = String(state.match?.status || '').toUpperCase();
  if (matchStatus === 'FINISHED') {
    const finishedCopy = getFinishedMatchOverlayCopy();
    return {
      visible: true,
      message: finishedCopy.message,
      detail: finishedCopy.detail,
      showStart: false
    };
  }
  if (roomStatus === 'WAITING') {
    return { visible: true, message: '等待对手加入', detail: '', showStart: false };
  }
  if (roomStatus === 'READY' || matchStatus === 'READY') {
    const isCreator = Number(state.user?.userId || 0) === Number(state.room?.creatorUserId || state.match?.redUserId || 0);
    return {
      visible: true,
      message: isCreator ? '双方已到齐，点击开始' : '等待房主开始',
      detail: '',
      showStart: isCreator
    };
  }
  return { visible: false, message: '', detail: '', showStart: false };
}

function renderBoardOverlay() {
  if (!ui.boardOverlay || !ui.boardOverlayMessage || !ui.startMatchBtn || !ui.boardOverlayDetail) return;
  const overlayState = getRoomOverlayState();
  ui.boardOverlay.hidden = !overlayState.visible;
  ui.boardOverlayMessage.textContent = overlayState.message;
  ui.boardOverlayDetail.textContent = overlayState.detail;
  ui.boardOverlayDetail.hidden = !overlayState.detail;
  ui.startMatchBtn.hidden = !overlayState.showStart;
}

function buildBoardMarkup() {
  if (!ui.board) return;

  const pieces = getRenderablePieces();
  const selectedKey = state.selected ? `${state.selected.file},${state.selected.rank}` : '';
  const shouldFlip = shouldFlipBoardPerspective();
  const cells = [];

  for (let rank = 0; rank < 10; rank += 1) {
    for (let file = 0; file < 9; file += 1) {
      const boardFile = shouldFlip ? 8 - file : file;
      const boardRank = shouldFlip ? 9 - rank : rank;
      const actualFile = shouldFlip ? 8 - file : file;
      const actualRank = shouldFlip ? 9 - rank : rank;
      const piece = pieces.find(
        (item) => Number(item.file) === actualFile && Number(item.rank) === actualRank
      );
      const key = `${actualFile},${actualRank}`;
      const isSelected = selectedKey === key;
      const pieceMarkup = piece
        ? `<button
            type="button"
            class="xiangqi-board__piece xiangqi-board__piece--${String(piece.side || '').toLowerCase()}${isSelected ? ' is-selected' : ''}"
            data-file="${actualFile}"
            data-rank="${actualRank}"
          >${PIECE_LABELS[piece.side]?.[piece.type] || '?'}</button>`
        : '';

      cells.push(`
        <div class="xiangqi-board__cell" data-file="${boardFile}" data-rank="${boardRank}">
          ${pieceMarkup}
        </div>
      `);
    }
  }
  ui.board.innerHTML = `
    <div class="xiangqi-board__svg-wrap" aria-hidden="true">
      <svg class="xiangqi-board__svg" viewBox="0 0 900 1000" preserveAspectRatio="none" role="presentation">
        <rect class="xiangqi-board__frame-outer" x="10" y="10" width="880" height="980" rx="26" ry="26"></rect>
        <rect class="xiangqi-board__frame-inner" x="28" y="28" width="844" height="944" rx="10" ry="10"></rect>
        <g class="xiangqi-board__grid-lines">
          <line x1="55" y1="55" x2="845" y2="55"></line>
          <line x1="55" y1="155" x2="845" y2="155"></line>
          <line x1="55" y1="255" x2="845" y2="255"></line>
          <line x1="55" y1="355" x2="845" y2="355"></line>
          <line x1="55" y1="455" x2="845" y2="455"></line>
          <line x1="55" y1="545" x2="845" y2="545"></line>
          <line x1="55" y1="645" x2="845" y2="645"></line>
          <line x1="55" y1="745" x2="845" y2="745"></line>
          <line x1="55" y1="845" x2="845" y2="845"></line>
          <line x1="55" y1="945" x2="845" y2="945"></line>

          <line x1="55" y1="55" x2="55" y2="455"></line>
          <line x1="55" y1="455" x2="55" y2="545"></line>
          <line x1="55" y1="545" x2="55" y2="945"></line>
          <line x1="155" y1="55" x2="155" y2="455"></line>
          <line x1="155" y1="545" x2="155" y2="945"></line>
          <line x1="255" y1="55" x2="255" y2="455"></line>
          <line x1="255" y1="545" x2="255" y2="945"></line>
          <line x1="355" y1="55" x2="355" y2="455"></line>
          <line x1="355" y1="545" x2="355" y2="945"></line>
          <line x1="455" y1="55" x2="455" y2="455"></line>
          <line x1="455" y1="545" x2="455" y2="945"></line>
          <line x1="555" y1="55" x2="555" y2="455"></line>
          <line x1="555" y1="545" x2="555" y2="945"></line>
          <line x1="655" y1="55" x2="655" y2="455"></line>
          <line x1="655" y1="545" x2="655" y2="945"></line>
          <line x1="755" y1="55" x2="755" y2="455"></line>
          <line x1="755" y1="545" x2="755" y2="945"></line>
          <line x1="845" y1="55" x2="845" y2="455"></line>
          <line x1="845" y1="455" x2="845" y2="545"></line>
          <line x1="845" y1="545" x2="845" y2="945"></line>
        </g>
        <g class="xiangqi-board__palace-lines">
          <line x1="355" y1="55" x2="555" y2="255"></line>
          <line x1="555" y1="55" x2="355" y2="255"></line>
          <line x1="355" y1="745" x2="555" y2="945"></line>
          <line x1="555" y1="745" x2="355" y2="945"></line>
        </g>
        <g class="xiangqi-board__river-text">
          <text x="255" y="500">楚河</text>
          <text x="655" y="500">汉界</text>
        </g>
      </svg>
    </div>
    <div class="xiangqi-board__hit-area">
      ${cells.join('')}
    </div>
  `;
}

function renderMatch() {
  applyShellMode();
  renderRoomSummary();
  renderPlayers();
  buildBoardMarkup();
  renderBoardOverlay();
  syncStakePresetButtons();
  syncTimePresetButtons();
  const isCancelableWaitingRoom = Boolean(
    state.room &&
    String(state.room.status || '').toUpperCase() === 'WAITING' &&
    Number(state.user?.userId) === Number(state.room.creatorUserId)
  );
  if (ui.roomBadge) {
    const roomCode = state.room?.roomCode ? String(state.room.roomCode) : '000000';
    ui.roomBadge.innerHTML = `房间号: <span class="xiangqi-room-badge__value">${roomCode}</span>`;
  }
  if (ui.matchStake) {
    ui.matchStake.textContent = `押金 ${state.room?.stakeAmount || '0.00'} USDT`;
  }
  if (ui.cancelRoomBtn) {
    ui.cancelRoomBtn.disabled = !isCancelableWaitingRoom;
  }
  if (state.match) {
    const side = getCurrentUserSide();
    const turnText = state.match.status === 'FINISHED'
      ? `本局结果 ${state.match.result || '已结束'}`
      : String(state.match.status || '').toUpperCase() === 'READY'
        ? '双方已进入房间，等待点击开始'
        : `轮到 ${state.match.turnSide === 'RED' ? '红方' : '黑方'} 行棋${side ? `，你是${side === 'RED' ? '红方' : '黑方'}` : ''}`;
    setStatus(turnText);
  } else if (state.room) {
    setStatus('等待对手加入');
  } else {
    setStatus('');
  }
}

async function syncSessionAndWallet() {
  state.session = loadCachedNexaSession();
  updateLoginButtonState();
  if (!state.session?.openId || !state.session?.sessionKey) {
    const cachedUser = loadCachedUser();
    if (!isNexaAppEnvironment() && isLocalDevelopmentHost() && cachedUser?.userId) {
      state.user = cachedUser;
      await refreshWallet();
      return;
    }
    state.user = null;
    state.wallet = {
      availableBalance: '0.00',
      frozenBalance: '0.00'
    };
    renderWallet();
    return;
  }

  const response = await postJson('/api/xiangqi/session', {
    openId: state.session.openId,
    nickname: 'Nexa 玩家'
  });

  state.user = {
    userId: Number(response.user.id),
    openId: response.user.openId,
    nickname: response.user.nickname
  };
  saveCachedUser(state.user);
  state.wallet = {
    availableBalance: response.wallet.availableBalance,
    frozenBalance: response.wallet.frozenBalance
  };
  renderWallet();
}

async function exchangeSessionFromUrlCode() {
  const authCode = extractAuthCodeFromUrl();
  if (!authCode) return false;

  try {
    const response = await postJson('/api/nexa/tip/session', {
      authCode,
      gameSlug: GAME_SLUG
    });
    const session = {
      openId: String(response.session?.openId || '').trim(),
      sessionKey: String(response.session?.sessionKey || '').trim()
    };
    if (!session.openId || !session.sessionKey) {
      throw new Error('Nexa 会话创建失败，请重新登录。');
    }
    state.session = session;
    saveCachedSession(session);
    clearAuthCodeFromUrl();
    updateLoginButtonState();
    setStatus('Nexa 登录成功，正在同步账户。');
    return true;
  } catch (error) {
    clearAuthCodeFromUrl();
    clearCachedSession();
    setStatus(String(error?.message || 'Nexa 登录失败，请重试。'));
    return false;
  }
}

function beginLoginFlow() {
  launchNexaUrl(buildNexaAuthorizeUrl());
}

async function ensureAuthorizedForRoomAction() {
  if (state.session?.openId && state.session?.sessionKey && state.user?.userId) {
    return true;
  }
  if (state.session?.openId && state.session?.sessionKey && !state.user?.userId) {
    await syncSessionAndWallet();
    return Boolean(state.user?.userId);
  }
  if (!isNexaAppEnvironment() && isLocalDevelopmentHost()) {
    const response = await postJson('/api/xiangqi/session', {
      openId: XIANGQI_BROWSER_LOCAL_OPEN_ID,
      nickname: 'Nexa 玩家'
    });
    state.user = {
      userId: Number(response.user.id),
      openId: response.user.openId,
      nickname: response.user.nickname
    };
    saveCachedUser(state.user);
    state.wallet = {
      availableBalance: response.wallet.availableBalance,
      frozenBalance: response.wallet.frozenBalance
    };
    renderWallet();
    return true;
  }
  setStatus('请先完成 Nexa 登录授权。');
  beginLoginFlow();
  return false;
}

async function refreshWallet() {
  if (!state.user?.userId) return;
  const response = await fetchJson(`/api/xiangqi/wallet?userId=${encodeURIComponent(state.user.userId)}`);
  state.wallet = {
    availableBalance: response.item.availableBalance,
    frozenBalance: response.item.frozenBalance
  };
  renderWallet();
}

async function refreshRoom(roomCode) {
  const response = await fetchJson(`/api/xiangqi/rooms/${encodeURIComponent(roomCode)}`);
  state.room = response.item;
  state.match = response.item.match;
  state.selected = null;
  renderMatch();
}

async function refreshMatch(matchId) {
  const response = await fetchJson(`/api/xiangqi/matches/${encodeURIComponent(matchId)}`);
  state.match = response.item;
  renderMatch();
}

async function restoreActiveRoom() {
  if (!state.user?.userId || state.room?.roomCode) return;
  try {
    const response = await fetchJson(`/api/xiangqi/rooms/active?userId=${encodeURIComponent(state.user.userId)}`);
    state.room = response.item;
    state.match = response.item.match || null;
    renderMatch();
    if (state.room?.roomCode) {
      connectRoomEvents(state.room.roomCode);
    }
  } catch (error) {
    if (Number(error?.statusCode || 0) === 404) {
      renderMatch();
      return;
    }
    throw error;
  }
}

function connectRoomEvents(roomCode) {
  if (!roomCode) return;
  if (state.roomEventSource) {
    state.roomEventSource.close();
  }

  const source = new EventSource(`/api/xiangqi/rooms/${encodeURIComponent(roomCode)}/events`);
  source.addEventListener('room.snapshot', (event) => {
    const payload = JSON.parse(event.data || '{}');
    state.room = payload.room || state.room;
    state.match = payload.room?.match || state.match;
    renderMatch();
  });
  source.addEventListener('room.updated', (event) => {
    const payload = JSON.parse(event.data || '{}');
    state.room = payload.room || state.room;
    state.match = payload.room?.match || state.match;
    renderMatch();
    refreshWallet().catch(() => {});
  });
  source.addEventListener('match.updated', (event) => {
    const payload = JSON.parse(event.data || '{}');
    if (payload.match) {
      state.match = payload.match;
      renderMatch();
      if (payload.audioCue && payload.actorUserId !== Number(state.user?.userId || 0)) {
        speakXiangqiCue(payload.audioCue);
        playMoveSound();
      }
    }
  });
  source.addEventListener('match.finished', (event) => {
    const payload = JSON.parse(event.data || '{}');
    if (payload.match) {
      state.match = payload.match;
      renderMatch();
      refreshWallet().catch(() => {});
    }
  });
  source.addEventListener('match.draw-offer', (event) => {
    const payload = JSON.parse(event.data || '{}');
    if (payload.match) {
      state.match = payload.match;
      renderMatch();
      setStatus(`收到${payload.match.pendingDrawOfferSide === 'RED' ? '红方' : '黑方'}的求和请求`);
    }
  });
  source.onerror = () => {};
  state.roomEventSource = source;
}

async function maybeSettlePendingDeposit() {
  const pendingDeposit = loadPendingDeposit();
  if (!pendingDeposit?.orderNo || !pendingDeposit.partnerOrderNo) return;

  try {
    const result = await postJson('/api/xiangqi/deposit/query', {
      orderNo: pendingDeposit.orderNo,
      partnerOrderNo: pendingDeposit.partnerOrderNo
    });
    if (String(result.status || '').toUpperCase() === 'SUCCESS') {
      clearPendingDeposit();
      await refreshWallet();
      setStatus('充值成功，余额已更新。');
    }
  } catch {}
}

async function resumePendingAction() {
  const pendingAction = loadPendingAction();
  if (!pendingAction?.type) return;
  clearPendingAction();

  if (String(pendingAction.type) === 'deposit') {
    await beginDepositFlow(String(pendingAction.amount || '').trim());
    return;
  }

  if (String(pendingAction.type) === 'join') {
    if (ui.joinRoomCode && pendingAction.roomCode) {
      ui.joinRoomCode.value = String(pendingAction.roomCode || '').trim().toUpperCase();
    }
    await joinRoom();
    return;
  }

  if (String(pendingAction.type) === 'create') {
    if (ui.createStake && pendingAction.stakeAmount) {
      ui.createStake.value = String(pendingAction.stakeAmount || '').trim();
      syncStakePresetButtons();
    }
    if (ui.createTimeControl && pendingAction.timeControlMinutes) {
      ui.createTimeControl.value = String(pendingAction.timeControlMinutes || 15);
      syncTimePresetButtons();
    }
    await createRoom();
  }
}

async function beginDepositFlow(prefilledAmount = '') {
  if (!isNexaAppEnvironment()) {
    setStatus('请在 Nexa App 内充值。');
    return;
  }

  const amount = String(prefilledAmount || await requestAmount('输入要充值到游戏账户的 USDT 金额') || '').trim();
  if (!amount) return;

  if (!state.session?.openId || !state.session?.sessionKey) {
    savePendingAction({
      type: 'deposit',
      amount
    });
    setStatus('请先完成 Nexa 登录授权。');
    beginLoginFlow();
    return;
  }

  if (!state.user?.userId) {
    await syncSessionAndWallet();
  }
  if (!state.user?.userId) {
    throw new Error('Nexa 账户同步失败，请重新登录后再充值。');
  }

  const response = await postJson('/api/xiangqi/deposit/create', {
    userId: state.user.userId,
    openId: state.session.openId,
    sessionKey: state.session.sessionKey,
    amount
  });

  clearPendingAction();
  savePendingDeposit({
    orderNo: response.orderNo,
    partnerOrderNo: response.partnerOrderNo
  });
  setStatus('请在 Nexa 内完成余额支付。');
  launchNexaUrl(buildNexaPaymentUrl(response.payment));
}

async function beginWithdrawFlow() {
  if (!isNexaAppEnvironment()) {
    setStatus('请在 Nexa App 内提现吗。');
    return;
  }
  if (!state.user?.userId) {
    setStatus('请先登录后再提现吗。');
    return;
  }

  const amount = String(await requestAmount('输入要提现回 Nexa 的 USDT 金额') || '').trim();
  if (!amount) return;
  const partnerOrderNo = `xiangqi_wd_${Date.now()}`;

  await postJson('/api/xiangqi/withdraw/create', {
    partnerOrderNo,
    userId: state.user.userId,
    amount
  });

  await refreshWallet();
  setStatus('提现申请已创建，等待 Nexa 处理结果。');
}

async function createRoom() {
  const stakeAmount = String(ui.createStake.value || '').trim() || '5.00';
  const timeControlMinutes = Number(ui.createTimeControl.value || 15);
  if (!state.user?.userId) {
    savePendingAction({
      type: 'create',
      stakeAmount,
      timeControlMinutes
    });
  }
  if (!await ensureAuthorizedForRoomAction()) return;

  const response = await postJson('/api/xiangqi/rooms/create', {
    userId: state.user.userId,
    stakeAmount,
    timeControlMinutes
  });

  clearPendingAction();
  await refreshWallet();
  await refreshRoom(response.roomCode);
  syncRoomUrl(response.roomCode);
  connectRoomEvents(response.roomCode);
}

async function joinRoom() {
  const roomCode = String(ui.joinRoomCode.value || '').trim().toUpperCase();
  if (!roomCode) return;
  if (!state.user?.userId) {
    savePendingAction({
      type: 'join',
      roomCode
    });
  }
  if (!await ensureAuthorizedForRoomAction()) return;

  await postJson('/api/xiangqi/rooms/join', {
    userId: state.user.userId,
    roomCode
  });

  clearPendingAction();
  await refreshWallet();
  await refreshRoom(roomCode);
  syncRoomUrl(roomCode);
  connectRoomEvents(roomCode);
}

async function startReadyMatch() {
  if (!state.room?.roomCode || !state.user?.userId) return;
  await postJson(`/api/xiangqi/rooms/${encodeURIComponent(state.room.roomCode)}/start`, {
    userId: state.user.userId
  });
  await refreshRoom(state.room.roomCode);
}

async function cancelWaitingRoom() {
  if (!state.user?.userId || !state.room?.roomCode) return;

  await postJson('/api/xiangqi/rooms/cancel', {
    userId: state.user.userId,
    roomCode: state.room.roomCode
  });

  if (state.roomEventSource) {
    state.roomEventSource.close();
    state.roomEventSource = null;
  }
  state.room = null;
  state.match = null;
  state.selected = null;
  syncRoomUrl(null);
  await refreshWallet();
  renderMatch();
  setStatus('房间已解除，质押已退回余额。');
}

async function handleBoardTap(file, rank) {
  if (!state.match || state.match.status !== 'PLAYING' || !state.user?.userId) return;

  const side = getCurrentUserSide();
  const piece = state.match.pieces.find((item) => Number(item.file) === file && Number(item.rank) === rank);
  if (!state.selected) {
    if (piece && piece.side === side && side === state.match.turnSide) {
      state.selected = { file, rank };
      buildBoardMarkup();
    }
    return;
  }

  const from = { ...state.selected };
  state.selected = null;
  buildBoardMarkup();

  try {
    const response = await postJson(`/api/xiangqi/matches/${state.match.id}/move`, {
      userId: state.user.userId,
      from,
      to: { file, rank }
    });
    playMoveSound();
    speakXiangqiCue(response.audioCue);
    if (response.status === 'finished') {
      await refreshWallet();
    }
    await refreshMatch(state.match.id);
  } catch (error) {
    setStatus(String(error?.message || '走子失败'));
  }
}

function startCountdownLoop() {
  window.clearInterval(state.countdownTimer);
  state.countdownTimer = window.setInterval(async () => {
    if (!state.match || state.match.status !== 'PLAYING') return;

    state.match.redTimeLeftMs = Math.max(0, Number(state.match.redTimeLeftMs || 0) - 1000);
    state.match.blackTimeLeftMs = Math.max(0, Number(state.match.blackTimeLeftMs || 0) - 1000);
    renderPlayers();

    if (
      !state.timeoutSubmitting &&
      (state.match.redTimeLeftMs <= 0 || state.match.blackTimeLeftMs <= 0)
    ) {
      state.timeoutSubmitting = true;
      try {
        await postJson(`/api/xiangqi/matches/${state.match.id}/timeout`, {});
        await refreshWallet();
        await refreshMatch(state.match.id);
      } catch {}
      state.timeoutSubmitting = false;
    }
  }, 1000);
}

function bindActions() {
  primeMoveAudio();
  ['touchstart', 'pointerdown', 'keydown'].forEach((eventName) => {
    document.addEventListener(eventName, () => {
      unlockMoveSound().catch(() => {});
    }, { once: true, passive: true });
  });
  ui.depositBtn?.addEventListener('click', () => beginDepositFlow().catch((error) => setStatus(error.message)));
  ui.withdrawBtn?.addEventListener('click', () => beginWithdrawFlow().catch((error) => setStatus(error.message)));
  ui.createRoomBtn?.addEventListener('click', () => createRoom().catch((error) => {
    const message = getFriendlyXiangqiErrorMessage(error, 'create_room');
    showCreateRoomInsufficientBalanceAlert(message);
    setStatus(message);
  }));
  ui.joinRoomBtn?.addEventListener('click', () => joinRoom().catch((error) => setStatus(getFriendlyXiangqiErrorMessage(error, 'join_room'))));
  ui.startMatchBtn?.addEventListener('click', () => startReadyMatch().catch((error) => setStatus(error.message)));
  ui.cancelRoomBtn?.addEventListener('click', () => cancelWaitingRoom().catch((error) => setStatus(error.message)));
  ui.stakePresetButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const nextStake = String(button.dataset.stakePreset || '').trim();
      if (!nextStake || !ui.createStake) return;
      ui.createStake.value = nextStake;
      syncStakePresetButtons();
    });
  });
  ui.timePresetButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const nextTime = String(button.dataset.timePreset || '').trim();
      if (!nextTime || !ui.createTimeControl) return;
      ui.createTimeControl.value = nextTime;
      syncTimePresetButtons();
    });
  });
  ui.actionCopyRoomBtn?.addEventListener('click', async () => {
    const roomCode = String(state.room?.roomCode || '').trim();
    if (!roomCode) return;
    await navigator.clipboard.writeText(roomCode).catch(() => {});
    setStatus(`房间号 ${roomCode} 已复制`);
  });
  ui.actionDrawBtn?.addEventListener('click', async () => {
    if (!state.match || !state.user?.userId) return;
    try {
      if (state.match.pendingDrawOfferSide && state.match.pendingDrawOfferSide !== getCurrentUserSide()) {
        await postJson(`/api/xiangqi/matches/${state.match.id}/draw/respond`, {
          userId: state.user.userId,
          accept: true
        });
      } else {
        await postJson(`/api/xiangqi/matches/${state.match.id}/draw/offer`, {
          userId: state.user.userId
        });
      }
      await refreshMatch(state.match.id);
    } catch (error) {
      setStatus(error.message);
    }
  });
  ui.actionResignBtn?.addEventListener('click', async () => {
    if (!state.match || !state.user?.userId) return;
    try {
      await postJson(`/api/xiangqi/matches/${state.match.id}/resign`, {
        userId: state.user.userId
      });
      await refreshWallet();
      await refreshMatch(state.match.id);
    } catch (error) {
      setStatus(error.message);
    }
  });
  ui.board?.addEventListener('click', (event) => {
    primeMoveAudio();
    const target = event.target.closest('[data-file][data-rank]');
    if (!target) return;
    handleBoardTap(Number(target.dataset.file), Number(target.dataset.rank));
  });
  ui.amountInput?.addEventListener('input', () => {
    ui.amountInput.value = sanitizeMoneyInput(ui.amountInput.value);
  });
  ui.amountInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      ui.amountConfirmBtn?.click();
    }
  });
  ui.amountCancelBtn?.addEventListener('click', () => {
    const request = state.amountRequest;
    closeAmountModal();
    request?.resolve('');
  });
  ui.amountModal?.addEventListener('click', (event) => {
    if (!event.target.closest('.xiangqi-amount-sheet') || event.target.dataset.amountClose === 'true') {
      const request = state.amountRequest;
      closeAmountModal();
      request?.resolve('');
    }
  });
  ui.amountConfirmBtn?.addEventListener('click', () => {
    const request = state.amountRequest;
    const value = String(ui.amountInput?.value || '').trim();
    closeAmountModal();
    request?.resolve(value);
  });
}

function hydrateGameConfig() {
  const item = window.ClawGamesConfig?.getCurrentGameConfig?.();
  if (!item) return;
  const title = document.getElementById('gamePageTitle');
  const subtitle = document.getElementById('gamePageSubtitle');
  if (title && item.name) title.textContent = item.name;
  if (subtitle && item.description) subtitle.textContent = item.description;
}

function getRoomCodeFromUrl() {
  const url = new URL(window.location.href);
  return String(url.searchParams.get('room') || '').trim().toUpperCase();
}

async function init() {
  hydrateGameConfig();
  renderWallet();
  renderRoomSummary();
  buildBoardMarkup();
  bindActions();
  startCountdownLoop();

  await exchangeSessionFromUrlCode().catch(() => {});
  await syncSessionAndWallet().catch(() => {});
  await maybeSettlePendingDeposit();
  await resumePendingAction().catch(() => {});

  const roomCode = getRoomCodeFromUrl();
  if (roomCode) {
    await refreshRoom(roomCode).catch(() => {});
    connectRoomEvents(roomCode);
  } else {
    await restoreActiveRoom().catch(() => {});
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
