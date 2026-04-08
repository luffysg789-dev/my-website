(function createNexaEscrowModule(globalScope) {
  const NEXA_ESCROW_SESSION_STORAGE_KEY = 'claw800:nexa-escrow:nexa-session';
  const NEXA_ESCROW_PENDING_PAYMENT_STORAGE_KEY = 'claw800:nexa-escrow:pending-payment';
  const NEXA_ESCROW_CODE_MODAL_STORAGE_KEY = 'claw800:nexa-escrow:code-modal:';
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
      ordersHeadline: '我的担保订单',
      accountHeadline: '你的 Nexa 担保身份',
      filterAll: '全部',
      filterActive: '进行中',
      filterDisputed: '争议中',
      filterCancelled: '已取消',
      filterCompleted: '完成',
      escrowCodeLabel: '担保号',
      walletLabel: '钱包余额',
      copyAction: '复制',
      withdrawAction: '提现',
      withdrawPrompt: '输入要提现到 Nexa 余额的 USDT 金额',
      withdrawCreated: '提现申请已提交到 Nexa。',
      withdrawOnlyNexa: '请在 Nexa App 内提现。',
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
      detailCreatedAt: '创建时间',
      progressTitle: '交易进度',
      safeTitle: '安全提醒',
      safeBody: '请务必在平台内完成所有沟通。不要在确认收到商品/服务前点击“收到货”。如有疑问，请立即点击“申请仲裁”。',
      actionFund: '支付担保金',
      actionDeliver: '发货',
      actionConfirmReceipt: '收到货',
      actionDispute: '申请仲裁',
      actionCancel: '取消订单',
      viewerPending: '待确认',
      statusAwaitingPayment: '待买家支付担保金',
      statusPaymentPending: '支付处理中',
      statusFunded: '资金已托管',
      statusDelivered: '卖家已发货，等待买家确认',
      statusDisputed: '争议中，等待平台仲裁',
      statusCompleted: '已完成，资金已释放',
      statusRefunded: '已退款给买家',
      statusCancelled: '已取消',
      progressCreatedTitle: '创建交易',
      progressCreatedBody: '买卖双方达成一致',
      progressFundedTitle: '资金托管',
      progressFundedBody: '买方已将 USDT 存入平台',
      progressDeliveredTitle: '卖家发货',
      progressDeliveredBody: '卖家已提供商品或服务',
      progressReceivedTitle: '确认收货',
      progressReceivedBody: '买方确认无误，资金释放',
      viewDetail: '查看详情'
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
      ordersHeadline: 'Buyer pays, seller delivers, buyer releases',
      accountHeadline: 'Your Nexa escrow identity',
      filterAll: 'All',
      filterActive: 'Active',
      filterDisputed: 'Disputed',
      filterCancelled: 'Cancelled',
      filterCompleted: 'Completed',
      escrowCodeLabel: 'Escrow ID',
      walletLabel: 'Wallet Balance',
      copyAction: 'Copy',
      withdrawAction: 'Withdraw',
      withdrawPrompt: 'Enter the USDT amount to withdraw to Nexa balance',
      withdrawCreated: 'Withdrawal has been submitted to Nexa.',
      withdrawOnlyNexa: 'Please withdraw inside the Nexa App.',
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
      detailCreatedAt: 'Created At',
      progressTitle: 'Progress',
      safeTitle: 'Safety Notice',
      safeBody: 'Keep all communication inside the platform. Do not confirm receipt before the goods or service are truly delivered. If anything is wrong, file arbitration immediately.',
      actionFund: 'Confirm Escrow',
      actionDeliver: 'Mark Shipped',
      actionConfirmReceipt: 'Confirm Receipt',
      actionDispute: 'Open Dispute',
      actionCancel: 'Cancel Order',
      viewerPending: 'Pending',
      statusAwaitingPayment: 'Waiting for buyer escrow payment',
      statusPaymentPending: 'Payment pending',
      statusFunded: 'Funds are held by the platform',
      statusDelivered: 'Seller delivered, waiting for buyer confirmation',
      statusDisputed: 'Disputed and awaiting platform arbitration',
      statusCompleted: 'Completed and released to seller',
      statusRefunded: 'Refunded to buyer',
      progressCreatedTitle: 'Order Created',
      progressCreatedBody: 'Buyer and seller agreed on the deal',
      progressFundedTitle: 'Escrow Funded',
      progressFundedBody: 'Buyer deposited USDT into the platform',
      progressDeliveredTitle: 'Seller Delivered',
      progressDeliveredBody: 'Seller delivered the goods or service',
      progressReceivedTitle: 'Buyer Confirmed',
      progressReceivedBody: 'Buyer confirmed receipt and funds were released',
      viewDetail: 'View Details'
    }
  };

  function getStorage() {
    try {
      return globalScope.localStorage;
    } catch {
      return globalScope.sessionStorage;
    }
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

  async function beginEscrowWithdrawFlow(appState) {
    if (!hasNexaEnvironment()) {
      setStatus(appState.elements.accountStatus, t(appState.locale, 'withdrawOnlyNexa'), 'error');
      return;
    }
    const amount = String(globalScope.window.prompt(t(appState.locale, 'withdrawPrompt')) || '').trim();
    if (!amount) return;
    setStatus(appState.elements.accountStatus, t(appState.locale, 'processing'));
    const response = await postJson('/api/nexa-escrow/withdraw/create', { amount });
    if (String(response?.partnerOrderNo || '').trim()) {
      await queryEscrowWithdrawalStatus(response.partnerOrderNo).catch(() => null);
    }
    await loadBootstrap(appState);
    setStatus(
      appState.elements.accountStatus,
      String(response?.status || '').trim().toLowerCase() === 'success'
        ? t(appState.locale, 'actionSuccess')
        : t(appState.locale, 'withdrawCreated'),
      'success'
    );
  }

  async function queryEscrowWithdrawalStatus(partnerOrderNo) {
    return postJson('/api/nexa-escrow/withdraw/query', { partnerOrderNo });
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

  function describeOrderStatus(appState, order) {
    const status = String(order?.status || '').trim().toUpperCase();
    if (status === 'AWAITING_PAYMENT') return t(appState.locale, 'statusAwaitingPayment');
    if (status === 'PAYMENT_PENDING') return t(appState.locale, 'statusPaymentPending');
    if (status === 'FUNDED') return t(appState.locale, 'statusFunded');
    if (status === 'DELIVERED') return t(appState.locale, 'statusDelivered');
    if (status === 'DISPUTED') return t(appState.locale, 'statusDisputed');
    if (status === 'COMPLETED') return t(appState.locale, 'statusCompleted');
    if (status === 'REFUNDED') return t(appState.locale, 'statusRefunded');
    if (status === 'CANCELLED') return t(appState.locale, 'statusCancelled');
    return String(order?.status || '');
  }

  function renderOrderProgress(appState, order) {
    const progressRoot = appState.elements.detailProgress;
    if (!progressRoot) return;
    const status = String(order?.status || '').trim().toUpperCase();
    const steps = [
      { key: 'created', title: t(appState.locale, 'progressCreatedTitle'), body: t(appState.locale, 'progressCreatedBody'), active: true },
      { key: 'funded', title: t(appState.locale, 'progressFundedTitle'), body: t(appState.locale, 'progressFundedBody'), active: ['FUNDED', 'DELIVERED', 'DISPUTED', 'COMPLETED', 'REFUNDED'].includes(status) },
      { key: 'delivered', title: t(appState.locale, 'progressDeliveredTitle'), body: t(appState.locale, 'progressDeliveredBody'), active: ['DELIVERED', 'DISPUTED', 'COMPLETED', 'REFUNDED'].includes(status) },
      { key: 'received', title: t(appState.locale, 'progressReceivedTitle'), body: t(appState.locale, 'progressReceivedBody'), active: ['COMPLETED'].includes(status) }
    ];
    progressRoot.innerHTML = `
      <p class="nexa-escrow-label">${t(appState.locale, 'progressTitle')}</p>
      <div class="nexa-escrow-progress-list">
        ${steps.map((step) => `
          <div class="nexa-escrow-progress-item${step.active ? ' is-active' : ''}">
            <div class="nexa-escrow-progress-item__dot"></div>
            <div>
              <strong>${step.title}</strong>
              <p>${step.body}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderOrderDetail(appState) {
    const order = appState.orders.find((item) => String(item.tradeCode) === String(appState.selectedTradeCode || ''));
    const card = appState.elements.orderDetail;
    if (!order) {
      closeOrderDetail(appState);
      setStatus(appState.elements.detailStatus, '');
      return;
    }
    if (card) {
      card.hidden = false;
    }
    appState.elements.detailTitle.textContent = appState.locale === 'zh'
      ? `交易码 ${order.tradeCode}`
      : `Trade ${order.tradeCode}`;
    appState.elements.detailPill.textContent = describeOrderStatus(appState, order);
    appState.elements.detailBody.innerHTML = `
      <div class="nexa-escrow-detail-grid">
        <div class="nexa-escrow-order-detail__line"><span>${t(appState.locale, 'detailAmount')}</span><strong>${order.amount} ${order.currency}</strong></div>
        <div class="nexa-escrow-order-detail__line"><span>${t(appState.locale, 'detailCreatedAt')}</span><strong>${order.createdAt || '--'}</strong></div>
      </div>
      <div class="nexa-escrow-order-detail__line nexa-escrow-order-detail__line--block"><span>${t(appState.locale, 'detailDescription')}</span><strong>${order.description || '--'}</strong></div>
      <div class="nexa-escrow-detail-grid">
        <div class="nexa-escrow-order-detail__line nexa-escrow-order-detail__line--card nexa-escrow-order-detail__line--buyer"><span>${t(appState.locale, 'detailBuyer')}</span><strong>${order.buyerEscrowCode || '--'}</strong></div>
        <div class="nexa-escrow-order-detail__line nexa-escrow-order-detail__line--card nexa-escrow-order-detail__line--seller"><span>${t(appState.locale, 'detailSeller')}</span><strong>${order.sellerEscrowCode || '--'}</strong></div>
      </div>
    `;
    renderOrderProgress(appState, order);
    appState.elements.safetyNotice.innerHTML = `
      <p class="nexa-escrow-label">${t(appState.locale, 'safeTitle')}</p>
      <p>${t(appState.locale, 'safeBody')}</p>
    `;

    const [primaryAction, secondaryAction] = order.availableActions || [];
    const actionText = {
      fund: t(appState.locale, 'actionFund'),
      mark_delivered: t(appState.locale, 'actionDeliver'),
      confirm_receipt: t(appState.locale, 'actionConfirmReceipt'),
      release: t(appState.locale, 'actionConfirmReceipt'),
      dispute: t(appState.locale, 'actionDispute'),
      cancel: t(appState.locale, 'actionCancel')
    };
    appState.elements.primaryAction.hidden = !primaryAction;
    appState.elements.secondaryAction.hidden = !secondaryAction;
    appState.elements.primaryAction.textContent = actionText[primaryAction] || primaryAction || '';
    appState.elements.secondaryAction.textContent = actionText[secondaryAction] || secondaryAction || '';
    appState.elements.primaryAction.dataset.action = primaryAction || '';
    appState.elements.secondaryAction.dataset.action = secondaryAction || '';
    setStatus(appState.elements.detailStatus, describeOrderStatus(appState, order), 'success');
    const selectedOrderNode = appState.elements.ordersList?.querySelector?.(`[data-trade-code="${appState.selectedTradeCode}"]`);
    if (selectedOrderNode && card) {
      selectedOrderNode.insertAdjacentElement('afterend', card);
    }
  }

  function closeOrderDetail(appState) {
    if (appState.elements.orderDetail) {
      appState.elements.orderDetail.hidden = true;
    }
    appState.selectedTradeCode = '';
  }

  function openEscrowOrderFromList(appState, tradeCode) {
    const normalizedTradeCode = String(tradeCode || '').trim();
    if (!normalizedTradeCode) return;
    if (String(appState.selectedTradeCode || '').trim() === normalizedTradeCode) {
      closeOrderDetail(appState);
      renderOrders(appState);
      return;
    }
    appState.selectedTradeCode = normalizedTradeCode;
    renderOrders(appState);
    renderOrderDetail(appState);
  }

  function filterOrders(appState) {
    const allOrders = Array.isArray(appState.orders) ? appState.orders : [];
    if (appState.orderFilter === 'active') {
      return allOrders.filter((order) => ['AWAITING_PAYMENT', 'PAYMENT_PENDING', 'FUNDED', 'DELIVERED'].includes(String(order?.status || '').trim().toUpperCase()));
    }
    if (appState.orderFilter === 'disputed') {
      return allOrders.filter((order) => String(order?.status || '').trim().toUpperCase() === 'DISPUTED');
    }
    if (appState.orderFilter === 'cancelled') {
      return allOrders.filter((order) => String(order?.status || '').trim().toUpperCase() === 'CANCELLED');
    }
    if (appState.orderFilter === 'completed') {
      return allOrders.filter((order) => ['COMPLETED', 'REFUNDED'].includes(String(order?.status || '').trim().toUpperCase()));
    }
    return allOrders;
  }

  function isOrderInitiatedByCurrentUser(appState, order) {
    const accountEscrowCode = String(appState.account?.escrowCode || '').trim().toUpperCase();
    if (!accountEscrowCode) return false;
    const creatorRole = String(order?.creatorRole || '').trim().toLowerCase();
    const buyerEscrowCode = String(order?.buyerEscrowCode || '').trim().toUpperCase();
    const sellerEscrowCode = String(order?.sellerEscrowCode || '').trim().toUpperCase();
    if (creatorRole === 'buyer') {
      return accountEscrowCode === buyerEscrowCode;
    }
    if (creatorRole === 'seller') {
      return accountEscrowCode === sellerEscrowCode;
    }
    return false;
  }

  function renderOrders(appState) {
    const list = appState.elements.ordersList;
    if (!list) return;
    appState.elements.orderFilterButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.orderFilter === appState.orderFilter);
    });
    const visibleOrders = filterOrders(appState);
    if (!visibleOrders.length) {
      list.innerHTML = `<article class="nexa-escrow-order-item"><div class="nexa-escrow-order-item__meta">${t(appState.locale, 'emptyOrders')}</div></article>`;
      appState.selectedTradeCode = '';
      closeOrderDetail(appState);
      return;
    }
    list.innerHTML = visibleOrders.map((order) => `
      <article class="nexa-escrow-order-item${order.tradeCode === appState.selectedTradeCode ? ' is-selected' : ''}" data-trade-code="${order.tradeCode}">
        <div class="nexa-escrow-order-item__top">
          <div class="nexa-escrow-order-item__code">订单号: ${order.tradeCode}</div>
          <span class="nexa-escrow-pill">${describeOrderStatus(appState, order)}</span>
        </div>
        <div class="nexa-escrow-order-item__summary">
          <div class="nexa-escrow-order-item__amount">
            <span class="nexa-escrow-label">${describeOrderStatus(appState, order)}</span>
            <strong>${order.amount} ${order.currency}</strong>
          </div>
          <div class="nexa-escrow-order-item__time">${order.createdAt || '--'}</div>
        </div>
        <div class="nexa-escrow-order-item__desc">${order.description || '--'}</div>
        <div class="nexa-escrow-order-item__footer">
          ${isOrderInitiatedByCurrentUser(appState, order) ? '<span class="nexa-escrow-order-item__initiator">我发起的</span>' : ''}
          <button class="nexa-escrow-order-item__view" type="button" data-detail-trigger="${order.tradeCode}">${t(appState.locale, 'viewDetail')}</button>
        </div>
      </article>
    `).join('');
    if (appState.selectedTradeCode && !visibleOrders.some((item) => item.tradeCode === appState.selectedTradeCode)) {
      appState.selectedTradeCode = '';
      closeOrderDetail(appState);
      return;
    }
    if (appState.selectedTradeCode && !appState.elements.orderDetail.hidden) {
      const selectedOrderNode = list.querySelector(`[data-trade-code="${appState.selectedTradeCode}"]`);
      if (selectedOrderNode) {
        selectedOrderNode.insertAdjacentElement('afterend', appState.elements.orderDetail);
      }
    }
  }

  function renderAccount(appState) {
    if (!appState.elements.accountCode || !appState.elements.accountWallet) return;
    const escrowCode = String(appState.account?.escrowCode || 'N000000');
    appState.elements.accountCode.textContent = escrowCode;
    if (appState.elements.headerCode) {
      appState.elements.headerCode.textContent = escrowCode;
    }
    appState.elements.accountWallet.textContent = `${String(appState.account?.wallet || '0.00')} USDT`;
    if (appState.elements.withdrawBtn) {
      appState.elements.withdrawBtn.textContent = t(appState.locale, 'withdrawAction');
    }
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
      locale: 'zh',
      session: loadCachedSession(storage),
      account: null,
      orders: [],
      selectedTradeCode: '',
      role: 'buyer',
      activeTab: 'create',
      orderFilter: 'all',
      elements: {
        tabButtons: Array.from(root.querySelectorAll('[data-tab-target]')),
        panels: Array.from(root.querySelectorAll('[data-tab]')),
        roleButtons: Array.from(root.querySelectorAll('[data-role]')),
        orderFilterButtons: Array.from(root.querySelectorAll('[data-order-filter]')),
        translatableNodes: Array.from(root.querySelectorAll('[data-i18n]')),
        placeholderNodes: Array.from(root.querySelectorAll('[data-i18n-placeholder]')),
        counterpartyLabel: root.querySelector('#nexaEscrowCounterpartyLabel'),
        amountInput: root.querySelector('#nexaEscrowAmountInput'),
        counterpartyInput: root.querySelector('#nexaEscrowCounterpartyInput'),
        descriptionInput: root.querySelector('#nexaEscrowDescriptionInput'),
        createButton: root.querySelector('#nexaEscrowCreateButton'),
        createStatus: root.querySelector('#nexaEscrowCreateStatus'),
        ordersList: root.querySelector('#nexaEscrowOrdersList'),
        orderDetail: root.querySelector('#nexaEscrowOrderDetail'),
        orderDetailClose: root.querySelector('#nexaEscrowOrderDetailClose'),
        detailTitle: root.querySelector('#nexaEscrowDetailTitle'),
        detailPill: root.querySelector('#nexaEscrowDetailStatus'),
        detailBody: root.querySelector('#nexaEscrowDetailBody'),
        detailProgress: root.querySelector('#nexaEscrowDetailProgress'),
        safetyNotice: root.querySelector('#nexaEscrowSafetyNotice'),
        detailStatus: root.querySelector('#nexaEscrowDetailStatusText'),
        primaryAction: root.querySelector('#nexaEscrowPrimaryAction'),
        secondaryAction: root.querySelector('#nexaEscrowSecondaryAction'),
            headerCode: root.querySelector('#nexaEscrowHeaderCode'),
            accountCode: root.querySelector('#nexaEscrowAccountCode'),
            accountWallet: root.querySelector('#nexaEscrowAccountWallet'),
            accountCodeCopy: root.querySelector('#nexaEscrowAccountCodeCopy'),
            withdrawBtn: root.querySelector('#nexaEscrowWithdrawBtn'),
            accountStatus: root.querySelector('#nexaEscrowAccountStatus'),
            codeModal: globalScope.document.querySelector('#nexaEscrowCodeModal'),
            codeModalValue: globalScope.document.querySelector('#nexaEscrowCodeModalValue'),
            codeModalConfirm: globalScope.document.querySelector('#nexaEscrowCodeModalConfirm')
      }
    };

    appState.elements.tabButtons.forEach((button) => {
      button.addEventListener('click', () => switchTab(appState, button.dataset.tabTarget));
    });
    appState.elements.orderFilterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        appState.orderFilter = String(button.dataset.orderFilter || 'all');
        renderOrders(appState);
      });
    });
    appState.elements.ordersList?.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target.closest('[data-detail-trigger]') : null;
      if (!target) return;
      openEscrowOrderFromList(appState, target.dataset.detailTrigger);
    });
    appState.elements.ordersList?.addEventListener('touchend', (event) => {
      const target = event.target instanceof Element ? event.target.closest('[data-detail-trigger]') : null;
      if (!target) return;
      event.preventDefault();
      openEscrowOrderFromList(appState, target.dataset.detailTrigger);
    }, { passive: false });
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
              const nextOrder = appState.orders.find((item) => item.tradeCode === tradeCode);
              setStatus(appState.elements.detailStatus, describeOrderStatus(appState, nextOrder), 'success');
            } catch (error) {
              setStatus(appState.elements.detailStatus, error instanceof Error ? error.message : '操作失败', 'error');
            }
      });
    });
    appState.elements.codeModalConfirm?.addEventListener('click', () => {
      closeEscrowCodeModal(appState);
    });
    appState.elements.orderDetailClose?.addEventListener('click', () => {
      closeOrderDetail(appState);
      renderOrders(appState);
    });
    appState.elements.accountCodeCopy?.addEventListener('click', async () => {
      try {
        await copyEscrowCode(appState);
        setStatus(appState.elements.accountStatus, '复制成功', 'success');
      } catch {}
    });
    appState.elements.withdrawBtn?.addEventListener('click', () => {
      beginEscrowWithdrawFlow(appState).catch((error) => {
        setStatus(appState.elements.accountStatus, error instanceof Error ? error.message : '提现失败', 'error');
      });
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
    MAX_NEXA_ESCROW_SESSION_RETENTION_MS,
    beginNexaLoginFlow,
    createEscrowOrder,
    beginEscrowPayment,
    beginEscrowWithdrawFlow,
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
