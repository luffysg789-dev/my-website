(function bootstrapGameTip() {
  const TIP_AMOUNT = '0.10';
  const TIP_CURRENCY = 'USDT';
  const SESSION_STORAGE_KEY = 'claw800_nexa_tip_session_v1';
  const QUERY_INTERVAL_MS = 2000;
  const QUERY_TIMEOUT_MS = 45000;

  const AUTH_BRIDGE_CANDIDATES = [
    ['NexaBridge', 'getAuthCode'],
    ['NexaBridge', 'requestAuthCode'],
    ['NexaPay', 'getAuthCode'],
    ['NexaPay', 'requestAuthCode'],
    ['NEXA', 'getAuthCode'],
    ['NEXA', 'requestAuthCode'],
    ['Nexa', 'getAuthCode'],
    ['Nexa', 'requestAuthCode']
  ];

  const PAYMENT_BRIDGE_CANDIDATES = [
    ['NexaBridge', 'requestPayment'],
    ['NexaBridge', 'pay'],
    ['NexaPay', 'requestPayment'],
    ['NexaPay', 'pay'],
    ['NEXA', 'requestPayment'],
    ['NEXA', 'pay'],
    ['Nexa', 'requestPayment'],
    ['Nexa', 'pay']
  ];

  function getCurrentGame() {
    const config = window.ClawGamesConfig?.getCurrentGameConfig?.() || window.__GAME_CONFIG__ || {};
    const path = window.location.pathname || '/';
    const slugFromPath =
      String(config.slug || '').trim() ||
      (path.startsWith('/gomoku/') ? 'gomoku' :
        path.endsWith('/minesweeper.html') ? 'minesweeper' :
        path.endsWith('/fortune.html') ? 'fortune' :
        path.endsWith('/muyu.html') ? 'muyu' : 'game');

    return {
      slug: slugFromPath,
      name: String(config.name || document.getElementById('gamePageTitle')?.textContent || '小游戏').trim(),
      route: String(config.route || path || '/').trim()
    };
  }

  function getShell() {
    return document.querySelector('.gomoku-shell, .minesweeper-shell, .fortune-shell, .muyu-shell');
  }

  function loadCachedSession() {
    try {
      const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      if (parsed.expiresAt && Number(parsed.expiresAt) < Date.now()) {
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
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
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {}
  }

  function setStatus(message, tone) {
    const statusEl = document.querySelector('[data-game-tip-status]');
    if (!statusEl) return;
    statusEl.textContent = String(message || '');
    statusEl.classList.toggle('is-error', tone === 'error');
    statusEl.classList.toggle('is-success', tone === 'success');
  }

  function normalizeBridgeResponse(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'object') return value;
    return String(value).trim();
  }

  function callBridge(targetName, methodName, payload) {
    const target = window[targetName];
    const handler = target && typeof target[methodName] === 'function' ? target[methodName] : null;
    if (!handler) return null;

    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (fn) => (value) => {
        if (settled) return;
        settled = true;
        fn(value);
      };
      const onResolve = finish(resolve);
      const onReject = finish((error) => reject(error instanceof Error ? error : new Error(String(error || '桥接调用失败'))));

      try {
        const maybeResult = handler.call(target, payload, onResolve, onReject);
        if (maybeResult && typeof maybeResult.then === 'function') {
          maybeResult.then(onResolve).catch(onReject);
          return;
        }
        if (maybeResult !== undefined) {
          onResolve(maybeResult);
          return;
        }
        window.setTimeout(() => {
          if (!settled) {
            onReject(new Error(`${targetName}.${methodName} 超时`));
          }
        }, 8000);
      } catch (error) {
        onReject(error);
      }
    });
  }

  async function requestAuthCodeFromBridge() {
    for (const [targetName, methodName] of AUTH_BRIDGE_CANDIDATES) {
      try {
        const response = await callBridge(targetName, methodName, { scope: 'userinfo' });
        const normalized = normalizeBridgeResponse(response);
        if (normalized) return normalized;
      } catch {}
    }
    throw new Error('当前 Nexa 小程序环境没有暴露授权接口，请在 Nexa 内置页面中打开。');
  }

  function extractAuthCode(result) {
    if (!result) return '';
    if (typeof result === 'string') return result.trim();
    if (typeof result !== 'object') return '';
    if (typeof result.authCode === 'string') return result.authCode.trim();
    if (typeof result.code === 'string' && result.code !== '0') return '';
    if (typeof result.data === 'string') return result.data.trim();
    if (result.data && typeof result.data.authCode === 'string') return result.data.authCode.trim();
    return '';
  }

  async function requestPaymentFromBridge(payment) {
    for (const [targetName, methodName] of PAYMENT_BRIDGE_CANDIDATES) {
      try {
        return await callBridge(targetName, methodName, payment);
      } catch {}
    }
    return null;
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
      throw new Error(String(json?.error || json?.message || '请求失败'));
    }
    return json;
  }

  async function ensureSession(game) {
    const cached = loadCachedSession();
    if (cached) return cached;

    setStatus('正在向 Nexa 请求授权...', '');
    const authBridgeResult = await requestAuthCodeFromBridge();
    const authCode = extractAuthCode(authBridgeResult);
    if (!authCode) {
      throw new Error('没有拿到 Nexa 授权码，请稍后重试。');
    }

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
      throw new Error('Nexa 会话创建失败，请重新授权。');
    }

    saveCachedSession(session);
    return session;
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

  async function handleTipClick(event) {
    const button = event.currentTarget;
    const game = getCurrentGame();
    const confirmed = window.confirm(`默认打赏 ${TIP_AMOUNT} ${TIP_CURRENCY}，将使用 Nexa 余额支付。是否继续？`);
    if (!confirmed) return;

    button.disabled = true;
    setStatus('正在准备打赏订单...', '');

    try {
      const session = await ensureSession(game);

      setStatus('正在创建订单...', '');
      const orderResponse = await postJson('/api/nexa/tip/create', {
        gameSlug: game.slug,
        openId: session.openId,
        sessionKey: session.sessionKey,
        amount: TIP_AMOUNT
      });

      setStatus('请在 Nexa 中确认余额支付...', '');
      await requestPaymentFromBridge(orderResponse.payment);

      setStatus('正在确认支付结果...', '');
      const finalStatus = await pollOrder(orderResponse.orderNo);
      if (finalStatus === 'SUCCESS') {
        setStatus('打赏成功，感谢支持。', 'success');
        return;
      }
      if (finalStatus === 'PENDING') {
        setStatus('订单已创建，请在 Nexa 中完成支付后稍后刷新查看。', '');
        return;
      }
      throw new Error(`支付未完成，当前状态：${finalStatus}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '打赏失败，请稍后重试。', 'error');
    } finally {
      button.disabled = false;
    }
  }

  function renderTipBar() {
    if (document.querySelector('[data-game-tip]')) return;
    const shell = getShell();
    if (!shell) return;

    const section = document.createElement('section');
    section.className = 'game-tip';
    section.setAttribute('data-game-tip', '1');
    section.innerHTML = `
      <div class="game-tip__copy">
        <span class="game-tip__eyebrow">Nexa 打赏</span>
        <strong class="game-tip__title">喜欢这个小游戏？</strong>
        <p class="game-tip__desc">默认 0.1 USDT，确认后会在 Nexa 内使用余额支付。</p>
      </div>
      <button type="button" class="game-tip__button" data-game-tip-button>打赏 0.1 USDT</button>
      <p class="game-tip__status" data-game-tip-status aria-live="polite"></p>
    `;

    shell.appendChild(section);
    section.querySelector('[data-game-tip-button]')?.addEventListener('click', handleTipClick);
  }

  function boot() {
    renderTipBar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  window.addEventListener('game-config-ready', boot);
})();
