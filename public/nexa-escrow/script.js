(function createNexaEscrowModule(globalScope) {
  const NEXA_ESCROW_SESSION_STORAGE_KEY = 'claw800:nexa-escrow:nexa-session';
  const NEXA_ESCROW_PENDING_PAYMENT_STORAGE_KEY = 'claw800:nexa-escrow:pending-payment';
  const NEXA_ESCROW_CODE_MODAL_STORAGE_KEY = 'claw800:nexa-escrow:code-modal:';
  const NEXA_ESCROW_LOCALE_STORAGE_KEY = 'claw800:nexa-escrow:locale';
  const MAX_NEXA_ESCROW_SESSION_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
  const NEXA_PROTOCOL_AUTH_BASE = 'nexaauth://oauth/authorize';
  const NEXA_PROTOCOL_ORDER_BASE = 'nexaauth://order';
  const NEXA_PUBLIC_CONFIG_ENDPOINT = '/api/nexa/public-config';
  let cachedNexaPublicConfig = null;
  const TRANSLATIONS = {
    zh: {
      tabCreate: '发起担保',
      tabOrders: '我的订单',
      tabAccount: '账户中心',
      roleBuyer: '我是买家',
      roleSeller: '我是卖家',
      amountLabel: '交易金额 (USDT)',
      counterpartySellerLabel: '卖方担保号',
      counterpartyBuyerLabel: '买方担保号',
      counterpartySellerPlaceholder: '输入卖方担保号，例如 N123456',
      counterpartyBuyerPlaceholder: '输入买方担保号，例如 N123456',
      descriptionLabel: '交易描述',
      descriptionPlaceholder: '例如：购买虚拟主机服务、设计稿定金等',
      createAction: '确认发起',
      joinHeadline: '输入交易码参与担保',
      tradeCodePlaceholder: '输入 8 位交易码',
      joinAction: '加入',
      ordersHeadline: '买家付款、卖家交付、买家放款',
      accountHeadline: '你的 Nexa 担保身份',
      escrowCodeLabel: '担保号',
      walletLabel: '钱包余额',
      copyAction: '复制',
      firstLoginHint: '首次登录提醒',
      codeModalTitle: '您的担保号是多少',
      codeModalConfirm: '我知道了',
      creatingOrder: '正在创建担保单...',
      joiningOrder: '正在加入担保单...',
      joiningOrderSuccess: '已加入担保单。',
      processing: '处理中...',
      actionSuccess: '操作成功。',
      createSuccess: '担保单已创建，交易码 {tradeCode}',
      notSupported: '仅支持在 Nexa App 内使用担保交易。',
      emptyOrders: '还没有担保单，先去发起一个。',
      detailAmount: '金额',
      detailBuyer: '买方担保号',
      detailSeller: '卖方担保号',
      detailDescription: '描述',
      actionFund: '支付担保金',
      actionDeliver: '确认已交付',
      actionRelease: '确认放款',
      actionCancel: '取消订单',
      viewerPending: '待加入'
    },
    en: {
      tabCreate: 'Create',
      tabOrders: 'Orders',
      tabAccount: 'Account',
      roleBuyer: 'I am Buyer',
      roleSeller: 'I am Seller',
      amountLabel: 'Amount (USDT)',
      counterpartySellerLabel: 'Seller Escrow ID',
      counterpartyBuyerLabel: 'Buyer Escrow ID',
      counterpartySellerPlaceholder: 'Enter seller escrow ID, e.g. N123456',
      counterpartyBuyerPlaceholder: 'Enter buyer escrow ID, e.g. N123456',
      descriptionLabel: 'Trade Description',
      descriptionPlaceholder: 'Example: VPS service, design deposit, etc.',
      createAction: 'Create Order',
      joinHeadline: 'Enter trade code to join the escrow',
      tradeCodePlaceholder: 'Enter the 8-character trade code',
      joinAction: 'Join',
      ordersHeadline: 'Buyer pays, seller delivers, buyer releases',
      accountHeadline: 'Your Nexa escrow identity',
      escrowCodeLabel: 'Escrow ID',
      walletLabel: 'Wallet Balance',
      copyAction: 'Copy',
      firstLoginHint: 'First login reminder',
      codeModalTitle: 'Your escrow ID',
      codeModalConfirm: 'Got it',
      creatingOrder: 'Creating escrow order...',
      joiningOrder: 'Joining escrow order...',
      joiningOrderSuccess: 'Escrow order joined.',
      processing: 'Processing...',
      actionSuccess: 'Action completed.',
      createSuccess: 'Escrow created, trade code {tradeCode}',
      notSupported: 'Escrow is only available inside the Nexa App.',
      emptyOrders: 'No escrow orders yet. Create one first.',
      detailAmount: 'Amount',
      detailBuyer: 'Buyer Escrow ID',
      detailSeller: 'Seller Escrow ID',
      detailDescription: 'Description',
      actionFund: 'Pay Deposit',
      actionDeliver: 'Mark Delivered',
      actionRelease: 'Release Funds',
      actionCancel: 'Cancel Order',
      viewerPending: 'Pending'
    }
  };

  function getStorage() {
    try {
      return globalScope.localStorage;
    } catch {
      return globalScope.sessionStorage;
    }
  }

  function getStoredLocale(storage = getStorage()) {
    try {
      return storage?.getItem?.(NEXA_ESCROW_LOCALE_STORAGE_KEY) === 'zh' ? 'zh' : 'en';
    } catch {
      return 'en';
    }
  }

  function setStoredLocale(storage = getStorage(), locale = 'en') {
    try {
      storage?.setItem?.(NEXA_ESCROW_LOCALE_STORAGE_KEY, locale === 'zh' ? 'zh' : 'en');
    } catch {}
  }

  function t(locale, key) {
    const dictionary = TRANSLATIONS[locale === 'zh' ? 'zh' : 'en'];
    return dictionary?.[key] || key;
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

  function hasSeenEscrowCodeModal(storage = getStorage(), openId = '') {
    try {
      return storage?.getItem?.(`${NEXA_ESCROW_CODE_MODAL_STORAGE_KEY}${String(openId || '').trim()}`) === '1';
    } catch {
      return false;
    }
  }

  function markEscrowCodeModalSeen(storage = getStorage(), openId = '') {
    try {
      storage?.setItem?.(`${NEXA_ESCROW_CODE_MODAL_STORAGE_KEY}${String(openId || '').trim()}`, '1');
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
      counterpartyEscrowCode: appState.elements.counterpartyInput.value,
      description: appState.elements.descriptionInput.value
    });
    appState.orders = mergeOrder(appState.orders, response.order);
    appState.selectedTradeCode = response.order.tradeCode;
    renderOrders(appState);
    switchTab(appState, 'orders');
    setStatus(
      appState.elements.createStatus,
      t(appState.locale, 'createSuccess').replace('{tradeCode}', response.order.tradeCode),
      'success'
    );
  }

  async function joinEscrowOrder(appState) {
    const response = await postJson('/api/nexa-escrow/orders/join', {
      tradeCode: appState.elements.tradeCodeInput.value
    });
    appState.orders = mergeOrder(appState.orders, response.order);
    appState.selectedTradeCode = response.order.tradeCode;
    renderOrders(appState);
    setStatus(appState.elements.joinStatus, t(appState.locale, 'joiningOrderSuccess'), 'success');
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

  function applyTranslations(appState) {
    if (globalScope.document?.documentElement) {
      globalScope.document.documentElement.lang = appState.locale === 'zh' ? 'zh-CN' : 'en';
    }
    appState.elements.translatableNodes.forEach((node) => {
      node.textContent = t(appState.locale, node.dataset.i18n);
    });
    appState.elements.placeholderNodes.forEach((node) => {
      node.setAttribute('placeholder', t(appState.locale, node.dataset.i18nPlaceholder));
    });
    appState.elements.localeButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.localeToggle === appState.locale);
    });
  }

  async function copyEscrowCode(appState) {
    const code = String(appState.account?.escrowCode || '').trim();
    if (!code) return;
    const clipboard = globalScope.navigator?.clipboard;
    if (clipboard?.writeText) {
      await clipboard.writeText(code);
      return;
    }
    const helper = globalScope.document.createElement('input');
    helper.value = code;
    globalScope.document.body.appendChild(helper);
    helper.select();
    globalScope.document.execCommand('copy');
    helper.remove();
  }

  function toggleLanguage(appState, locale) {
    appState.locale = locale === 'zh' ? 'zh' : 'en';
    setStoredLocale(appState.storage, appState.locale);
    applyTranslations(appState);
    renderCreateRole(appState);
    renderOrders(appState);
    renderAccount(appState);
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

  function renderCreateRole(appState) {
    appState.elements.roleButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.role === appState.role);
    });
    appState.elements.counterpartyLabel.textContent = appState.role === 'buyer'
      ? t(appState.locale, 'counterpartySellerLabel')
      : t(appState.locale, 'counterpartyBuyerLabel');
    appState.elements.counterpartyInput.placeholder = appState.role === 'buyer'
      ? t(appState.locale, 'counterpartySellerPlaceholder')
      : t(appState.locale, 'counterpartyBuyerPlaceholder');
  }

  function renderOrderDetail(appState) {
    const order = appState.orders.find((item) => String(item.tradeCode) === String(appState.selectedTradeCode || ''));
    const card = appState.elements.orderDetail;
    if (!order) {
      card.hidden = true;
      return;
    }
    card.hidden = false;
    appState.elements.detailTitle.textContent = appState.locale === 'zh'
      ? `交易码 ${order.tradeCode}`
      : `Trade ${order.tradeCode}`;
    appState.elements.detailPill.textContent = order.status;
    appState.elements.detailBody.innerHTML = `
      <div class="nexa-escrow-order-detail__line">${t(appState.locale, 'detailAmount')}：${order.amount} ${order.currency}</div>
      <div class="nexa-escrow-order-detail__line">${t(appState.locale, 'detailBuyer')}：${order.buyerEscrowCode || '--'} ${order.buyerNickname ? `(${order.buyerNickname})` : ''}</div>
      <div class="nexa-escrow-order-detail__line">${t(appState.locale, 'detailSeller')}：${order.sellerEscrowCode || '--'} ${order.sellerNickname ? `(${order.sellerNickname})` : ''}</div>
      <div class="nexa-escrow-order-detail__line">${t(appState.locale, 'detailDescription')}：${order.description || '--'}</div>
    `;

    const [primaryAction, secondaryAction] = order.availableActions || [];
    const actionText = {
      fund: t(appState.locale, 'actionFund'),
      mark_delivered: t(appState.locale, 'actionDeliver'),
      release: t(appState.locale, 'actionRelease'),
      cancel: t(appState.locale, 'actionCancel')
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
      list.innerHTML = `<article class="nexa-escrow-order-item"><div class="nexa-escrow-order-item__meta">${t(appState.locale, 'emptyOrders')}</div></article>`;
      renderOrderDetail(appState);
      return;
    }
    list.innerHTML = appState.orders.map((order) => `
      <button class="nexa-escrow-order-item" type="button" data-trade-code="${order.tradeCode}">
        <div class="nexa-escrow-order-item__top">
          <div class="nexa-escrow-order-item__code">${order.tradeCode}</div>
          <span class="nexa-escrow-pill">${order.status}</span>
        </div>
        <div class="nexa-escrow-order-item__meta">${order.amount} ${order.currency} · ${order.viewerRole || t(appState.locale, 'viewerPending')} · ${order.description}</div>
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

  function renderAccount(appState) {
    if (!appState.elements.accountCode || !appState.elements.accountWallet) return;
    appState.elements.accountCode.textContent = String(appState.account?.escrowCode || 'N000000');
    appState.elements.accountWallet.textContent = `${String(appState.account?.wallet || '0.00')} USDT`;
  }

  function openEscrowCodeModal(appState) {
    const modal = appState.elements.codeModal;
    if (!modal || !appState.account?.escrowCode) return;
    appState.elements.codeModalValue.textContent = String(appState.account.escrowCode);
    modal.hidden = false;
  }

  function closeEscrowCodeModal(appState) {
    const modal = appState.elements.codeModal;
    if (!modal) return;
    modal.hidden = true;
    if (appState.session?.openId) {
      markEscrowCodeModalSeen(appState.storage, appState.session.openId);
    }
  }

  async function loadBootstrap(appState) {
    const response = await getJson('/api/nexa-escrow/bootstrap');
    appState.account = response.account || null;
    appState.orders = Array.isArray(response.orders) ? response.orders : [];
    renderOrders(appState);
    renderAccount(appState);
  }

  function createApp(root) {
    const storage = getStorage();
    const appState = {
      storage,
      locale: getStoredLocale(storage),
      session: loadCachedSession(storage),
      account: null,
      orders: [],
      selectedTradeCode: '',
      role: 'buyer',
      activeTab: 'create',
      elements: {
        tabButtons: Array.from(root.querySelectorAll('[data-tab-target]')),
        panels: Array.from(root.querySelectorAll('[data-tab]')),
        roleButtons: Array.from(root.querySelectorAll('[data-role]')),
        localeButtons: Array.from(root.querySelectorAll('[data-locale-toggle]')),
        translatableNodes: Array.from(root.querySelectorAll('[data-i18n]')),
        placeholderNodes: Array.from(root.querySelectorAll('[data-i18n-placeholder]')),
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
        secondaryAction: root.querySelector('#nexaEscrowSecondaryAction'),
            accountCode: root.querySelector('#nexaEscrowAccountCode'),
            accountWallet: root.querySelector('#nexaEscrowAccountWallet'),
            accountCodeCopy: root.querySelector('#nexaEscrowAccountCodeCopy'),
            codeModal: globalScope.document.querySelector('#nexaEscrowCodeModal'),
            codeModalValue: globalScope.document.querySelector('#nexaEscrowCodeModalValue'),
            codeModalConfirm: globalScope.document.querySelector('#nexaEscrowCodeModalConfirm')
      }
    };

    appState.elements.tabButtons.forEach((button) => {
      button.addEventListener('click', () => switchTab(appState, button.dataset.tabTarget));
    });
    appState.elements.localeButtons.forEach((button) => {
      button.addEventListener('click', () => toggleLanguage(appState, button.dataset.localeToggle));
    });
    appState.elements.roleButtons.forEach((button) => {
      button.addEventListener('click', () => {
        appState.role = button.dataset.role;
        renderCreateRole(appState);
      });
    });
    appState.elements.createButton?.addEventListener('click', async () => {
      try {
        setStatus(appState.elements.createStatus, t(appState.locale, 'creatingOrder'));
        await createEscrowOrder(appState);
      } catch (error) {
        setStatus(appState.elements.createStatus, error instanceof Error ? error.message : '创建失败', 'error');
      }
    });
    appState.elements.joinButton?.addEventListener('click', async () => {
      try {
        setStatus(appState.elements.joinStatus, t(appState.locale, 'joiningOrder'));
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
          setStatus(appState.elements.detailStatus, t(appState.locale, 'processing'));
          if (action === 'fund') {
            await beginEscrowPayment(appState, tradeCode);
            return;
          }
          await submitEscrowAction(appState, action, tradeCode);
          setStatus(appState.elements.detailStatus, t(appState.locale, 'actionSuccess'), 'success');
        } catch (error) {
          setStatus(appState.elements.detailStatus, error instanceof Error ? error.message : '操作失败', 'error');
        }
      });
    });
    appState.elements.codeModalConfirm?.addEventListener('click', () => {
      closeEscrowCodeModal(appState);
    });
    appState.elements.accountCodeCopy?.addEventListener('click', async () => {
      try {
        await copyEscrowCode(appState);
      } catch {}
    });

    applyTranslations(appState);
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
          setStatus(appState.elements.createStatus, t(appState.locale, 'notSupported'), 'error');
        }
        return;
      }

    await loadBootstrap(appState).catch((error) => {
      setStatus(appState.elements.createStatus, error instanceof Error ? error.message : '加载失败', 'error');
    });
    await settlePendingEscrowPayment(appState).catch(() => {});
    if (appState.session?.openId && !hasSeenEscrowCodeModal(appState.storage, appState.session.openId)) {
      openEscrowCodeModal(appState);
    }
  }

  const exported = {
    NEXA_ESCROW_SESSION_STORAGE_KEY,
    NEXA_ESCROW_PENDING_PAYMENT_STORAGE_KEY,
    NEXA_ESCROW_LOCALE_STORAGE_KEY,
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
