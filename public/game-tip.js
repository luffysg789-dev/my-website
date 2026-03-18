(function bootstrapGameTip() {
  const TIP_AMOUNT = '0.10';
  const TIP_CURRENCY = 'USDT';
  const TIP_BUTTON_TEXT_LOGIN = 'Nexa 登录后打赏';
  const TIP_BUTTON_TEXT_PAY = '打赏 0.1 USDT';
  const TIP_BUTTON_TEXT_BUSY = '处理中...';
  const NEXA_API_KEY = 'NEXA2033522880098676737';
  const NEXA_PROTOCOL_AUTH_BASE = 'nexaauth://oauth/authorize';
  const NEXA_PROTOCOL_ORDER_BASE = 'nexaauth://order';
  const SESSION_STORAGE_KEY = 'claw800_nexa_tip_session_v1';
  const PENDING_ORDER_STORAGE_KEY = 'claw800_nexa_tip_pending_order_v1';
  const QUERY_INTERVAL_MS = 2000;
  const QUERY_TIMEOUT_MS = 45000;
  const RESET_STATUS_DELAY_MS = 3000;
  let resetStatusTimer = 0;

  function shouldRenderTip() {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return isNexaAppEnvironment();
    return window.matchMedia('(max-width: 720px)').matches && isNexaAppEnvironment();
  }

  function isNexaAppEnvironment() {
    const userAgent = String(window.navigator?.userAgent || '').trim();
    const referrer = String(document.referrer || '').trim();
    const session = loadCachedSession();
    const hasNexaMarker = /nexa/i.test(userAgent) || /nexa/i.test(referrer);
    return Boolean(hasNexaMarker || session);
  }

  function getCurrentGame() {
    const config = window.ClawGamesConfig?.getCurrentGameConfig?.() || window.__GAME_CONFIG__ || {};
    const path = window.location.pathname || '/';
    const slugFromPath =
      String(config.slug || '').trim() ||
      (path.startsWith('/gomoku/')
        ? 'gomoku'
        : path.endsWith('/minesweeper.html')
          ? 'minesweeper'
          : path.endsWith('/fortune.html')
            ? 'fortune'
            : path.endsWith('/muyu.html')
              ? 'muyu'
              : 'game');

    return {
      slug: slugFromPath,
      name: String(config.name || document.getElementById('gamePageTitle')?.textContent || '小游戏').trim(),
      route: String(config.route || path || '/').trim()
    };
  }

  function getTipTitle(game) {
    if (String(game?.slug || '').trim() === 'muyu') return '打赏+功德';
    return '喜欢这个小游戏？';
  }

  function getShell() {
    return document.querySelector('.gomoku-shell, .minesweeper-shell, .fortune-shell, .muyu-shell');
  }

  function getPersistentStorage() {
    try {
      return window.localStorage;
    } catch {
      return window.sessionStorage;
    }
  }

  function loadCachedSession() {
    try {
      const raw = getPersistentStorage().getItem(SESSION_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      if (parsed.expiresAt && Number(parsed.expiresAt) < Date.now()) {
        getPersistentStorage().removeItem(SESSION_STORAGE_KEY);
        return null;
      }
      if (!parsed.openId || !parsed.sessionKey) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function saveCachedSession(session) {
    try {
      getPersistentStorage().setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {}
  }

  function clearCachedSession() {
    try {
      getPersistentStorage().removeItem(SESSION_STORAGE_KEY);
    } catch {}
  }

  function loadPendingOrder() {
    try {
      const raw = window.sessionStorage.getItem(PENDING_ORDER_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !parsed.orderNo) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function savePendingOrder(order) {
    try {
      window.sessionStorage.setItem(PENDING_ORDER_STORAGE_KEY, JSON.stringify(order));
    } catch {}
  }

  function clearPendingOrder() {
    try {
      window.sessionStorage.removeItem(PENDING_ORDER_STORAGE_KEY);
    } catch {}
  }

  function setStatus(message, tone) {
    const statusEl = document.querySelector('[data-game-tip-status]');
    if (!statusEl) return;
    statusEl.textContent = String(message || '');
    statusEl.classList.toggle('is-error', tone === 'error');
    statusEl.classList.toggle('is-success', tone === 'success');
  }

  function scheduleStatusReset() {
    window.clearTimeout(resetStatusTimer);
    resetStatusTimer = window.setTimeout(() => {
      clearPendingOrder();
      setStatus('', '');
      updateButtonState();
    }, RESET_STATUS_DELAY_MS);
  }

  function notifyTipSuccess(gameSlug, orderNo) {
    window.dispatchEvent(new CustomEvent('claw800:tip-success', {
      detail: {
        gameSlug: String(gameSlug || '').trim(),
        amount: TIP_AMOUNT,
        currency: TIP_CURRENCY,
        orderNo: String(orderNo || '').trim()
      }
    }));
  }

  function syncTipCopy(session = loadCachedSession()) {
    const descEl = document.querySelector('[data-game-tip-desc]');
    if (!descEl) return;
    descEl.hidden = Boolean(session);
  }

  function updateButtonState(options = {}) {
    const button = document.querySelector('[data-game-tip-button]');
    if (!button) return;

    const session = options.session === undefined ? loadCachedSession() : options.session;
    const busy = Boolean(options.busy);
    syncTipCopy(session);

    button.disabled = busy;
    if (busy) {
      button.textContent = TIP_BUTTON_TEXT_BUSY;
      return;
    }

    button.textContent = session ? TIP_BUTTON_TEXT_PAY : TIP_BUTTON_TEXT_LOGIN;
  }

  function buildCleanReturnUrl() {
    const url = new URL(window.location.href);
    ['code', 'authCode', 'state', 'nexa_tip_order', 'nexa_tip_status'].forEach((key) => {
      url.searchParams.delete(key);
    });
    return url.toString();
  }

  function buildNexaAuthorizeUrl() {
    const redirectUri = buildCleanReturnUrl();
    return `${NEXA_PROTOCOL_AUTH_BASE}?apikey=${encodeURIComponent(NEXA_API_KEY)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
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

  function launchNexaUrl(url) {
    const targetUrl = String(url || '').trim();
    if (!targetUrl) return;

    const anchor = document.createElement('a');
    anchor.href = targetUrl;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = targetUrl;
    document.body.appendChild(iframe);
    window.setTimeout(() => iframe.remove(), 1500);

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

  async function postJson(url, body) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const json = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(String(json?.error || json?.message || '请求失败'));
      error.code = String(json?.code || '').trim();
      error.statusCode = Number(response.status || 0) || 0;
      throw error;
    }
    return json;
  }

  function isNexaSessionExpiredError(error) {
    const code = String(error?.code || '').trim();
    const statusCode = Number(error?.statusCode || 0) || 0;
    const message = String(error?.message || '').trim();
    return code === '4001' || statusCode === 401 || /未登录|登录已过期|重新登录/.test(message);
  }

  async function exchangeSessionFromUrlCode(game) {
    const authCode = extractAuthCodeFromUrl();
    if (!authCode) return false;

    updateButtonState({ busy: true, session: null });
    setStatus('正在完成 Nexa 登录...', '');

    try {
      const response = await postJson('/api/nexa/tip/session', {
        authCode,
        gameSlug: game.slug
      });

      const session = {
        openId: String(response.session?.openId || '').trim(),
        sessionKey: String(response.session?.sessionKey || '').trim(),
        expiresAt: Number(response.session?.expiresAt || 0) || Date.now() + 60 * 60 * 1000
      };

      if (!session.openId || !session.sessionKey) {
        throw new Error('Nexa 会话创建失败，请重新登录。');
      }

      saveCachedSession(session);
      clearAuthCodeFromUrl();
      updateButtonState({ session });
      setStatus('已连接 Nexa 账号，后续可直接打赏。', 'success');
      return true;
    } catch (error) {
      clearAuthCodeFromUrl();
      clearCachedSession();
      updateButtonState();
      setStatus(error instanceof Error ? error.message : 'Nexa 登录失败，请重试。', 'error');
      return false;
    }
  }

  async function pollOrder(orderNo) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < QUERY_TIMEOUT_MS) {
      const response = await postJson('/api/nexa/tip/query', { orderNo });
      const status = String(response.status || '').trim().toUpperCase();
      if (status === 'SUCCESS') return status;
      if (status === 'FAILED' || status === 'CANCELED' || status === 'EXPIRED') return status;
      await new Promise((resolve) => window.setTimeout(resolve, QUERY_INTERVAL_MS));
    }
    return 'PENDING';
  }

  async function settlePendingOrder() {
    const pendingOrder = loadPendingOrder();
    if (!pendingOrder?.orderNo) return;

    updateButtonState({ busy: true });
    setStatus('正在确认支付结果...', '');

    try {
      const response = await postJson('/api/nexa/tip/query', { orderNo: pendingOrder.orderNo });
      const finalStatus = String(response.status || '').trim().toUpperCase();
      if (finalStatus === 'SUCCESS') {
        clearPendingOrder();
        notifyTipSuccess(pendingOrder.gameSlug, pendingOrder.orderNo);
        setStatus('打赏成功，感谢支持。', 'success');
        return;
      }
      clearPendingOrder();
      setStatus('支付失败', 'error');
      scheduleStatusReset();
    } catch (error) {
      if (isNexaSessionExpiredError(error)) {
        clearCachedSession();
        clearPendingOrder();
        setStatus('Nexa 登录已过期，请重新登录后再打赏。', 'error');
        return;
      }
      clearPendingOrder();
      setStatus('支付失败', 'error');
      scheduleStatusReset();
    } finally {
      updateButtonState();
    }
  }

  async function beginLoginFlow(game) {
    setStatus('正在打开 Nexa 登录授权...', '');
    window.sessionStorage.setItem('claw800_nexa_tip_login_game', game.slug);
    launchNexaUrl(buildNexaAuthorizeUrl(game));
  }

  async function beginPaymentFlow(game, session) {
    setStatus('正在创建订单...', '');
    let orderResponse;
    try {
      orderResponse = await postJson('/api/nexa/tip/create', {
        gameSlug: game.slug,
        openId: session.openId,
        sessionKey: session.sessionKey,
        amount: TIP_AMOUNT
      });
    } catch (error) {
      if (isNexaSessionExpiredError(error)) {
        clearCachedSession();
        setStatus('Nexa 登录已过期，请重新登录后再打赏。', 'error');
        error.isHandled = true;
      }
      throw error;
    }

    savePendingOrder({
      orderNo: orderResponse.orderNo,
      gameSlug: game.slug,
      createdAt: Date.now()
    });

    setStatus('请在 Nexa 中输入六位支付密码完成余额支付。', '');
    launchNexaUrl(buildNexaPaymentUrl(orderResponse.payment));
  }

  async function handleTipClick(event) {
    const game = getCurrentGame();
    const session = loadCachedSession();
    updateButtonState({ busy: true, session });

    try {
      if (!session) {
        await beginLoginFlow(game);
        return;
      }

      setStatus('正在准备打赏订单...', '');
      await beginPaymentFlow(game, session);
    } catch (error) {
      if (!error?.isHandled) {
        setStatus(error instanceof Error ? error.message : '打赏失败，请稍后重试。', 'error');
      }
    } finally {
      updateButtonState();
    }
  }

  function renderTipBar() {
    if (!shouldRenderTip()) return;
    if (document.querySelector('[data-game-tip]')) return;
    const shell = getShell();
    if (!shell) return;
    const game = getCurrentGame();

        const section = document.createElement('section');
        section.className = 'game-tip';
        section.setAttribute('data-game-tip', '1');
        section.innerHTML = `
          <div class="game-tip__copy">
            <strong class="game-tip__title">${getTipTitle(game)}</strong>
            <p class="game-tip__desc" data-game-tip-desc>首次需要授权登录,再次点击打赏即可.</p>
          </div>
          <button type="button" class="game-tip__button" data-game-tip-button>${TIP_BUTTON_TEXT_PAY}</button>
          <p class="game-tip__status" data-game-tip-status aria-live="polite"></p>
        `;

    shell.appendChild(section);
    section.querySelector('[data-game-tip-button]')?.addEventListener('click', handleTipClick);
    updateButtonState();
  }

  async function boot() {
    const game = getCurrentGame();
    renderTipBar();
    await exchangeSessionFromUrlCode(game);
    await settlePendingOrder();
  }

  function syncTipVisibility() {
    const existing = document.querySelector('[data-game-tip]');
    if (!shouldRenderTip()) {
      existing?.remove();
      return;
    }
    renderTipBar();
    updateButtonState();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      boot().catch(() => {});
    }, { once: true });
  } else {
    boot().catch(() => {});
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && loadPendingOrder()) {
      settlePendingOrder().catch(() => {});
    }
  });

  window.addEventListener('focus', () => {
    if (loadPendingOrder()) {
      settlePendingOrder().catch(() => {});
    }
  });
  window.addEventListener('game-config-ready', () => {
    renderTipBar();
    updateButtonState();
  });
  window.addEventListener('resize', syncTipVisibility);
})();
