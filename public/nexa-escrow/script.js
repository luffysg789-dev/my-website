(function createNexaEscrowModule(globalScope) {
  const NEXA_ESCROW_SESSION_STORAGE_KEY = 'claw800:nexa-escrow:nexa-session';
  const NEXA_ESCROW_PENDING_PAYMENT_STORAGE_KEY = 'claw800:nexa-escrow:pending-payment';
  const MAX_NEXA_ESCROW_SESSION_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
  const NEXA_PROTOCOL_AUTH_BASE = 'nexaauth://oauth/authorize';
  const NEXA_PROTOCOL_ORDER_BASE = 'nexaauth://order';
  const NEXA_PUBLIC_CONFIG_ENDPOINT = '/api/nexa/public-config';
  let cachedNexaPublicConfig = null;

  function getStorage() {
    try {
      return globalScope.localStorage;
    } catch {
      return globalScope.sessionStorage;
    }
  }

  function loadCachedSession(storage = getStorage()) {
    try {
      const raw = storage?.getItem?.(NEXA_ESCROW_SESSION_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.openId || !parsed?.sessionKey) return null;
      if (Number(parsed.expiresAt || 0) < Date.now()) {
        storage?.removeItem?.(NEXA_ESCROW_SESSION_STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  function saveCachedSession(storage = getStorage(), session) {
    try {
      const payload = {
        openId: String(session?.openId || '').trim(),
        sessionKey: String(session?.sessionKey || '').trim(),
        nickname: String(session?.nickname || 'Nexa User').trim() || 'Nexa User',
        avatar: String(session?.avatar || '').trim(),
        savedAt: Number(session?.savedAt || 0) || Date.now()
      };
      if (!payload.openId || !payload.sessionKey) return;
      payload.expiresAt = payload.savedAt + MAX_NEXA_ESCROW_SESSION_RETENTION_MS;
      storage?.setItem?.(NEXA_ESCROW_SESSION_STORAGE_KEY, JSON.stringify(payload));
    } catch {}
  }

  function clearCachedSession(storage = getStorage()) {
    try {
      storage?.removeItem?.(NEXA_ESCROW_SESSION_STORAGE_KEY);
    } catch {}
  }

  function loadPendingPayment(storage = getStorage()) {
    try {
      const raw = storage?.getItem?.(NEXA_ESCROW_PENDING_PAYMENT_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.orderNo) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function savePendingPayment(storage = getStorage(), order) {
    try {
      storage?.setItem?.(NEXA_ESCROW_PENDING_PAYMENT_STORAGE_KEY, JSON.stringify(order || {}));
    } catch {}
  }

  function clearPendingPayment(storage = getStorage()) {
    try {
      storage?.removeItem?.(NEXA_ESCROW_PENDING_PAYMENT_STORAGE_KEY);
    } catch {}
  }

  function hasNexaEnvironment() {
    const userAgent = String(globalScope.window?.navigator?.userAgent || '');
    const referrer = String(globalScope.document?.referrer || '');
    return /nexa/i.test(userAgent) || /nexa/i.test(referrer);
  }

  function buildCleanReturnUrl() {
    const url = new URL(globalScope.window.location.href);
    ['code', 'authCode', 'auth_code', 'state'].forEach((key) => url.searchParams.delete(key));
    return url.toString();
  }

  async function getNexaPublicConfig() {
    if (cachedNexaPublicConfig?.apiKey) return cachedNexaPublicConfig;
    const response = await fetch(NEXA_PUBLIC_CONFIG_ENDPOINT, { credentials: 'same-origin' });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(String(payload?.error || 'Nexa API Key 未配置'));
    }
    const apiKey = String(payload?.apiKey || '').trim();
    if (!apiKey) throw new Error('Nexa API Key 未配置');
    cachedNexaPublicConfig = { apiKey };
    return cachedNexaPublicConfig;
  }

  async function beginNexaLoginFlow() {
    const redirectUri = buildCleanReturnUrl();
    const config = await getNexaPublicConfig();
    globalScope.window.location.href = `${NEXA_PROTOCOL_AUTH_BASE}?apikey=${encodeURIComponent(config.apiKey)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  }

  function extractAuthCodeFromUrl() {
    const params = new URLSearchParams(globalScope.window.location.search);
    return String(params.get('code') || params.get('authCode') || params.get('auth_code') || '').trim();
  }

  function clearAuthCodeFromUrl() {
    const url = new URL(globalScope.window.location.href);
    ['code', 'authCode', 'auth_code', 'state'].forEach((key) => url.searchParams.delete(key));
    globalScope.window.history.replaceState({}, globalScope.document.title, url.toString());
  }

  function buildNexaPaymentUrl(payment) {
    const redirectUrl = buildCleanReturnUrl();
    const params = new URLSearchParams({
      orderNo: String(payment?.orderNo || '').trim(),
      paySign: String(payment?.paySign || '').trim(),
      signType: String(payment?.signType || 'MD5').trim(),
      apiKey: String(payment?.apiKey || cachedNexaPublicConfig?.apiKey || '').trim(),
      nonce: String(payment?.nonce || '').trim(),
      timestamp: String(payment?.timestamp || '').trim(),
      redirectUrl
    });
    return `${NEXA_PROTOCOL_ORDER_BASE}?${params.toString()}`;
  }

  async function postJson(url, body) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body || {})
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(String(json?.error || json?.message || 'REQUEST_FAILED'));
      error.statusCode = Number(response.status || 0) || 0;
      throw error;
    }
    return json;
  }

  async function getJson(url) {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'same-origin'
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(String(json?.error || json?.message || 'REQUEST_FAILED'));
      error.statusCode = Number(response.status || 0) || 0;
      throw error;
    }
    return json;
  }

  async function syncSessionFromAuthCode(appState) {
    const authCode = extractAuthCodeFromUrl();
    if (!authCode) return false;
    const response = await postJson('/api/nexa/tip/session', {
      authCode,
      gameSlug: 'nexa-escrow'
    });
    const serverResponse = await postJson('/api/nexa-escrow/session', {
      openId: String(response.session?.openId || '').trim(),
      sessionKey: String(response.session?.sessionKey || '').trim(),
      nickname: 'Nexa Escrow User',
      avatar: ''
    });
    appState.session = serverResponse.session || null;
    if (appState.session) {
      saveCachedSession(appState.storage, appState.session);
    }
    clearAuthCodeFromUrl();
    return true;
  }

  async function readServerSession() {
    try {
      const response = await getJson('/api/nexa-escrow/session');
      return response.session || null;
    } catch {
      return null;
    }
  }

  async function createEscrowOrder(appState) {
    const response = await postJson('/api/nexa-escrow/orders', {
      creatorRole: appState.role,
      amount: appState.elements.amountInput.value,
      counterpartyEmail: appState.elements.counterpartyInput.value,
      description: appState.elements.descriptionInput.value
    });
    appState.orders = mergeOrder(appState.orders, response.order);
    appState.selectedTradeCode = response.order.tradeCode;
    renderOrders(appState);
    switchTab(appState, 'orders');
    setStatus(appState.elements.createStatus, `担保单已创建，交易码 ${response.order.tradeCode}`, 'success');
  }

  async function joinEscrowOrder(appState) {
    const response = await postJson('/api/nexa-escrow/orders/join', {
      tradeCode: appState.elements.tradeCodeInput.value
    });
    appState.orders = mergeOrder(appState.orders, response.order);
    appState.selectedTradeCode = response.order.tradeCode;
    renderOrders(appState);
    setStatus(appState.elements.joinStatus, '已加入担保单。', 'success');
  }

  async function beginEscrowPayment(appState, tradeCode) {
    const response = await postJson('/api/nexa-escrow/payment/create', { tradeCode });
    savePendingPayment(appState.storage, {
      orderNo: response.orderNo,
      tradeCode,
      createdAt: Date.now()
    });
    globalScope.window.location.href = buildNexaPaymentUrl(response.payment);
  }

  async function settlePendingEscrowPayment(appState) {
    const pending = loadPendingPayment(appState.storage);
    if (!pending?.orderNo) return;
    const response = await postJson('/api/nexa-escrow/payment/query', { orderNo: pending.orderNo });
    if (response.order) {
      appState.orders = mergeOrder(appState.orders, response.order);
      appState.selectedTradeCode = response.order.tradeCode;
      renderOrders(appState);
    }
    if (String(response.status || '').trim().toUpperCase() === 'SUCCESS') {
      clearPendingPayment(appState.storage);
    }
  }

  async function submitEscrowAction(appState, action, tradeCode) {
    const response = await postJson('/api/nexa-escrow/orders/action', {
      tradeCode,
      action
    });
    appState.orders = mergeOrder(appState.orders, response.order);
    appState.selectedTradeCode = response.order.tradeCode;
    renderOrders(appState);
  }

  function mergeOrder(orders, nextOrder) {
    const list = Array.isArray(orders) ? orders.slice() : [];
    const tradeCode = String(nextOrder?.tradeCode || '').trim();
    const index = list.findIndex((item) => String(item?.tradeCode || '').trim() === tradeCode);
    if (index >= 0) {
      list[index] = nextOrder;
    } else {
      list.unshift(nextOrder);
    }
    return list;
  }

  function setStatus(node, message, tone = '') {
    if (!node) return;
    const text = String(message || '').trim();
    node.hidden = !text;
    node.textContent = text;
    node.classList.toggle('is-error', tone === 'error');
    node.classList.toggle('is-success', tone === 'success');
  }

  function switchTab(appState, tab) {
    appState.activeTab = String(tab || 'create');
    appState.elements.panels.forEach((panel) => {
      const active = panel.dataset.tab === appState.activeTab;
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
    });
    appState.elements.tabButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.tabTarget === appState.activeTab);
    });
  }

  function renderAuthState(appState) {
    const node = appState.elements.authStatus;
    if (!node) return;
    if (!hasNexaEnvironment()) {
      node.textContent = '仅限 Nexa';
      return;
    }
    node.textContent = appState.session?.openId ? '已授权' : '待授权';
  }

  function renderCreateRole(appState) {
    appState.elements.roleButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.role === appState.role);
    });
    appState.elements.counterpartyLabel.textContent = appState.role === 'buyer' ? '卖家邮箱' : '买家邮箱';
    appState.elements.counterpartyInput.placeholder = appState.role === 'buyer' ? '对方的 Google 邮箱' : '买方的 Google 邮箱';
  }

  function renderOrderDetail(appState) {
    const order = appState.orders.find((item) => String(item.tradeCode) === String(appState.selectedTradeCode || ''));
    const card = appState.elements.orderDetail;
    if (!order) {
      card.hidden = true;
      return;
    }
    card.hidden = false;
    appState.elements.detailTitle.textContent = `交易码 ${order.tradeCode}`;
    appState.elements.detailPill.textContent = order.status;
    appState.elements.detailBody.innerHTML = `
      <div class="nexa-escrow-order-detail__line">金额：${order.amount} ${order.currency}</div>
      <div class="nexa-escrow-order-detail__line">买家：${order.buyerEmail || '--'} ${order.buyerNickname ? `(${order.buyerNickname})` : ''}</div>
      <div class="nexa-escrow-order-detail__line">卖家：${order.sellerEmail || '--'} ${order.sellerNickname ? `(${order.sellerNickname})` : ''}</div>
      <div class="nexa-escrow-order-detail__line">描述：${order.description || '--'}</div>
    `;

    const [primaryAction, secondaryAction] = order.availableActions || [];
    const actionText = {
      fund: '支付担保金',
      mark_delivered: '确认已交付',
      release: '确认放款',
      cancel: '取消订单'
    };
    appState.elements.primaryAction.hidden = !primaryAction;
    appState.elements.secondaryAction.hidden = !secondaryAction;
    appState.elements.primaryAction.textContent = actionText[primaryAction] || primaryAction || '';
    appState.elements.secondaryAction.textContent = actionText[secondaryAction] || secondaryAction || '';
    appState.elements.primaryAction.dataset.action = primaryAction || '';
    appState.elements.secondaryAction.dataset.action = secondaryAction || '';
  }

  function renderOrders(appState) {
    const list = appState.elements.ordersList;
    if (!list) return;
    if (!appState.orders.length) {
      list.innerHTML = '<article class="nexa-escrow-order-item"><div class="nexa-escrow-order-item__meta">还没有担保单，先去发起一个。</div></article>';
      renderOrderDetail(appState);
      return;
    }
    list.innerHTML = appState.orders.map((order) => `
      <button class="nexa-escrow-order-item" type="button" data-trade-code="${order.tradeCode}">
        <div class="nexa-escrow-order-item__top">
          <div class="nexa-escrow-order-item__code">${order.tradeCode}</div>
          <span class="nexa-escrow-pill">${order.status}</span>
        </div>
        <div class="nexa-escrow-order-item__meta">${order.amount} ${order.currency} · ${order.viewerRole || '待加入'} · ${order.description}</div>
      </button>
    `).join('');
    Array.from(list.querySelectorAll('[data-trade-code]')).forEach((button) => {
      button.addEventListener('click', () => {
        appState.selectedTradeCode = button.dataset.tradeCode;
        renderOrderDetail(appState);
      });
    });
    if (!appState.selectedTradeCode) {
      appState.selectedTradeCode = appState.orders[0]?.tradeCode || '';
    }
    renderOrderDetail(appState);
  }

  async function loadBootstrap(appState) {
    const response = await getJson('/api/nexa-escrow/bootstrap');
    appState.account = response.account || null;
    appState.orders = Array.isArray(response.orders) ? response.orders : [];
    renderOrders(appState);
    renderAuthState(appState);
  }

  function createApp(root) {
    const storage = getStorage();
    const appState = {
      storage,
      session: loadCachedSession(storage),
      account: null,
      orders: [],
      selectedTradeCode: '',
      role: 'buyer',
      activeTab: 'create',
      elements: {
        authStatus: root.querySelector('#nexaEscrowAuthStatus'),
        tabButtons: Array.from(root.querySelectorAll('[data-tab-target]')),
        panels: Array.from(root.querySelectorAll('[data-tab]')),
        roleButtons: Array.from(root.querySelectorAll('[data-role]')),
        counterpartyLabel: root.querySelector('#nexaEscrowCounterpartyLabel'),
        amountInput: root.querySelector('#nexaEscrowAmountInput'),
        counterpartyInput: root.querySelector('#nexaEscrowCounterpartyInput'),
        descriptionInput: root.querySelector('#nexaEscrowDescriptionInput'),
        createButton: root.querySelector('#nexaEscrowCreateButton'),
        createStatus: root.querySelector('#nexaEscrowCreateStatus'),
        tradeCodeInput: root.querySelector('#nexaEscrowTradeCodeInput'),
        joinButton: root.querySelector('#nexaEscrowJoinButton'),
        joinStatus: root.querySelector('#nexaEscrowJoinStatus'),
        ordersList: root.querySelector('#nexaEscrowOrdersList'),
        orderDetail: root.querySelector('#nexaEscrowOrderDetail'),
        detailTitle: root.querySelector('#nexaEscrowDetailTitle'),
        detailPill: root.querySelector('#nexaEscrowDetailStatus'),
        detailBody: root.querySelector('#nexaEscrowDetailBody'),
        detailStatus: root.querySelector('#nexaEscrowDetailStatusText'),
        primaryAction: root.querySelector('#nexaEscrowPrimaryAction'),
        secondaryAction: root.querySelector('#nexaEscrowSecondaryAction')
      }
    };

    appState.elements.tabButtons.forEach((button) => {
      button.addEventListener('click', () => switchTab(appState, button.dataset.tabTarget));
    });
    appState.elements.roleButtons.forEach((button) => {
      button.addEventListener('click', () => {
        appState.role = button.dataset.role;
        renderCreateRole(appState);
      });
    });
    appState.elements.createButton?.addEventListener('click', async () => {
      try {
        setStatus(appState.elements.createStatus, '正在创建担保单...');
        await createEscrowOrder(appState);
      } catch (error) {
        setStatus(appState.elements.createStatus, error instanceof Error ? error.message : '创建失败', 'error');
      }
    });
    appState.elements.joinButton?.addEventListener('click', async () => {
      try {
        setStatus(appState.elements.joinStatus, '正在加入担保单...');
        await joinEscrowOrder(appState);
      } catch (error) {
        setStatus(appState.elements.joinStatus, error instanceof Error ? error.message : '加入失败', 'error');
      }
    });
    [appState.elements.primaryAction, appState.elements.secondaryAction].forEach((button) => {
      button?.addEventListener('click', async () => {
        const action = String(button.dataset.action || '').trim();
        const tradeCode = String(appState.selectedTradeCode || '').trim();
        if (!action || !tradeCode) return;
        try {
          setStatus(appState.elements.detailStatus, '处理中...');
          if (action === 'fund') {
            await beginEscrowPayment(appState, tradeCode);
            return;
          }
          await submitEscrowAction(appState, action, tradeCode);
          setStatus(appState.elements.detailStatus, '操作成功。', 'success');
        } catch (error) {
          setStatus(appState.elements.detailStatus, error instanceof Error ? error.message : '操作失败', 'error');
        }
      });
    });

    renderAuthState(appState);
    renderCreateRole(appState);
    switchTab(appState, 'create');
    renderOrders(appState);
    return appState;
  }

  async function bootBrowser() {
    if (!globalScope.document) return;
    const root = globalScope.document.querySelector('[data-nexa-escrow-app]');
    if (!root) return;
    const appState = createApp(root);

    const synced = await syncSessionFromAuthCode(appState).catch(() => false);
    if (!appState.session && !synced) {
      const currentSession = await readServerSession();
      if (currentSession) {
        appState.session = currentSession;
        saveCachedSession(appState.storage, currentSession);
      }
    }
    if (!appState.session) {
      if (hasNexaEnvironment()) {
        await beginNexaLoginFlow().catch(() => {});
      } else {
        setStatus(appState.elements.createStatus, '仅支持在 Nexa App 内使用担保交易。', 'error');
      }
      return;
    }

    await loadBootstrap(appState).catch((error) => {
      setStatus(appState.elements.createStatus, error instanceof Error ? error.message : '加载失败', 'error');
    });
    await settlePendingEscrowPayment(appState).catch(() => {});
  }

  const exported = {
    NEXA_ESCROW_SESSION_STORAGE_KEY,
    NEXA_ESCROW_PENDING_PAYMENT_STORAGE_KEY,
    MAX_NEXA_ESCROW_SESSION_RETENTION_MS,
    beginNexaLoginFlow,
    createEscrowOrder,
    joinEscrowOrder,
    beginEscrowPayment,
    settlePendingEscrowPayment,
    submitEscrowAction
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exported;
  }

  if (globalScope.window) {
    globalScope.window.NexaEscrow = exported;
    bootBrowser().catch(() => {});
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
