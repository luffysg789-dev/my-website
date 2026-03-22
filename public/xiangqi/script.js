const GAME_SLUG = 'xiangqi';
const FILE_LABELS = ['9', '8', '7', '6', '5', '4', '3', '2', '1'];
const RANK_LABELS = ['9', '8', '7', '6', '5', '4', '3', '2', '1', '0'];
const NEXA_API_KEY = 'NEXA2033522880098676737';
const NEXA_PROTOCOL_AUTH_BASE = 'nexaauth://oauth/authorize';
const NEXA_PROTOCOL_ORDER_BASE = 'nexaauth://order';
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
  roomSummary: document.getElementById('xiangqiRoomSummary'),
  roomBadge: document.getElementById('xiangqiRoomBadge'),
  matchStake: document.getElementById('xiangqiMatchStake'),
  matchStatus: document.getElementById('xiangqiMatchStatus'),
  redPlayer: document.getElementById('xiangqiRedPlayer'),
  blackPlayer: document.getElementById('xiangqiBlackPlayer'),
  redTime: document.getElementById('xiangqiRedTime'),
  blackTime: document.getElementById('xiangqiBlackTime'),
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
  timeoutSubmitting: false
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

function buildNexaAuthorizeUrl() {
  const redirectUri = buildCleanReturnUrl();
  return `${NEXA_PROTOCOL_AUTH_BASE}?apikey=${encodeURIComponent(NEXA_API_KEY)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
}

function launchNexaUrl(url) {
  const targetUrl = String(url || '').trim();
  if (!targetUrl) return;
  window.location.href = targetUrl;
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
    ui.roomSummary.innerHTML = '<strong>等待房间</strong><p>输入房间号后即可查看本局 stake 与局时。</p>';
    return;
  }
  ui.roomSummary.innerHTML = `
    <strong>房间号 ${state.room.roomCode}</strong>
    <p>本局 stake ${state.room.stakeAmount} USDT，局时 ${state.room.timeControlMinutes} 分钟，状态 ${state.room.status}。</p>
  `;
}

function renderPlayers() {
  if (!state.match) {
    ui.redPlayer.textContent = '房主';
    ui.blackPlayer.textContent = '挑战者';
    ui.redTime.textContent = '15:00';
    ui.blackTime.textContent = '15:00';
    return;
  }
  ui.redPlayer.textContent = Number(state.user?.userId) === Number(state.match.redUserId) ? '你' : `红方 ${state.match.redUserId}`;
  ui.blackPlayer.textContent = Number(state.user?.userId) === Number(state.match.blackUserId) ? '你' : `黑方 ${state.match.blackUserId}`;
  ui.redTime.textContent = formatTime(state.match.redTimeLeftMs);
  ui.blackTime.textContent = formatTime(state.match.blackTimeLeftMs);
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
  if (state.room && !state.match) {
    return buildPreviewPieces();
  }
  return [];
}

function buildBoardMarkup() {
  if (!ui.board) return;

  const pieces = getRenderablePieces();
  const selectedKey = state.selected ? `${state.selected.file},${state.selected.rank}` : '';
  const cells = [];

  for (let rank = 0; rank < 10; rank += 1) {
    for (let file = 0; file < 9; file += 1) {
      const piece = pieces.find((item) => Number(item.file) === file && Number(item.rank) === rank);
      const key = `${file},${rank}`;
      const isSelected = selectedKey === key;
      const pieceMarkup = piece
        ? `<button
            type="button"
            class="xiangqi-board__piece xiangqi-board__piece--${String(piece.side || '').toLowerCase()}${isSelected ? ' is-selected' : ''}"
            data-file="${file}"
            data-rank="${rank}"
          >${PIECE_LABELS[piece.side]?.[piece.type] || '?'}</button>`
        : '';

      cells.push(`
        <div class="xiangqi-board__cell" data-file="${file}" data-rank="${rank}">
          ${pieceMarkup}
        </div>
      `);
    }
  }

  const fileCoords = FILE_LABELS.map((label, index) => {
    return `<span class="xiangqi-board__coord" style="left:calc(${(index / 8) * 100}% + 10px);bottom:4px;">${label}</span>`;
  });
  const rankCoords = RANK_LABELS.map((label, index) => {
    return `<span class="xiangqi-board__coord" style="left:4px;top:calc(${(index / 9) * 100}% + 8px);">${label}</span>`;
  });

  ui.board.innerHTML = `${cells.join('')}${fileCoords.join('')}${rankCoords.join('')}`;
}

function renderMatch() {
  applyShellMode();
  renderRoomSummary();
  renderPlayers();
  buildBoardMarkup();
  syncStakePresetButtons();
  syncTimePresetButtons();
  const isCancelableWaitingRoom = Boolean(
    state.room &&
    String(state.room.status || '').toUpperCase() === 'WAITING' &&
    Number(state.user?.userId) === Number(state.room.creatorUserId)
  );
  if (ui.roomBadge) {
    ui.roomBadge.textContent = state.room?.roomCode ? `房间号 ${state.room.roomCode}` : '房间号 ----';
  }
  if (ui.matchStake) {
    ui.matchStake.textContent = `Stake ${state.room?.stakeAmount || '0.00'} USDT`;
  }
  if (ui.cancelRoomBtn) {
    ui.cancelRoomBtn.disabled = !isCancelableWaitingRoom;
  }
  if (state.match) {
    const side = getCurrentUserSide();
    const turnText = state.match.status === 'FINISHED'
      ? `本局结果 ${state.match.result || '已结束'}`
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
    if (!isNexaAppEnvironment() && cachedUser?.userId) {
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
  if (!isNexaAppEnvironment()) {
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

  const amount = String(prefilledAmount || window.prompt('输入要充值到游戏账户的 USDT 金额', '') || '').trim();
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

  const amount = String(window.prompt('输入要提现回 Nexa 的 USDT 金额', '') || '').trim();
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
  ui.depositBtn?.addEventListener('click', () => beginDepositFlow().catch((error) => setStatus(error.message)));
  ui.withdrawBtn?.addEventListener('click', () => beginWithdrawFlow().catch((error) => setStatus(error.message)));
  ui.createRoomBtn?.addEventListener('click', () => createRoom().catch((error) => setStatus(error.message)));
  ui.joinRoomBtn?.addEventListener('click', () => joinRoom().catch((error) => setStatus(error.message)));
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
    const target = event.target.closest('[data-file][data-rank]');
    if (!target) return;
    handleBoardTap(Number(target.dataset.file), Number(target.dataset.rank));
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
