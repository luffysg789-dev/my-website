(function createNexaEscrowModule(globalScope) {
  const NEXA_ESCROW_SESSION_STORAGE_KEY = 'claw800:nexa-escrow:nexa-session';
  const NEXA_ESCROW_PENDING_PAYMENT_STORAGE_KEY = 'claw800:nexa-escrow:pending-payment';
  const NEXA_ESCROW_CODE_MODAL_STORAGE_KEY = 'claw800:nexa-escrow:code-modal:';
  const MAX_NEXA_ESCROW_SESSION_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
  const NEXA_ESCROW_PULL_REFRESH_TRIGGER_PX = 68;
  const NEXA_ESCROW_PULL_REFRESH_MAX_PX = 92;
  const NEXA_ESCROW_REFRESH_FEEDBACK_MS = 520;
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
      amountLabel: '金额 (USDT)',
      counterpartySellerLabel: '卖方担保号',
      counterpartyBuyerLabel: '买方担保号',
      counterpartySellerPlaceholder: '输入卖方担保号，例如 n123456',
      counterpartyBuyerPlaceholder: '输入买方担保号，例如 n123456',
      descriptionLabel: '交易描述',
      descriptionPlaceholder: '例如：购买虚拟主机服务、设计稿定金等',
      createAction: '确认发起',
      createAndPayAction: '确认发起并付款',
      accountHeadline: '你的 Nexa 担保身份',
      filterAll: '全部',
      filterActive: '进行中',
      filterDisputed: '申诉中',
      filterCancelled: '已取消',
      filterCompleted: '完成',
      escrowCodeLabel: '担保号',
      walletLabel: '钱包余额',
      nicknameLabel: '昵称',
      nicknameHint: '昵称一旦生成，无法修改',
      nicknameSaved: '昵称已保存',
      nicknameLocked: '昵称已生成，无法修改',
      nicknameRequired: '请填写昵称',
      nicknameInvalid: '昵称仅支持中文、英文、数字，长度 2-12 位',
      copyAction: '复制',
      withdrawAction: '提现',
      withdrawPrompt: '输入要提现到 Nexa 余额的 USDT 金额',
      withdrawCreated: '提现申请已提交到 Nexa。',
      withdrawOnlyNexa: '请在 Nexa App 内提现。',
      invalidEscrowCode: '请填写正确担保号',
      invalidAmount: '金额最多支持两位小数',
      descriptionTooLong: '交易描述最多 30 个字',
      firstLoginHint: '首次登录提醒',
      codeModalTitle: '请输入昵称',
      codeModalConfirm: '确定',
      creatingOrder: '正在创建担保单...',
      joiningOrder: '正在加入担保单...',
      joiningOrderSuccess: '已加入担保单。',
      processing: '处理中...',
      actionSuccess: '操作成功。',
      createSuccess: '担保单已创建，交易码 {tradeCode}',
      notSupported: '仅支持在 Nexa App 内使用担保交易。',
      emptyOrders: '还没有担保单，先去发起一个。',
      detailAmount: '金额',
      detailBuyer: '买方',
      detailSeller: '卖方',
      detailDescription: '描述',
      detailCreatedAt: '创建时间',
      progressTitle: '交易进度',
      safeTitle: '安全提醒',
      safeBody: '请务必收到货物/服务后再点击“确认收货”。如有疑问，请立即点击“申请仲裁”。',
      actionFund: '支付担保金',
      actionDeliver: '发货',
      actionConfirmReceipt: '收到货',
      actionDispute: '申请仲裁',
      actionCancel: '取消订单',
      actionDeliveredDone: '已发货',
      actionCompletedDone: '已完成',
      actionCancelledDone: '已取消',
      confirmDeliverPrompt: '确认已经发货吗？',
      confirmReceiptPrompt: '确认已经收到货物/服务，并同意放款给卖家吗？',
      confirmCancelPrompt: '确认取消这笔订单吗？',
      viewerPending: '待确认',
      statusAwaitingPayment: '待买家支付担保金',
      statusPaymentPending: '支付处理中',
      statusFunded: '资金已托管',
      statusDelivered: '已发货，等买家放款',
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
      viewDetail: '查看详情',
      closeDetail: '关闭详情',
      viewerBuyer: '我是买家',
      viewerSeller: '我是卖家'
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
      counterpartySellerPlaceholder: 'Enter seller escrow ID, e.g. n123456',
      counterpartyBuyerPlaceholder: 'Enter buyer escrow ID, e.g. n123456',
      descriptionLabel: 'Trade Description',
      descriptionPlaceholder: 'Example: VPS service, design deposit, etc.',
      createAction: 'Create Order',
      createAndPayAction: 'Create & Pay',
      accountHeadline: 'Your Nexa escrow identity',
      filterAll: 'All',
      filterActive: 'Active',
      filterDisputed: 'Disputed',
      filterCancelled: 'Cancelled',
      filterCompleted: 'Completed',
      escrowCodeLabel: 'Escrow ID',
      walletLabel: 'Wallet Balance',
      nicknameLabel: 'Nickname',
      nicknameHint: 'Nickname can only be created once.',
      nicknameSaved: 'Nickname saved.',
      nicknameLocked: 'Nickname is already locked.',
      nicknameRequired: 'Please enter a nickname',
      nicknameInvalid: 'Nickname only supports letters, numbers, and Chinese, 2-12 chars',
      copyAction: 'Copy',
      withdrawAction: 'Withdraw',
      withdrawPrompt: 'Enter the USDT amount to withdraw to Nexa balance',
      withdrawCreated: 'Withdrawal has been submitted to Nexa.',
      withdrawOnlyNexa: 'Please withdraw inside the Nexa App.',
      invalidEscrowCode: 'Please enter a valid escrow ID',
      invalidAmount: 'Amount supports at most 2 decimal places',
      descriptionTooLong: 'Description must be 30 characters or fewer',
      firstLoginHint: 'First login reminder',
      codeModalTitle: 'Set your nickname',
      codeModalConfirm: 'Confirm',
      creatingOrder: 'Creating escrow order...',
      joiningOrder: 'Joining escrow order...',
      joiningOrderSuccess: 'Escrow order joined.',
      processing: 'Processing...',
      actionSuccess: 'Action completed.',
      createSuccess: 'Escrow created, trade code {tradeCode}',
      notSupported: 'Escrow is only available inside the Nexa App.',
      emptyOrders: 'No escrow orders yet. Create one first.',
      detailAmount: 'Amount',
      detailBuyer: 'Buyer',
      detailSeller: 'Seller',
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
      actionDeliveredDone: 'Delivered',
      actionCompletedDone: 'Completed',
      actionCancelledDone: 'Cancelled',
      confirmDeliverPrompt: 'Confirm that you have delivered the goods or service?',
      confirmReceiptPrompt: 'Confirm that you have received the goods or service and agree to release the funds to the seller?',
      confirmCancelPrompt: 'Confirm cancelling this order?',
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
      viewDetail: 'View Details',
      closeDetail: 'Close Details',
      viewerBuyer: 'I am Buyer',
      viewerSeller: 'I am Seller'
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

  function normalizeMoneyInputValue(value) {
    const raw = String(value || '').replace(/[^\d.]/g, '');
    if (!raw) return '';
    const [whole = '', ...fractionParts] = raw.split('.');
    const normalizedWhole = whole.replace(/^0+(?=\d)/, '') || (whole ? '0' : '');
    const fraction = fractionParts.join('').slice(0, 2);
    if (!raw.includes('.')) {
      return normalizedWhole;
    }
    return `${normalizedWhole || '0'}.${fraction}`;
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
    const description = String(appState.elements.descriptionInput.value || '').trim();
    const amount = String(appState.elements.amountInput.value || '').trim();
    if (amount.includes('.') && String(amount.split('.')[1] || '').length > 2) {
      setStatus(appState.elements.createStatus, t(appState.locale, 'invalidAmount'), 'error');
      return null;
    }
    if (description.length > 30) {
      setStatus(appState.elements.createStatus, t(appState.locale, 'descriptionTooLong'), 'error');
      return null;
    }
    const response = await postJson('/api/nexa-escrow/orders', {
      creatorRole: appState.role,
      amount,
      counterpartyEscrowCode: appState.elements.counterpartyInput.value,
      description
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
    return response;
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
    openEscrowWithdrawModal(appState);
  }

  function openEscrowWithdrawModal(appState) {
    if (!appState.elements.withdrawModal) return;
    appState.elements.withdrawAmountInput.value = '';
    appState.elements.withdrawModal.hidden = false;
    globalScope.window.setTimeout(() => {
      appState.elements.withdrawAmountInput?.focus();
    }, 60);
  }

  function closeEscrowWithdrawModal(appState) {
    if (!appState.elements.withdrawModal) return;
    appState.elements.withdrawModal.hidden = true;
  }

  async function submitEscrowWithdraw(appState) {
    const amount = String(appState.elements.withdrawAmountInput?.value || '').trim();
    if (!amount) return;
    if (amount.includes('.') && String(amount.split('.')[1] || '').length > 2) {
      setStatus(appState.elements.accountStatus, t(appState.locale, 'invalidAmount'), 'error');
      return;
    }
    closeEscrowWithdrawModal(appState);
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

  function showEscrowToast(appState, message) {
    const toast = appState.elements.toast;
    if (!toast) return;
    toast.textContent = String(message || '').trim();
    toast.hidden = false;
    globalScope.window.clearTimeout(appState.toastTimer);
    appState.toastTimer = globalScope.window.setTimeout(() => {
      toast.hidden = true;
    }, 1600);
  }

  function getScrollableEscrowContainer(appState, node) {
    if (!node) return null;
    if (appState.elements.withdrawModal && appState.elements.withdrawModal.hidden === false && appState.elements.withdrawModal.contains(node)) {
      return null;
    }
    return node.closest('[data-tab]') || null;
  }

  function getEscrowFieldAnchor(node) {
    if (!node) return null;
    return node.closest('.nexa-escrow-field') || node;
  }

  function scrollEscrowFieldIntoView(appState, node) {
    if (!node) return;
    const container = getScrollableEscrowContainer(appState, node);
    const anchor = getEscrowFieldAnchor(node);
    globalScope.window.setTimeout(() => {
      try {
        anchor.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
      } catch {
        try {
          anchor.scrollIntoView();
        } catch {}
      }
      if (container && typeof container.scrollTop === 'number') {
        const containerRect = container.getBoundingClientRect();
        const anchorRect = anchor.getBoundingClientRect();
        const viewport = globalScope.window.visualViewport;
        const visibleBottom = Math.min(
          containerRect.bottom,
          viewport ? viewport.offsetTop + viewport.height - 18 : containerRect.bottom - 18
        );
        const visibleTop = containerRect.top + 18;
        if (anchorRect.bottom > visibleBottom) {
          container.scrollTop += anchorRect.bottom - visibleBottom + 16;
        } else if (anchorRect.top < visibleTop) {
          container.scrollTop -= visibleTop - anchorRect.top + 12;
        }
      }
    }, 80);
  }

  function updateEscrowKeyboardInset(appState) {
    const createPanel = appState.elements.createPanel;
    if (!createPanel) return;
    const viewport = globalScope.window.visualViewport;
    if (!viewport || appState.activeTab !== 'create' || !appState.activeInputNode || !createPanel.contains(appState.activeInputNode)) {
      createPanel.style.paddingBottom = '';
      return;
    }
    const keyboardInset = Math.max(0, Math.round(globalScope.window.innerHeight - viewport.height - viewport.offsetTop));
    createPanel.style.paddingBottom = keyboardInset > 0 ? `${keyboardInset + 20}px` : '';
  }

  function switchTab(appState, tab) {
    appState.activeTab = String(tab || 'create');
    if (appState.activeTab !== 'orders') {
      resetOrdersPullRefresh(appState);
    }
    if (appState.activeTab !== 'account') {
      resetAccountPullRefresh(appState);
    }
    appState.elements.panels.forEach((panel) => {
      const active = panel.dataset.tab === appState.activeTab;
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
    });
    appState.elements.tabButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.tabTarget === appState.activeTab);
    });
    updateEscrowKeyboardInset(appState);
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
    if (appState.elements.createButton) {
      appState.elements.createButton.textContent = appState.role === 'buyer'
        ? t(appState.locale, 'createAndPayAction')
        : t(appState.locale, 'createAction');
    }
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
    if (appState.elements.detailTitle) {
      appState.elements.detailTitle.textContent = appState.locale === 'zh'
        ? `交易码 ${order.tradeCode}`
        : `Trade ${order.tradeCode}`;
    }
    if (appState.elements.detailPill) {
      appState.elements.detailPill.textContent = describeOrderStatus(appState, order);
    }
    appState.elements.detailBody.innerHTML = `
      <div class="nexa-escrow-order-detail__line nexa-escrow-order-detail__line--block"><span>${t(appState.locale, 'detailDescription')}</span><strong>${order.description || '--'}</strong></div>
      <div class="nexa-escrow-detail-grid">
        <div class="nexa-escrow-order-detail__line nexa-escrow-order-detail__line--card nexa-escrow-order-detail__line--buyer">${formatEscrowIdentityLine(t(appState.locale, 'detailBuyer'), order.buyerEscrowNickname, order.buyerEscrowCode)}</div>
        <div class="nexa-escrow-order-detail__line nexa-escrow-order-detail__line--card nexa-escrow-order-detail__line--seller">${formatEscrowIdentityLine(t(appState.locale, 'detailSeller'), order.sellerEscrowNickname, order.sellerEscrowCode)}</div>
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
    const normalizedStatus = String(order?.status || '').trim().toUpperCase();
    const normalizedViewerRole = String(order?.viewerRole || '').trim().toLowerCase();
    const showDeliveredInfo = normalizedStatus === 'DELIVERED' && normalizedViewerRole === 'seller';
    const showCompletedInfo = normalizedStatus === 'COMPLETED';
    const showCancelledInfo = normalizedStatus === 'CANCELLED';
    const infoAction = showCompletedInfo
      ? t(appState.locale, 'actionCompletedDone')
      : (showCancelledInfo
          ? t(appState.locale, 'actionCancelledDone')
          : (showDeliveredInfo ? t(appState.locale, 'actionDeliveredDone') : ''));
    appState.elements.infoAction.hidden = !infoAction;
    appState.elements.infoAction.textContent = infoAction;
    appState.elements.primaryAction.hidden = !primaryAction || showCancelledInfo;
    appState.elements.secondaryAction.hidden = !secondaryAction;
    appState.elements.primaryAction.textContent = actionText[primaryAction] || primaryAction || '';
    appState.elements.secondaryAction.textContent = actionText[secondaryAction] || secondaryAction || '';
    appState.elements.primaryAction.dataset.action = primaryAction || '';
    appState.elements.secondaryAction.dataset.action = secondaryAction || '';
    appState.elements.primaryAction.classList.toggle('is-dispute', primaryAction === 'dispute');
    appState.elements.secondaryAction.classList.toggle('is-dispute', secondaryAction === 'dispute');
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
    renderOrders(appState);
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

  function describeViewerRole(appState, order) {
    const viewerRole = String(order?.viewerRole || '').trim().toLowerCase();
    if (viewerRole === 'buyer') return t(appState.locale, 'viewerBuyer');
    if (viewerRole === 'seller') return t(appState.locale, 'viewerSeller');
    const accountEscrowCode = normalizeEscrowCode(appState.account?.escrowCode);
    if (!accountEscrowCode) return '';
    const buyerEscrowCode = normalizeEscrowCode(order?.buyerEscrowCode);
    const sellerEscrowCode = normalizeEscrowCode(order?.sellerEscrowCode);
    if (accountEscrowCode === buyerEscrowCode) return t(appState.locale, 'viewerBuyer');
    if (accountEscrowCode === sellerEscrowCode) return t(appState.locale, 'viewerSeller');
    return '';
  }

  function getViewerRoleType(appState, order) {
    const viewerRole = String(order?.viewerRole || '').trim().toLowerCase();
    if (viewerRole === 'buyer' || viewerRole === 'seller') return viewerRole;
    const accountEscrowCode = normalizeEscrowCode(appState.account?.escrowCode);
    if (!accountEscrowCode) return '';
    const buyerEscrowCode = normalizeEscrowCode(order?.buyerEscrowCode);
    const sellerEscrowCode = normalizeEscrowCode(order?.sellerEscrowCode);
    if (accountEscrowCode === buyerEscrowCode) return 'buyer';
    if (accountEscrowCode === sellerEscrowCode) return 'seller';
    return '';
  }

  function renderOrders(appState) {
    const list = appState.elements.ordersList;
    if (!list) return;
    const hasExpandedDetail = Boolean(appState.selectedTradeCode) && appState.elements.orderDetail?.hidden === false;
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
      <article class="nexa-escrow-order-item${hasExpandedDetail && order.tradeCode === appState.selectedTradeCode ? ' is-selected' : ''}" data-trade-code="${order.tradeCode}">
        <div class="nexa-escrow-order-item__top">
          <div class="nexa-escrow-order-item__code">订单号: ${order.tradeCode}</div>
          <span class="nexa-escrow-order-item__status">${describeOrderStatus(appState, order)}</span>
        </div>
        <div class="nexa-escrow-order-item__summary">
          <div class="nexa-escrow-order-item__amount">
            <strong>${order.amount} ${order.currency}</strong>
          </div>
          <div class="nexa-escrow-order-item__time">${order.createdAt || '--'}</div>
        </div>
        <div class="nexa-escrow-order-item__desc">${order.description || '--'}</div>
        <div class="nexa-escrow-order-item__footer">
          ${describeViewerRole(appState, order) ? `<span class="nexa-escrow-order-item__initiator nexa-escrow-order-item__initiator--${getViewerRoleType(appState, order)}">${describeViewerRole(appState, order)}</span>` : ''}
          <button class="nexa-escrow-order-item__view" type="button" data-detail-trigger="${order.tradeCode}">${hasExpandedDetail && order.tradeCode === appState.selectedTradeCode ? t(appState.locale, 'closeDetail') : t(appState.locale, 'viewDetail')}</button>
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
    const escrowCode = normalizeEscrowCode(appState.account?.escrowCode) || '';
    const escrowNickname = String(appState.account?.escrowNickname || '').trim();
    if (appState.elements.headerCode) {
      appState.elements.headerCode.textContent = escrowCode;
      appState.elements.headerCode.classList.toggle('is-loading', !escrowCode);
    }
    if (appState.elements.headerCopy) {
      appState.elements.headerCopy.classList.toggle('is-loading', !escrowCode);
    }
    if (appState.elements.nicknameInput) {
      appState.elements.nicknameInput.value = escrowNickname;
      appState.elements.nicknameInput.disabled = Boolean(escrowNickname);
    }
    if (appState.elements.nicknameSaveBtn) {
      appState.elements.nicknameSaveBtn.hidden = Boolean(escrowNickname);
      appState.elements.nicknameSaveBtn.disabled = Boolean(escrowNickname);
    }
    if (appState.elements.nicknameHint) {
      appState.elements.nicknameHint.textContent = escrowNickname
        ? t(appState.locale, 'nicknameLocked')
        : t(appState.locale, 'nicknameHint');
    }
    if (appState.elements.accountWallet) {
      appState.elements.accountWallet.textContent = `${String(appState.account?.wallet || '0.00')} USDT`;
    }
    if (appState.elements.withdrawBtn) {
      appState.elements.withdrawBtn.textContent = t(appState.locale, 'withdrawAction');
    }
  }

  function openEscrowCodeModal(appState) {
    const modal = appState.elements.codeModal;
    if (!modal) return;
    if (appState.elements.codeModalInput) {
      appState.elements.codeModalInput.value = '';
    }
    modal.hidden = false;
  }

  function closeEscrowCodeModal(appState) {
    const modal = appState.elements.codeModal;
    if (!modal) return;
    modal.hidden = true;
  }

  async function loadBootstrap(appState) {
    const response = await getJson('/api/nexa-escrow/bootstrap');
    appState.account = response.account || null;
    appState.orders = Array.isArray(response.orders) ? response.orders : [];
    renderOrders(appState);
    renderAccount(appState);
  }

  function maskEscrowNickname(nickname) {
    const normalized = String(nickname || '').trim();
    if (!normalized) return 'nexa玩家';
    const [firstChar] = Array.from(normalized);
    return `${firstChar}x**`;
  }

  function formatEscrowIdentityLine(roleLabel, nickname, escrowCode) {
    const maskedNickname = maskEscrowNickname(nickname);
    const normalizedCode = normalizeEscrowCode(escrowCode) || '--';
    return `
      <span>${roleLabel}:${maskedNickname}</span>
      <strong>担保号: ${normalizedCode}</strong>
    `;
  }

  async function saveEscrowNickname(appState) {
    const nickname = String(
      appState.elements.codeModal?.hidden === false
        ? (appState.elements.codeModalInput?.value || '')
        : (appState.elements.nicknameInput?.value || '')
    ).trim();
    if (!nickname) {
      const targetStatus = appState.elements.codeModal?.hidden === false
        ? appState.elements.codeModalHint
        : appState.elements.accountStatus;
      setStatus(targetStatus, t(appState.locale, 'nicknameRequired'), 'error');
      return;
    }
    const targetStatus = appState.elements.codeModal?.hidden === false
      ? appState.elements.codeModalHint
      : appState.elements.accountStatus;
    setStatus(targetStatus, t(appState.locale, 'processing'));
    const response = await postJson('/api/nexa-escrow/profile/nickname', { nickname });
    appState.account = {
      ...(appState.account || {}),
      ...(response.account || {})
    };
    renderAccount(appState);
    setStatus(targetStatus, t(appState.locale, 'nicknameSaved'), 'success');
    if (appState.elements.codeModal?.hidden === false) {
      closeEscrowCodeModal(appState);
    }
  }

  function delay(ms) {
    return new Promise((resolve) => {
      globalScope.window.setTimeout(resolve, ms);
    });
  }

  async function refreshCurrentEscrowTab(appState) {
    if (appState.bootstrapRefreshing) return;
    appState.bootstrapRefreshing = true;
    const activePanel = appState.activeTab === 'orders'
      ? appState.elements.ordersPanel
      : (appState.activeTab === 'account' ? appState.elements.accountPanel : null);
    activePanel?.classList.add('nexa-escrow-panel--refreshing');
    try {
      await Promise.all([
        loadBootstrap(appState),
        delay(NEXA_ESCROW_REFRESH_FEEDBACK_MS)
      ]);
    } finally {
      activePanel?.classList.remove('nexa-escrow-panel--refreshing');
      appState.bootstrapRefreshing = false;
    }
  }

  function resetOrdersPullRefresh(appState) {
    appState.ordersPullStartY = 0;
    appState.ordersPullDistance = 0;
    const indicator = appState.elements.ordersPullRefresh;
    if (!indicator) return;
    indicator.style.height = '0px';
    indicator.classList.remove('is-ready');
    if (!appState.ordersRefreshing) {
      indicator.classList.remove('is-refreshing');
    }
  }

  function updateOrdersPullRefresh(appState, distance) {
    const indicator = appState.elements.ordersPullRefresh;
    if (!indicator) return;
    const clamped = Math.max(0, Math.min(distance, NEXA_ESCROW_PULL_REFRESH_MAX_PX));
    appState.ordersPullDistance = clamped;
    indicator.style.height = `${clamped}px`;
    indicator.classList.toggle('is-ready', clamped >= NEXA_ESCROW_PULL_REFRESH_TRIGGER_PX);
  }

  async function refreshEscrowOrders(appState) {
    if (appState.ordersRefreshing) return;
    appState.ordersRefreshing = true;
    const indicator = appState.elements.ordersPullRefresh;
    appState.elements.ordersPanel?.classList.add('nexa-escrow-panel--refreshing');
    if (indicator) {
      indicator.style.height = `${NEXA_ESCROW_PULL_REFRESH_TRIGGER_PX}px`;
      indicator.classList.remove('is-ready');
      indicator.classList.add('is-refreshing');
    }
    try {
      await Promise.all([
        loadBootstrap(appState),
        delay(NEXA_ESCROW_REFRESH_FEEDBACK_MS)
      ]);
    } finally {
      appState.elements.ordersPanel?.classList.remove('nexa-escrow-panel--refreshing');
      appState.ordersRefreshing = false;
      resetOrdersPullRefresh(appState);
    }
  }

  function resetAccountPullRefresh(appState) {
    appState.accountPullStartY = 0;
    appState.accountPullDistance = 0;
    const indicator = appState.elements.accountPullRefresh;
    if (!indicator) return;
    indicator.style.height = '0px';
    indicator.classList.remove('is-ready');
    if (!appState.accountRefreshing) {
      indicator.classList.remove('is-refreshing');
    }
  }

  function updateAccountPullRefresh(appState, distance) {
    const indicator = appState.elements.accountPullRefresh;
    if (!indicator) return;
    const clamped = Math.max(0, Math.min(distance, NEXA_ESCROW_PULL_REFRESH_MAX_PX));
    appState.accountPullDistance = clamped;
    indicator.style.height = `${clamped}px`;
    indicator.classList.toggle('is-ready', clamped >= NEXA_ESCROW_PULL_REFRESH_TRIGGER_PX);
  }

  async function refreshEscrowAccount(appState) {
    if (appState.accountRefreshing) return;
    appState.accountRefreshing = true;
    const indicator = appState.elements.accountPullRefresh;
    appState.elements.accountPanel?.classList.add('nexa-escrow-panel--refreshing');
    if (indicator) {
      indicator.style.height = `${NEXA_ESCROW_PULL_REFRESH_TRIGGER_PX}px`;
      indicator.classList.remove('is-ready');
      indicator.classList.add('is-refreshing');
    }
    try {
      await Promise.all([
        loadBootstrap(appState),
        delay(NEXA_ESCROW_REFRESH_FEEDBACK_MS)
      ]);
    } finally {
      appState.elements.accountPanel?.classList.remove('nexa-escrow-panel--refreshing');
      appState.accountRefreshing = false;
      resetAccountPullRefresh(appState);
    }
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
      bootstrapRefreshing: false,
      ordersPullStartY: 0,
      ordersPullDistance: 0,
      ordersRefreshing: false,
      accountPullStartY: 0,
      accountPullDistance: 0,
      accountRefreshing: false,
      activeInputNode: null,
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
        createPanel: root.querySelector('[data-tab="create"]'),
        ordersList: root.querySelector('#nexaEscrowOrdersList'),
        ordersCard: root.querySelector('#nexaEscrowOrdersCard'),
        ordersPanel: root.querySelector('[data-tab="orders"]'),
        ordersPullRefresh: root.querySelector('#nexaEscrowOrdersPullToRefresh'),
        accountCard: root.querySelector('#nexaEscrowAccountCard'),
        accountPanel: root.querySelector('[data-tab="account"]'),
        accountPullRefresh: root.querySelector('#nexaEscrowAccountPullToRefresh'),
        orderDetail: root.querySelector('#nexaEscrowOrderDetail'),
        detailTitle: root.querySelector('#nexaEscrowDetailTitle'),
        detailPill: root.querySelector('#nexaEscrowDetailStatus'),
        detailBody: root.querySelector('#nexaEscrowDetailBody'),
        detailProgress: root.querySelector('#nexaEscrowDetailProgress'),
        safetyNotice: root.querySelector('#nexaEscrowSafetyNotice'),
        detailStatus: root.querySelector('#nexaEscrowDetailStatusText'),
        infoAction: root.querySelector('#nexaEscrowInfoAction'),
        primaryAction: root.querySelector('#nexaEscrowPrimaryAction'),
        secondaryAction: root.querySelector('#nexaEscrowSecondaryAction'),
        headerCode: root.querySelector('#nexaEscrowHeaderCode'),
        headerCopy: root.querySelector('#nexaEscrowHeaderCopy'),
        nicknameInput: root.querySelector('#nexaEscrowNicknameInput'),
        nicknameSaveBtn: root.querySelector('#nexaEscrowNicknameSaveBtn'),
        nicknameHint: root.querySelector('#nexaEscrowNicknameHint'),
        accountCode: root.querySelector('#nexaEscrowAccountCode'),
        accountWallet: root.querySelector('#nexaEscrowAccountWallet'),
            accountCodeCopy: root.querySelector('#nexaEscrowAccountCodeCopy'),
            withdrawBtn: root.querySelector('#nexaEscrowWithdrawBtn'),
            accountStatus: root.querySelector('#nexaEscrowAccountStatus'),
            withdrawModal: globalScope.document.querySelector('#nexaEscrowWithdrawModal'),
            withdrawAmountInput: globalScope.document.querySelector('#nexaEscrowWithdrawAmountInput'),
            withdrawCancel: globalScope.document.querySelector('#nexaEscrowWithdrawCancel'),
            withdrawConfirm: globalScope.document.querySelector('#nexaEscrowWithdrawConfirm'),
        toast: globalScope.document.querySelector('#nexaEscrowToast'),
        codeModal: globalScope.document.querySelector('#nexaEscrowCodeModal'),
        codeModalInput: globalScope.document.querySelector('#nexaEscrowCodeModalInput'),
        codeModalHint: globalScope.document.querySelector('#nexaEscrowCodeModalHint'),
        codeModalConfirm: globalScope.document.querySelector('#nexaEscrowCodeModalConfirm')
      }
    };

    appState.elements.tabButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const nextTab = String(button.dataset.tabTarget || 'create');
        switchTab(appState, nextTab);
        if (nextTab === 'orders' || nextTab === 'account') {
          refreshCurrentEscrowTab(appState).catch(() => {});
        }
      });
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
    appState.elements.ordersPanel?.addEventListener('touchstart', (event) => {
      if (appState.activeTab !== 'orders' || appState.ordersRefreshing) return;
      if (appState.elements.ordersPanel.scrollTop > 0) return;
      appState.ordersPullStartY = Number(event.touches?.[0]?.clientY || 0);
      appState.ordersPullDistance = 0;
    }, { passive: true });
    appState.elements.ordersPanel?.addEventListener('touchmove', (event) => {
      if (appState.activeTab !== 'orders' || appState.ordersRefreshing) return;
      if (appState.elements.ordersPanel.scrollTop > 0 || !appState.ordersPullStartY) {
        resetOrdersPullRefresh(appState);
        return;
      }
      const currentY = Number(event.touches?.[0]?.clientY || 0);
      const delta = currentY - appState.ordersPullStartY;
      if (delta <= 0) {
        resetOrdersPullRefresh(appState);
        return;
      }
      event.preventDefault();
      updateOrdersPullRefresh(appState, delta * 0.6);
    }, { passive: false });
    appState.elements.ordersPanel?.addEventListener('touchend', () => {
      if (appState.activeTab !== 'orders' || appState.ordersRefreshing) return;
      const shouldRefresh = appState.ordersPullDistance >= NEXA_ESCROW_PULL_REFRESH_TRIGGER_PX;
      if (shouldRefresh) {
        refreshEscrowOrders(appState).catch(() => {
          resetOrdersPullRefresh(appState);
        });
        return;
      }
      resetOrdersPullRefresh(appState);
    });
    appState.elements.accountPanel?.addEventListener('touchstart', (event) => {
      if (appState.activeTab !== 'account' || appState.accountRefreshing) return;
      if (appState.elements.accountPanel.scrollTop > 0) return;
      appState.accountPullStartY = Number(event.touches?.[0]?.clientY || 0);
      appState.accountPullDistance = 0;
    }, { passive: true });
    appState.elements.accountPanel?.addEventListener('touchmove', (event) => {
      if (appState.activeTab !== 'account' || appState.accountRefreshing) return;
      if (appState.elements.accountPanel.scrollTop > 0 || !appState.accountPullStartY) {
        resetAccountPullRefresh(appState);
        return;
      }
      const currentY = Number(event.touches?.[0]?.clientY || 0);
      const delta = currentY - appState.accountPullStartY;
      if (delta <= 0) {
        resetAccountPullRefresh(appState);
        return;
      }
      event.preventDefault();
      updateAccountPullRefresh(appState, delta * 0.6);
    }, { passive: false });
    appState.elements.accountPanel?.addEventListener('touchend', () => {
      if (appState.activeTab !== 'account' || appState.accountRefreshing) return;
      const shouldRefresh = appState.accountPullDistance >= NEXA_ESCROW_PULL_REFRESH_TRIGGER_PX;
      if (shouldRefresh) {
        refreshEscrowAccount(appState).catch(() => {
          resetAccountPullRefresh(appState);
        });
        return;
      }
      resetAccountPullRefresh(appState);
    });
    appState.elements.roleButtons.forEach((button) => {
      button.addEventListener('click', () => {
        appState.role = button.dataset.role;
        renderCreateRole(appState);
      });
    });
    [appState.elements.amountInput, appState.elements.counterpartyInput, appState.elements.descriptionInput, appState.elements.withdrawAmountInput].forEach((input) => {
      input?.addEventListener('focus', () => {
        appState.activeInputNode = input;
        updateEscrowKeyboardInset(appState);
        scrollEscrowFieldIntoView(appState, input);
      });
      input?.addEventListener('blur', () => {
        if (appState.activeInputNode === input) {
          appState.activeInputNode = null;
        }
        updateEscrowKeyboardInset(appState);
      });
    });
    [appState.elements.amountInput, appState.elements.withdrawAmountInput].forEach((input) => {
      input?.addEventListener('input', () => {
        const normalized = normalizeMoneyInputValue(input.value);
        if (input.value !== normalized) {
          input.value = normalized;
        }
      });
    });
    globalScope.window.visualViewport?.addEventListener?.('resize', () => {
      updateEscrowKeyboardInset(appState);
      if (appState.activeInputNode) {
        scrollEscrowFieldIntoView(appState, appState.activeInputNode);
      }
    });
    appState.elements.createButton?.addEventListener('click', async () => {
      try {
        setStatus(appState.elements.createStatus, t(appState.locale, 'creatingOrder'));
        const response = await createEscrowOrder(appState);
        if (appState.role === 'buyer' && response?.order?.tradeCode) {
          setStatus(appState.elements.createStatus, t(appState.locale, 'processing'));
          await beginEscrowPayment(appState, response.order.tradeCode);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '创建失败';
        const resolvedMessage = message === 'INVALID_COUNTERPARTY_ESCROW_CODE'
          ? t(appState.locale, 'invalidEscrowCode')
          : message;
        setStatus(appState.elements.createStatus, resolvedMessage, 'error');
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
              if (action === 'mark_delivered') {
                const confirmed = globalScope.window.confirm(t(appState.locale, 'confirmDeliverPrompt'));
                if (!confirmed) {
                  setStatus(appState.elements.detailStatus, '');
                  return;
                }
              }
              if (action === 'confirm_receipt') {
                const confirmed = globalScope.window.confirm(t(appState.locale, 'confirmReceiptPrompt'));
                if (!confirmed) {
                  setStatus(appState.elements.detailStatus, '');
                  return;
                }
              }
              if (action === 'cancel') {
                const confirmed = globalScope.window.confirm(t(appState.locale, 'confirmCancelPrompt'));
                if (!confirmed) {
                  setStatus(appState.elements.detailStatus, '');
                  return;
                }
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
      saveEscrowNickname(appState).catch((error) => {
        const message = error instanceof Error ? error.message : '';
        const resolvedMessage = message === 'ESCROW_NICKNAME_REQUIRED'
          ? t(appState.locale, 'nicknameRequired')
          : (message === 'ESCROW_NICKNAME_INVALID' ? t(appState.locale, 'nicknameInvalid') : (message === 'ESCROW_NICKNAME_LOCKED' ? t(appState.locale, 'nicknameLocked') : message || '保存失败'));
        setStatus(appState.elements.codeModalHint, resolvedMessage, 'error');
      });
    });
    appState.elements.accountCodeCopy?.addEventListener('click', async () => {
      try {
        await copyEscrowCode(appState);
        setStatus(appState.elements.accountStatus, '复制成功', 'success');
        showEscrowToast(appState, '复制成功');
      } catch {}
    });
    [appState.elements.headerCode, appState.elements.headerCopy].forEach((button) => {
      button?.addEventListener('click', async () => {
        try {
          await copyEscrowCode(appState);
          showEscrowToast(appState, '复制成功');
        } catch {}
      });
    });
        appState.elements.withdrawBtn?.addEventListener('click', () => {
          beginEscrowWithdrawFlow(appState).catch((error) => {
            setStatus(appState.elements.accountStatus, error instanceof Error ? error.message : '提现失败', 'error');
          });
        });
        appState.elements.nicknameSaveBtn?.addEventListener('click', () => {
          saveEscrowNickname(appState).catch((error) => {
            const message = error instanceof Error ? error.message : '';
            const resolvedMessage = message === 'ESCROW_NICKNAME_REQUIRED'
              ? t(appState.locale, 'nicknameRequired')
              : (message === 'ESCROW_NICKNAME_INVALID' ? t(appState.locale, 'nicknameInvalid') : (message === 'ESCROW_NICKNAME_LOCKED' ? t(appState.locale, 'nicknameLocked') : message || '保存失败'));
            setStatus(appState.elements.accountStatus, resolvedMessage, 'error');
          });
        });
        appState.elements.withdrawCancel?.addEventListener('click', () => {
          closeEscrowWithdrawModal(appState);
        });
    appState.elements.withdrawConfirm?.addEventListener('click', () => {
      submitEscrowWithdraw(appState).catch((error) => {
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
    if (!String(appState.account?.escrowNickname || '').trim()) {
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
  function normalizeEscrowCode(code) {
    const normalized = String(code || '').trim();
    if (!/^[nN]\d{6}$/.test(normalized)) return '';
    return `n${normalized.slice(1)}`;
  }
