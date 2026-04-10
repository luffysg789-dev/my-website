const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const EventEmitter = require('node:events');

const dbModulePath = path.join(__dirname, '..', 'src', 'db.js');
const serverModulePath = path.join(__dirname, '..', 'src', 'server.js');
const nexaPayModulePath = path.join(__dirname, '..', 'src', 'nexa-pay.js');

function createHarness({ mockPaymentResponse, mockQueryResponse, mockWithdrawResponse, mockWithdrawQueryResponse, seedNexaEnv = true } = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claw800-nexa-escrow-auth-api-'));
  const dbPath = path.join(tmpDir, 'claw800.db');
  const previousDbPath = process.env.CLAW800_DB_PATH;
  const previousNexaApiKey = process.env.NEXA_API_KEY;
  const previousNexaAppSecret = process.env.NEXA_APP_SECRET;

  process.env.CLAW800_DB_PATH = dbPath;
  if (seedNexaEnv) {
    process.env.NEXA_API_KEY = process.env.NEXA_API_KEY || 'test-nexa-api-key';
    process.env.NEXA_APP_SECRET = process.env.NEXA_APP_SECRET || 'test-nexa-app-secret';
  }
  delete require.cache[require.resolve(dbModulePath)];
  delete require.cache[require.resolve(serverModulePath)];
  delete require.cache[require.resolve(nexaPayModulePath)];

  const nexaPay = require(nexaPayModulePath);
  if (mockPaymentResponse || mockQueryResponse || mockWithdrawResponse || mockWithdrawQueryResponse) {
    nexaPay.postNexaJson = async (endpointPath, payload) => {
      if (endpointPath === '/partner/api/openapi/payment/create' && mockPaymentResponse) {
        return mockPaymentResponse(payload);
      }
      if (endpointPath === '/partner/api/openapi/payment/query' && mockQueryResponse) {
        return mockQueryResponse(payload);
      }
      if (endpointPath === '/partner/api/openapi/account/withdraw' && mockWithdrawResponse) {
        return mockWithdrawResponse(payload);
      }
      if (endpointPath === '/partner/api/openapi/account/withdrawal/query' && mockWithdrawQueryResponse) {
        return mockWithdrawQueryResponse(payload);
      }
      throw new Error(`Unexpected Nexa endpoint: ${endpointPath}`);
    };
    nexaPay.unwrapNexaResult = (response, fallbackMessage = 'Nexa failed') => {
      if (String(response?.code ?? '') === '0') {
        return response.data || {};
      }
      throw new Error(String(response?.message || fallbackMessage));
    };
  }

  const db = require(dbModulePath);
  const app = require(serverModulePath);

  return {
    db,
    async request(method, routePath, body, options = {}) {
      return new Promise((resolve, reject) => {
        const req = new EventEmitter();
        req.method = method;
        req.url = routePath;
        req.originalUrl = routePath;
        req.headers = { ...(options.headers || {}) };
        req.connection = {};
        req.socket = {};
        req.body = body;
        req.query = {};
        req.cookies = { ...(options.cookies || {}) };

        const [pathname, queryString = ''] = routePath.split('?');
        req.path = pathname;
        const params = new URLSearchParams(queryString);
        for (const [key, value] of params.entries()) {
          req.query[key] = value;
        }

        const res = new EventEmitter();
        res.statusCode = 200;
        res.headers = {};
        res.locals = {};
        res.setHeader = function setHeader(name, value) {
          this.headers[String(name).toLowerCase()] = value;
        };
        res.getHeader = function getHeader(name) {
          return this.headers[String(name).toLowerCase()];
        };
        res.removeHeader = function removeHeader(name) {
          delete this.headers[String(name).toLowerCase()];
        };
        res.status = function status(code) {
          this.statusCode = code;
          return this;
        };
        res.cookie = function cookie(name, value, opts = {}) {
          const serialized = JSON.stringify({ name, value, opts });
          const current = this.headers['set-cookie'];
          if (!current) {
            this.headers['set-cookie'] = [serialized];
          } else {
            current.push(serialized);
          }
          return this;
        };
        res.clearCookie = function clearCookie(name, opts = {}) {
          return this.cookie(name, '', { ...opts, expires: new Date(0), maxAge: 0 });
        };
        res.json = function json(payload) {
          resolve({ statusCode: this.statusCode, body: payload, headers: this.headers });
          return this;
        };
        res.end = function end(chunk) {
          let payload = chunk;
          if (Buffer.isBuffer(payload)) payload = payload.toString('utf8');
          if (payload === undefined || payload === null || payload === '') {
            resolve({ statusCode: this.statusCode, body: null, headers: this.headers });
            return;
          }
          resolve({ statusCode: this.statusCode, body: String(payload), headers: this.headers });
        };

        app.handle(req, res, reject);
        req.emit('end');
      });
    },
    cleanup() {
      db.close();
      delete require.cache[require.resolve(serverModulePath)];
      delete require.cache[require.resolve(dbModulePath)];
      delete require.cache[require.resolve(nexaPayModulePath)];
      if (previousDbPath === undefined) {
        delete process.env.CLAW800_DB_PATH;
      } else {
        process.env.CLAW800_DB_PATH = previousDbPath;
      }
      if (previousNexaApiKey === undefined) {
        delete process.env.NEXA_API_KEY;
      } else {
        process.env.NEXA_API_KEY = previousNexaApiKey;
      }
      if (previousNexaAppSecret === undefined) {
        delete process.env.NEXA_APP_SECRET;
      } else {
        process.env.NEXA_APP_SECRET = previousNexaAppSecret;
      }
    }
  };
}

async function loginAdmin(harness) {
  const response = await harness.request('POST', '/api/admin/login', { password: '123456' });
  const setCookie = response.headers['set-cookie'];
  assert.equal(response.statusCode, 200);
  assert.ok(Array.isArray(setCookie));
  const serialized = JSON.parse(setCookie[0]);
  const token = serialized?.value;
  assert.ok(token);
  return { admin_token: token };
}

test('nexa-escrow session sync sets a 30-day cookie and returns the session payload', async () => {
  const harness = createHarness();

  try {
    const response = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-open-id-1',
      sessionKey: 'escrow-session-key-1',
      nickname: 'Escrow Buyer'
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.session.openId, 'escrow-open-id-1');
    assert.match(response.headers['set-cookie'][0], /"maxAge":2592000000/);
  } finally {
    harness.cleanup();
  }
});

test('admin can list all nexa escrow orders and update escrow user codes', async () => {
  const harness = createHarness();

  try {
    const buyerSync = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-admin-buyer-open-id',
      sessionKey: 'escrow-admin-buyer-session-key',
      nickname: 'Admin Buyer'
    });
    const buyerCookie = JSON.parse(buyerSync.headers['set-cookie'][0]);
    const sellerSync = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-admin-seller-open-id',
      sessionKey: 'escrow-admin-seller-session-key',
      nickname: 'Admin Seller'
    });
    const sellerCookie = JSON.parse(sellerSync.headers['set-cookie'][0]);
    const sellerBootstrap = await harness.request('GET', '/api/nexa-escrow/bootstrap', null, {
      cookies: { [sellerCookie.name]: sellerCookie.value }
    });
    const createResponse = await harness.request('POST', '/api/nexa-escrow/orders', {
      creatorRole: 'buyer',
      amount: '18.88',
      counterpartyEscrowCode: sellerBootstrap.body.account.escrowCode,
      description: '后台订单列表测试'
    }, {
      cookies: { [buyerCookie.name]: buyerCookie.value }
    });

    const adminCookies = await loginAdmin(harness);
    const ordersResponse = await harness.request('GET', '/api/admin/nexa-escrow-orders', undefined, {
      cookies: adminCookies
    });
    assert.equal(ordersResponse.statusCode, 200);
    assert.equal(ordersResponse.body.ok, true);
    assert.equal(ordersResponse.body.items.length, 1);
    assert.equal(ordersResponse.body.items[0].tradeCode, createResponse.body.order.tradeCode);

    const usersResponse = await harness.request('GET', '/api/admin/nexa-escrow-users', undefined, {
      cookies: adminCookies
    });
    assert.equal(usersResponse.statusCode, 200);
    assert.equal(usersResponse.body.ok, true);
    assert.equal(usersResponse.body.items.length >= 2, true);
    const sellerUser = usersResponse.body.items.find((item) => item.openId === 'escrow-admin-seller-open-id');
    assert.ok(sellerUser);
    assert.match(sellerUser.escrowCode, /^n\d{6}$/);
    assert.equal(sellerUser.walletBalance, '0.00');

    const updateResponse = await harness.request(
      'POST',
      `/api/admin/nexa-escrow-users/${sellerUser.userId}/code`,
      { escrowCode: 'N654321' },
      {
        cookies: adminCookies
      }
    );
    assert.equal(updateResponse.statusCode, 200);
    assert.equal(updateResponse.body.ok, true);
    assert.equal(updateResponse.body.item.escrowCode, 'n654321');

    const updatedUser = harness.db.prepare('SELECT escrow_code FROM game_users WHERE id = ?').get(sellerUser.userId);
    assert.equal(String(updatedUser.escrow_code), 'n654321');
  } finally {
    harness.cleanup();
  }
});

test('admin can list p-mining power orders and nexa tip orders', async () => {
  const harness = createHarness({
    mockPaymentResponse: (payload) => ({
      code: '0',
      message: 'success',
      data: {
        orderNo: `nexa_${payload.orderNo || 'order'}`,
        timestamp: '1710000000',
        nonce: 'test-nonce',
        signType: 'MD5',
        paySign: 'test-pay-sign',
        apiKey: 'test-nexa-api-key'
      }
    })
  });

  try {
    const syncResponse = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'admin-orders-open-id',
      sessionKey: 'admin-orders-session-key',
      nickname: 'Admin Orders User'
    });
    const serialized = JSON.parse(syncResponse.headers['set-cookie'][0]);
    await harness.request('GET', '/api/nexa-escrow/bootstrap', undefined, {
      cookies: {
        [serialized.name]: serialized.value
      }
    });
    const userId = harness.db.prepare('SELECT id FROM game_users WHERE openid = ?').get('admin-orders-open-id').id;

    harness.db.prepare(`
      INSERT INTO p_mining_payment_orders (
        order_no, partner_order_no, user_id, tier, power_amount, usdt_amount, status, nexa_order_no, notify_payload, paid_at, settled_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'pm_order_1',
      'pm_partner_1',
      userId,
      'starter',
      100,
      '10.00',
      'SUCCESS',
      'nexa_pm_1',
      '{}',
      '2026-04-10 08:00:00',
      '2026-04-10 08:01:00'
    );

    const tipCreateResponse = await harness.request('POST', '/api/nexa/tip/create', {
      gameSlug: 'gomoku',
      openId: 'tip-buyer-open-id',
      sessionKey: 'tip-buyer-session-key',
      amount: '0.10'
    });
    assert.equal(tipCreateResponse.statusCode, 200);
    assert.equal(tipCreateResponse.body.ok, true);

    const adminCookies = await loginAdmin(harness);

    const pMiningOrdersResponse = await harness.request('GET', '/api/admin/p-mining-orders', undefined, {
      cookies: adminCookies
    });
    assert.equal(pMiningOrdersResponse.statusCode, 200);
    assert.equal(pMiningOrdersResponse.body.ok, true);
    assert.equal(Array.isArray(pMiningOrdersResponse.body.items), true);
    assert.equal(pMiningOrdersResponse.body.items.length, 1);
    assert.equal(pMiningOrdersResponse.body.items[0].partnerOrderNo, 'pm_partner_1');
    assert.equal(pMiningOrdersResponse.body.items[0].openId, 'admin-orders-open-id');

    const tipOrdersResponse = await harness.request('GET', '/api/admin/nexa-tip-orders', undefined, {
      cookies: adminCookies
    });
    assert.equal(tipOrdersResponse.statusCode, 200);
    assert.equal(tipOrdersResponse.body.ok, true);
    assert.equal(Array.isArray(tipOrdersResponse.body.items), true);
    assert.equal(tipOrdersResponse.body.items.length, 1);
    assert.equal(tipOrdersResponse.body.items[0].gameSlug, 'gomoku');
    assert.equal(tipOrdersResponse.body.items[0].openId, 'tip-buyer-open-id');
    assert.equal(tipOrdersResponse.body.items[0].status, 'PENDING');
  } finally {
    harness.cleanup();
  }
});

test('admin nexa escrow user list shows escrow nickname after user saves it', async () => {
  const harness = createHarness();

  try {
    const syncResponse = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-admin-nickname-open-id',
      sessionKey: 'escrow-admin-nickname-session-key',
      nickname: 'Origin User'
    });
    const serialized = JSON.parse(syncResponse.headers['set-cookie'][0]);

    const saveNicknameResponse = await harness.request('POST', '/api/nexa-escrow/profile/nickname', {
      nickname: '苹果'
    }, {
      cookies: {
        [serialized.name]: serialized.value
      }
    });
    assert.equal(saveNicknameResponse.statusCode, 200);

    const adminCookies = await loginAdmin(harness);
    const usersResponse = await harness.request('GET', '/api/admin/nexa-escrow-users', undefined, {
      cookies: adminCookies
    });
    assert.equal(usersResponse.statusCode, 200);
    assert.equal(usersResponse.body.ok, true);
    const targetUser = usersResponse.body.items.find((item) => item.openId === 'escrow-admin-nickname-open-id');
    assert.ok(targetUser);
    assert.equal(targetUser.escrowNickname, '苹果');
  } finally {
    harness.cleanup();
  }
});

test('nexa-escrow bootstrap returns synced account state and empty orders for a new user', async () => {
  const harness = createHarness();

  try {
    const syncResponse = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-open-id-bootstrap',
      sessionKey: 'escrow-session-key-bootstrap',
      nickname: 'Bootstrap Escrow'
    });
    const serialized = JSON.parse(syncResponse.headers['set-cookie'][0]);

    const response = await harness.request('GET', '/api/nexa-escrow/bootstrap', null, {
      cookies: {
        [serialized.name]: serialized.value
      }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.account.openId, 'escrow-open-id-bootstrap');
    assert.match(response.body.account.escrowCode, /^n\d{6}$/);
    assert.deepEqual(response.body.settings, {
      minAmount: '1.00',
      maxAmount: '100000.00',
      feePermille: '0'
    });
    assert.equal(Array.isArray(response.body.orders), true);
    assert.equal(response.body.orders.length, 0);
  } finally {
    harness.cleanup();
  }
});

test('admin escrow settings update bootstrap config and enforce dynamic min amount', async () => {
  const harness = createHarness();

  try {
    const adminCookies = await loginAdmin(harness);
    const updateResponse = await harness.request('PUT', '/api/admin/site-config', {
      title: 'claw800.com',
      subtitleZh: '龙虾学习导航网，为你的龙虾赋能。',
      subtitleEn: 'OpenClaw ecosystem directory for AI websites',
      htmlTitleZh: '',
      htmlTitleEn: '',
      skillsPageTitleZh: 'Claw800 龙虾技能大全',
      skillsPageTitleEn: 'Claw800 Skills Directory',
      skillsPageSubtitleZh: '同步 claw800.com 的 OpenClaw 精选技能目录，分类浏览，一键查看和复制安装提示词。',
      skillsPageSubtitleEn: 'Synced from claw800.com. Browse curated OpenClaw skills by category and copy install prompts in one click.',
      skillsPageBotLabelZh: '',
      skillsPageBotLabelEn: '',
      skillsPageBotPromptZh: '',
      skillsPageBotPromptEn: '',
      skillsPageInstallPromptZh: '',
      skillsPageInstallPromptEn: '',
      icon: '',
      logo: '',
      footerCopyrightZh: '',
      footerCopyrightEn: '',
      footerLinksRaw: '',
      footerContactZh: '',
      footerContactEn: '',
      nexaApiKey: '',
      nexaEscrowMinAmount: '5.00',
      nexaEscrowMaxAmount: '9999.99',
      nexaEscrowFeePermille: '2',
      nexaAppSecret: '',
      keepNexaAppSecret: true
    }, {
      cookies: adminCookies
    });
    assert.equal(updateResponse.statusCode, 200);
    assert.equal(updateResponse.body.ok, true);

    const sellerSync = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-settings-seller-open-id',
      sessionKey: 'escrow-settings-seller-session-key',
      nickname: 'Settings Seller'
    });
    const sellerCookie = JSON.parse(sellerSync.headers['set-cookie'][0]);
    const sellerBootstrap = await harness.request('GET', '/api/nexa-escrow/bootstrap', null, {
      cookies: { [sellerCookie.name]: sellerCookie.value }
    });
    assert.deepEqual(sellerBootstrap.body.settings, {
      minAmount: '5.00',
      maxAmount: '9999.99',
      feePermille: '2'
    });

    const buyerSync = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-settings-buyer-open-id',
      sessionKey: 'escrow-settings-buyer-session-key',
      nickname: 'Settings Buyer'
    });
    const buyerCookie = JSON.parse(buyerSync.headers['set-cookie'][0]);
    const createResponse = await harness.request('POST', '/api/nexa-escrow/orders', {
      creatorRole: 'buyer',
      amount: '4.99',
      counterpartyEscrowCode: sellerBootstrap.body.account.escrowCode,
      description: '后台设置校验'
    }, {
      cookies: { [buyerCookie.name]: buyerCookie.value }
    });

    assert.equal(createResponse.statusCode, 400);
    assert.equal(createResponse.body.ok, false);
    assert.equal(createResponse.body.error, 'AMOUNT_TOO_LOW');
  } finally {
    harness.cleanup();
  }
});

test('nexa-escrow order creation rejects amounts with more than two decimal places', async () => {
  const harness = createHarness();

  try {
    const buyerSync = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-amount-buyer-open-id',
      sessionKey: 'escrow-amount-buyer-session-key',
      nickname: 'Amount Buyer'
    });
    const buyerCookie = JSON.parse(buyerSync.headers['set-cookie'][0]);
    const sellerSync = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-amount-seller-open-id',
      sessionKey: 'escrow-amount-seller-session-key',
      nickname: 'Amount Seller'
    });
    const sellerCookie = JSON.parse(sellerSync.headers['set-cookie'][0]);
    const sellerBootstrap = await harness.request('GET', '/api/nexa-escrow/bootstrap', null, {
      cookies: { [sellerCookie.name]: sellerCookie.value }
    });

    const createResponse = await harness.request('POST', '/api/nexa-escrow/orders', {
      creatorRole: 'buyer',
      amount: '12.345',
      counterpartyEscrowCode: sellerBootstrap.body.account.escrowCode,
      description: '金额精度测试'
    }, {
      cookies: { [buyerCookie.name]: buyerCookie.value }
    });

    assert.equal(createResponse.statusCode, 400);
    assert.equal(createResponse.body.ok, false);
    assert.equal(createResponse.body.error, 'INVALID_AMOUNT');
  } finally {
    harness.cleanup();
  }
});

test('nexa-escrow order creation rejects amounts above 100000 USDT', async () => {
  const harness = createHarness();

  try {
    const buyerSync = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-max-buyer-open-id',
      sessionKey: 'escrow-max-buyer-session-key',
      nickname: 'Max Buyer'
    });
    const buyerCookie = JSON.parse(buyerSync.headers['set-cookie'][0]);

    const sellerSync = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-max-seller-open-id',
      sessionKey: 'escrow-max-seller-session-key',
      nickname: 'Max Seller'
    });
    const sellerCookie = JSON.parse(sellerSync.headers['set-cookie'][0]);
    const sellerBootstrap = await harness.request('GET', '/api/nexa-escrow/bootstrap', null, {
      cookies: { [sellerCookie.name]: sellerCookie.value }
    });

    const createResponse = await harness.request('POST', '/api/nexa-escrow/orders', {
      creatorRole: 'buyer',
      amount: '100000.01',
      counterpartyEscrowCode: sellerBootstrap.body.account.escrowCode,
      description: '金额上限测试'
    }, {
      cookies: { [buyerCookie.name]: buyerCookie.value }
    });

    assert.equal(createResponse.statusCode, 400);
    assert.equal(createResponse.body.ok, false);
    assert.equal(createResponse.body.error, 'AMOUNT_TOO_HIGH');
  } finally {
    harness.cleanup();
  }
});

test('nexa-escrow bootstrap wallet only reflects the dedicated escrow wallet balance', async () => {
  const harness = createHarness();

  try {
    const syncResponse = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-open-id-wallet-scope',
      sessionKey: 'escrow-session-key-wallet-scope',
      nickname: 'Wallet Scope User'
    });
    const serialized = JSON.parse(syncResponse.headers['set-cookie'][0]);

    await harness.request('GET', '/api/nexa-escrow/bootstrap', null, {
      cookies: {
        [serialized.name]: serialized.value
      }
    });

    const userId = harness.db.prepare('SELECT id FROM game_users WHERE openid = ?').get('escrow-open-id-wallet-scope').id;
    harness.db
      .prepare("INSERT INTO game_wallets (user_id, currency, available_balance, frozen_balance) VALUES (?, 'USDT', '16.86', '0.00')")
      .run(userId);

    const response = await harness.request('GET', '/api/nexa-escrow/bootstrap', null, {
      cookies: {
        [serialized.name]: serialized.value
      }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.account.wallet, '0.00');
  } finally {
    harness.cleanup();
  }
});

test('nexa-escrow nickname can be saved once and is returned in bootstrap and orders', async () => {
  const harness = createHarness();

  try {
    const buyerSync = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-nickname-buyer-open-id',
      sessionKey: 'escrow-nickname-buyer-session-key',
      nickname: 'Buyer User'
    });
    const buyerCookie = JSON.parse(buyerSync.headers['set-cookie'][0]);

    const sellerSync = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-nickname-seller-open-id',
      sessionKey: 'escrow-nickname-seller-session-key',
      nickname: 'Seller User'
    });
    const sellerCookie = JSON.parse(sellerSync.headers['set-cookie'][0]);

    const buyerNicknameResponse = await harness.request('POST', '/api/nexa-escrow/profile/nickname', {
      nickname: '苹果'
    }, {
      cookies: { [buyerCookie.name]: buyerCookie.value }
    });
    assert.equal(buyerNicknameResponse.statusCode, 200);
    assert.equal(buyerNicknameResponse.body.ok, true);
    assert.equal(buyerNicknameResponse.body.account.escrowNickname, '苹果');

    const sellerNicknameResponse = await harness.request('POST', '/api/nexa-escrow/profile/nickname', {
      nickname: '香蕉'
    }, {
      cookies: { [sellerCookie.name]: sellerCookie.value }
    });
    assert.equal(sellerNicknameResponse.statusCode, 200);
    assert.equal(sellerNicknameResponse.body.ok, true);
    assert.equal(sellerNicknameResponse.body.account.escrowNickname, '香蕉');

    const buyerNicknameRetry = await harness.request('POST', '/api/nexa-escrow/profile/nickname', {
      nickname: '西瓜'
    }, {
      cookies: { [buyerCookie.name]: buyerCookie.value }
    });
    assert.equal(buyerNicknameRetry.statusCode, 400);
    assert.equal(buyerNicknameRetry.body.ok, false);

    const sellerBootstrap = await harness.request('GET', '/api/nexa-escrow/bootstrap', null, {
      cookies: { [sellerCookie.name]: sellerCookie.value }
    });

    const createResponse = await harness.request('POST', '/api/nexa-escrow/orders', {
      creatorRole: 'buyer',
      amount: '12.88',
      counterpartyEscrowCode: sellerBootstrap.body.account.escrowCode,
      description: '昵称展示测试'
    }, {
      cookies: { [buyerCookie.name]: buyerCookie.value }
    });
    assert.equal(createResponse.statusCode, 200);
    assert.equal(createResponse.body.ok, true);
    assert.equal(createResponse.body.order.buyerEscrowNickname, '苹果');
    assert.equal(createResponse.body.order.sellerEscrowNickname, '香蕉');

    const buyerBootstrap = await harness.request('GET', '/api/nexa-escrow/bootstrap', null, {
      cookies: { [buyerCookie.name]: buyerCookie.value }
    });
    assert.equal(buyerBootstrap.statusCode, 200);
    assert.equal(buyerBootstrap.body.account.escrowNickname, '苹果');
    assert.equal(buyerBootstrap.body.orders[0].buyerEscrowNickname, '苹果');
    assert.equal(buyerBootstrap.body.orders[0].sellerEscrowNickname, '香蕉');
  } finally {
    harness.cleanup();
  }
});

test('nexa-escrow nickname must be unique across users', async () => {
  const harness = createHarness();

  try {
    const firstSync = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-nickname-unique-open-id-1',
      sessionKey: 'escrow-nickname-unique-session-key-1',
      nickname: 'Unique One'
    });
    const firstCookie = JSON.parse(firstSync.headers['set-cookie'][0]);

    const secondSync = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-nickname-unique-open-id-2',
      sessionKey: 'escrow-nickname-unique-session-key-2',
      nickname: 'Unique Two'
    });
    const secondCookie = JSON.parse(secondSync.headers['set-cookie'][0]);

    const firstNicknameResponse = await harness.request('POST', '/api/nexa-escrow/profile/nickname', {
      nickname: '苹果123'
    }, {
      cookies: { [firstCookie.name]: firstCookie.value }
    });
    assert.equal(firstNicknameResponse.statusCode, 200);
    assert.equal(firstNicknameResponse.body.ok, true);

    const secondNicknameResponse = await harness.request('POST', '/api/nexa-escrow/profile/nickname', {
      nickname: '苹果123'
    }, {
      cookies: { [secondCookie.name]: secondCookie.value }
    });
    assert.equal(secondNicknameResponse.statusCode, 400);
    assert.equal(secondNicknameResponse.body.ok, false);
    assert.equal(secondNicknameResponse.body.error, 'ESCROW_NICKNAME_TAKEN');
  } finally {
    harness.cleanup();
  }
});

test('nexa-escrow withdrawals below 100 USDT auto-submit and still appear in admin/user records', async () => {
  const harness = createHarness({
    mockWithdrawResponse(payload) {
      return {
        code: '0',
        message: 'success',
        data: {
          amount: payload.amount,
          currency: payload.currency,
          status: 'PENDING',
          openid: payload.openId,
          createTime: '2026-04-08 10:00:00',
          orderNo: payload.orderNo
        }
      };
    },
    mockWithdrawQueryResponse(payload) {
      return {
        code: '0',
        message: 'success',
        data: {
          amount: '5.00',
          currency: 'USDT',
          status: 'PENDING',
          orderNo: payload.orderNo
        }
      };
    }
  });

  try {
    const syncResponse = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-open-id-withdraw',
      sessionKey: 'escrow-session-key-withdraw',
      nickname: 'Withdraw User'
    });
    const serialized = JSON.parse(syncResponse.headers['set-cookie'][0]);

    await harness.request('GET', '/api/nexa-escrow/bootstrap', null, {
      cookies: {
        [serialized.name]: serialized.value
      }
    });
    const userId = harness.db.prepare('SELECT id FROM game_users WHERE openid = ?').get('escrow-open-id-withdraw').id;
    harness.db.prepare("UPDATE nexa_escrow_wallets SET available_balance = '200.00' WHERE user_id = ?").run(userId);

    const createResponse = await harness.request('POST', '/api/nexa-escrow/withdraw/create', {
      amount: '5.00'
    }, {
      cookies: {
        [serialized.name]: serialized.value
      }
    });

    assert.equal(createResponse.statusCode, 200);
    assert.equal(createResponse.body.ok, true);
    assert.equal(createResponse.body.status, 'pending');
    assert.equal(createResponse.body.amount, '5.00');

    const walletAfterCreate = harness.db.prepare('SELECT available_balance FROM nexa_escrow_wallets WHERE user_id = ?').get(userId);
    assert.equal(String(walletAfterCreate.available_balance), '195.00');

    const queryResponse = await harness.request('POST', '/api/nexa-escrow/withdraw/query', {
      partnerOrderNo: createResponse.body.partnerOrderNo
    }, {
      cookies: {
        [serialized.name]: serialized.value
      }
    });

    assert.equal(queryResponse.statusCode, 200);
    assert.equal(queryResponse.body.ok, true);
    assert.equal(String(queryResponse.body.item.status || '').toLowerCase(), 'pending');

    const bootstrapAfterCreate = await harness.request('GET', '/api/nexa-escrow/bootstrap', null, {
      cookies: {
        [serialized.name]: serialized.value
      }
    });
    assert.equal(bootstrapAfterCreate.statusCode, 200);
    assert.equal(bootstrapAfterCreate.body.ok, true);
    assert.equal(bootstrapAfterCreate.body.account.latestWithdrawal.partnerOrderNo, createResponse.body.partnerOrderNo);
    assert.equal(String(bootstrapAfterCreate.body.account.latestWithdrawal.status || '').toLowerCase(), 'pending');
    assert.ok(Array.isArray(bootstrapAfterCreate.body.account.withdrawals));
    assert.equal(bootstrapAfterCreate.body.account.withdrawals[0].partnerOrderNo, createResponse.body.partnerOrderNo);

    const adminCookies = await loginAdmin(harness);
    const adminListResponse = await harness.request('GET', '/api/admin/nexa-escrow-withdrawals', undefined, {
      cookies: adminCookies
    });
    assert.equal(adminListResponse.statusCode, 200);
    assert.equal(adminListResponse.body.ok, true);
    const createdItem = adminListResponse.body.items.find((item) => item.partnerOrderNo === createResponse.body.partnerOrderNo);
    assert.ok(createdItem);
    assert.equal(String(createdItem.status || '').toLowerCase(), 'pending');
  } finally {
    harness.cleanup();
  }
});

test('fresh nexa-escrow auto-withdrawals keep pending status during early failed-query grace window', async () => {
  const harness = createHarness({
    mockWithdrawResponse(payload) {
      return {
        code: '0',
        message: 'success',
        data: {
          amount: payload.amount,
          currency: payload.currency,
          status: 'PENDING',
          openid: payload.openId,
          createTime: '2026-04-08 10:00:00',
          orderNo: payload.orderNo
        }
      };
    },
    mockWithdrawQueryResponse(payload) {
      return {
        code: '0',
        message: 'success',
        data: {
          amount: '1.00',
          currency: 'USDT',
          status: 'FAILED',
          orderNo: payload.orderNo
        }
      };
    }
  });

  try {
    const syncResponse = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-open-id-withdraw-grace',
      sessionKey: 'escrow-session-key-withdraw-grace',
      nickname: 'Withdraw Grace User'
    });
    const serialized = JSON.parse(syncResponse.headers['set-cookie'][0]);

    await harness.request('GET', '/api/nexa-escrow/bootstrap', null, {
      cookies: {
        [serialized.name]: serialized.value
      }
    });
    const userId = harness.db.prepare('SELECT id FROM game_users WHERE openid = ?').get('escrow-open-id-withdraw-grace').id;
    harness.db.prepare("UPDATE nexa_escrow_wallets SET available_balance = '20.00' WHERE user_id = ?").run(userId);

    const createResponse = await harness.request('POST', '/api/nexa-escrow/withdraw/create', {
      amount: '1.00'
    }, {
      cookies: {
        [serialized.name]: serialized.value
      }
    });

    assert.equal(createResponse.statusCode, 200);
    assert.equal(createResponse.body.ok, true);
    assert.equal(createResponse.body.status, 'pending');

    const queryResponse = await harness.request('POST', '/api/nexa-escrow/withdraw/query', {
      partnerOrderNo: createResponse.body.partnerOrderNo
    }, {
      cookies: {
        [serialized.name]: serialized.value
      }
    });

    assert.equal(queryResponse.statusCode, 200);
    assert.equal(queryResponse.body.ok, true);
    assert.equal(String(queryResponse.body.item.status || '').toLowerCase(), 'pending');

    const withdrawal = harness.db
      .prepare('SELECT status FROM nexa_escrow_withdrawals WHERE partner_order_no = ?')
      .get(createResponse.body.partnerOrderNo);
    assert.equal(String(withdrawal.status || '').toLowerCase(), 'pending');

    const wallet = harness.db.prepare('SELECT available_balance FROM nexa_escrow_wallets WHERE user_id = ?').get(userId);
    assert.equal(String(wallet.available_balance), '19.00');
  } finally {
    harness.cleanup();
  }
});

test('stale pending nexa-escrow auto-withdrawals fail after 5 minutes and refund wallet balance', async () => {
  const harness = createHarness({
    mockWithdrawResponse(payload) {
      return {
        code: '0',
        message: 'success',
        data: {
          amount: payload.amount,
          currency: payload.currency,
          status: 'PENDING',
          openid: payload.openId,
          createTime: '2026-04-08 10:00:00',
          orderNo: payload.orderNo
        }
      };
    },
    mockWithdrawQueryResponse(payload) {
      return {
        code: '0',
        message: 'success',
        data: {
          amount: '1.00',
          currency: 'USDT',
          status: 'PENDING',
          orderNo: payload.orderNo
        }
      };
    }
  });

  try {
    const syncResponse = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-open-id-withdraw-timeout',
      sessionKey: 'escrow-session-key-withdraw-timeout',
      nickname: 'Withdraw Timeout User'
    });
    const serialized = JSON.parse(syncResponse.headers['set-cookie'][0]);

    await harness.request('GET', '/api/nexa-escrow/bootstrap', null, {
      cookies: {
        [serialized.name]: serialized.value
      }
    });
    const userId = harness.db.prepare('SELECT id FROM game_users WHERE openid = ?').get('escrow-open-id-withdraw-timeout').id;
    harness.db.prepare("UPDATE nexa_escrow_wallets SET available_balance = '20.00' WHERE user_id = ?").run(userId);

    const createResponse = await harness.request('POST', '/api/nexa-escrow/withdraw/create', {
      amount: '1.00'
    }, {
      cookies: {
        [serialized.name]: serialized.value
      }
    });

    assert.equal(createResponse.statusCode, 200);
    assert.equal(createResponse.body.ok, true);
    assert.equal(createResponse.body.status, 'pending');

    harness.db.prepare(`
      UPDATE nexa_escrow_withdrawals
      SET created_at = datetime('now', '-6 minutes')
      WHERE partner_order_no = ?
    `).run(createResponse.body.partnerOrderNo);

    const queryResponse = await harness.request('POST', '/api/nexa-escrow/withdraw/query', {
      partnerOrderNo: createResponse.body.partnerOrderNo
    }, {
      cookies: {
        [serialized.name]: serialized.value
      }
    });

    assert.equal(queryResponse.statusCode, 200);
    assert.equal(queryResponse.body.ok, true);
    assert.equal(String(queryResponse.body.item.status || '').toLowerCase(), 'failed');

    const withdrawal = harness.db
      .prepare('SELECT status, notify_payload FROM nexa_escrow_withdrawals WHERE partner_order_no = ?')
      .get(createResponse.body.partnerOrderNo);
    assert.equal(String(withdrawal.status || '').toLowerCase(), 'failed');
    assert.match(String(withdrawal.notify_payload || ''), /超时未到账自动退款/);

    const wallet = harness.db.prepare('SELECT available_balance FROM nexa_escrow_wallets WHERE user_id = ?').get(userId);
    assert.equal(String(wallet.available_balance), '20.00');

    const bootstrapAfterTimeout = await harness.request('GET', '/api/nexa-escrow/bootstrap', null, {
      cookies: {
        [serialized.name]: serialized.value
      }
    });
    assert.equal(bootstrapAfterTimeout.statusCode, 200);
    assert.equal(String(bootstrapAfterTimeout.body.account.latestWithdrawal.status || '').toLowerCase(), 'failed');

    const adminCookies = await loginAdmin(harness);
    const adminListResponse = await harness.request('GET', '/api/admin/nexa-escrow-withdrawals', undefined, {
      cookies: adminCookies
    });
    assert.equal(adminListResponse.statusCode, 200);
    const timeoutItem = adminListResponse.body.items.find((item) => item.partnerOrderNo === createResponse.body.partnerOrderNo);
    assert.ok(timeoutItem);
    assert.equal(String(timeoutItem.status || '').toLowerCase(), 'failed');
    assert.equal(timeoutItem.failureReason, 'ESCROW_WITHDRAW_TIMEOUT: 超时未到账自动退款');
  } finally {
    harness.cleanup();
  }
});

test('admin escrow withdrawal list exposes real failure reasons from notify payload', async () => {
  const harness = createHarness();

  try {
    const syncResponse = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-open-id-withdraw-failure-reason',
      sessionKey: 'escrow-session-key-withdraw-failure-reason',
      nickname: 'Withdraw Failure Reason User'
    });
    const serialized = JSON.parse(syncResponse.headers['set-cookie'][0]);
    await harness.request('GET', '/api/nexa-escrow/bootstrap', null, {
      cookies: {
        [serialized.name]: serialized.value
      }
    });

    const userId = harness.db
      .prepare('SELECT id FROM game_users WHERE openid = ?')
      .get('escrow-open-id-withdraw-failure-reason').id;

    harness.db.prepare(`
      INSERT INTO nexa_escrow_withdrawals
        (partner_order_no, user_id, amount, currency, status, notify_payload, created_at, finished_at)
      VALUES
        (?, ?, '1.00', 'USDT', 'failed', ?, datetime('now'), datetime('now'))
    `).run(
      'escrow-withdraw-failed-001',
      userId,
      JSON.stringify({ code: '10000002', message: 'Signature error' })
    );

    const adminCookies = await loginAdmin(harness);
    const adminListResponse = await harness.request('GET', '/api/admin/nexa-escrow-withdrawals', undefined, {
      cookies: adminCookies
    });

    assert.equal(adminListResponse.statusCode, 200);
    assert.equal(adminListResponse.body.ok, true);
    const failedItem = adminListResponse.body.items.find((item) => item.partnerOrderNo === 'escrow-withdraw-failed-001');
    assert.ok(failedItem);
    assert.equal(String(failedItem.status || '').toLowerCase(), 'failed');
    assert.equal(failedItem.failureReason, '10000002: Signature error');
  } finally {
    harness.cleanup();
  }
});

test('admin can review nexa escrow withdrawals after users submit them', async () => {
  const harness = createHarness({
    mockWithdrawResponse(payload) {
      return {
        code: '0',
        message: 'success',
        data: {
          amount: payload.amount,
          currency: payload.currency,
          status: 'PENDING',
          openid: payload.openId,
          createTime: '2026-04-08 11:00:00',
          orderNo: payload.orderNo
        }
      };
    },
    mockWithdrawQueryResponse(payload) {
      return {
        code: '0',
        message: 'success',
        data: {
          amount: '106.50',
          currency: 'USDT',
          status: 'SUCCESS',
          orderNo: payload.orderNo
        }
      };
    }
  });

  try {
    const syncResponse = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-open-id-admin-withdraw-review',
      sessionKey: 'escrow-session-key-admin-withdraw-review',
      nickname: 'Escrow Withdraw Review'
    });
    const serialized = JSON.parse(syncResponse.headers['set-cookie'][0]);
    await harness.request('GET', '/api/nexa-escrow/bootstrap', null, {
      cookies: {
        [serialized.name]: serialized.value
      }
    });

    const userId = harness.db.prepare('SELECT id FROM game_users WHERE openid = ?').get('escrow-open-id-admin-withdraw-review').id;
    harness.db.prepare("UPDATE nexa_escrow_wallets SET available_balance = '200.00' WHERE user_id = ?").run(userId);

    const createResponse = await harness.request('POST', '/api/nexa-escrow/withdraw/create', {
      amount: '106.50'
    }, {
      cookies: {
        [serialized.name]: serialized.value
      }
    });
    assert.equal(createResponse.statusCode, 200);
    assert.equal(createResponse.body.status, 'review_pending');

    const adminCookies = await loginAdmin(harness);
    const listResponse = await harness.request('GET', '/api/admin/nexa-escrow-withdrawals?status=review_pending', undefined, {
      cookies: adminCookies
    });
    assert.equal(listResponse.statusCode, 200);
    assert.equal(listResponse.body.ok, true);
    assert.equal(listResponse.body.items.length, 1);
    assert.equal(listResponse.body.items[0].status, 'review_pending');

    const approveResponse = await harness.request(
      'POST',
      `/api/admin/nexa-escrow-withdrawals/${encodeURIComponent(createResponse.body.partnerOrderNo)}/approve`,
      { note: '人工审核通过' },
      {
        cookies: adminCookies
      }
    );
    assert.equal(approveResponse.statusCode, 200);
    assert.deepEqual(approveResponse.body, { ok: true, status: 'pending' });

    const withdrawal = harness.db
      .prepare('SELECT status, review_note, reviewed_by, finished_at FROM nexa_escrow_withdrawals WHERE partner_order_no = ?')
      .get(createResponse.body.partnerOrderNo);
    assert.equal(withdrawal.status, 'pending');
    assert.equal(withdrawal.review_note, '人工审核通过');
    assert.equal(withdrawal.reviewed_by, 'admin');
    assert.equal(String(withdrawal.finished_at || ''), '');

    const queryResponse = await harness.request('POST', '/api/nexa-escrow/withdraw/query', {
      partnerOrderNo: createResponse.body.partnerOrderNo
    }, {
      cookies: {
        [serialized.name]: serialized.value
      }
    });
    assert.equal(queryResponse.statusCode, 200);
    assert.equal(queryResponse.body.ok, true);
    assert.equal(String(queryResponse.body.item.status || '').toLowerCase(), 'success');

    const listAfterApproveResponse = await harness.request('GET', '/api/admin/nexa-escrow-withdrawals', undefined, {
      cookies: adminCookies
    });
    assert.equal(listAfterApproveResponse.statusCode, 200);
    assert.equal(listAfterApproveResponse.body.ok, true);
    const approvedItem = listAfterApproveResponse.body.items.find((item) => item.partnerOrderNo === createResponse.body.partnerOrderNo);
    assert.ok(approvedItem);
    assert.equal(String(approvedItem.status || '').toLowerCase(), 'success');

    const bootstrapAfterApprove = await harness.request('GET', '/api/nexa-escrow/bootstrap', null, {
      cookies: {
        [serialized.name]: serialized.value
      }
    });
    assert.equal(bootstrapAfterApprove.statusCode, 200);
    assert.equal(String(bootstrapAfterApprove.body.account.withdrawals[0].status || '').toLowerCase(), 'success');
  } finally {
    harness.cleanup();
  }
});

test('nexa-escrow buyer can create an order and seller sees it automatically by escrow code', async () => {
  const harness = createHarness();

  try {
    const buyerSync = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-buyer-open-id',
      sessionKey: 'escrow-buyer-session-key',
      nickname: 'Buyer User'
    });
    const buyerCookie = JSON.parse(buyerSync.headers['set-cookie'][0]);

    const sellerSync = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-seller-open-id',
      sessionKey: 'escrow-seller-session-key',
      nickname: 'Seller User'
    });
    const sellerCookie = JSON.parse(sellerSync.headers['set-cookie'][0]);
    const sellerBootstrap = await harness.request('GET', '/api/nexa-escrow/bootstrap', null, {
      cookies: {
        [sellerCookie.name]: sellerCookie.value
      }
    });
    const sellerEscrowCode = sellerBootstrap.body.account.escrowCode;

    const createResponse = await harness.request('POST', '/api/nexa-escrow/orders', {
      creatorRole: 'buyer',
      amount: '18.88',
      counterpartyEscrowCode: sellerEscrowCode,
      description: '购买主机担保'
    }, {
      cookies: {
        [buyerCookie.name]: buyerCookie.value
      }
    });

    assert.equal(createResponse.statusCode, 200);
    assert.equal(createResponse.body.order.status, 'AWAITING_PAYMENT');
    assert.equal(createResponse.body.order.sellerEscrowCode, sellerEscrowCode);

    const sellerOrdersResponse = await harness.request('GET', '/api/nexa-escrow/bootstrap', null, {
      cookies: {
        [sellerCookie.name]: sellerCookie.value
      }
    });

    assert.equal(sellerOrdersResponse.statusCode, 200);
    assert.equal(sellerOrdersResponse.body.ok, true);
    assert.equal(sellerOrdersResponse.body.orders.length, 1);
    assert.equal(sellerOrdersResponse.body.orders[0].status, 'AWAITING_PAYMENT');
    assert.equal(sellerOrdersResponse.body.orders[0].sellerOpenId, 'escrow-seller-open-id');
    assert.equal(sellerOrdersResponse.body.orders[0].sellerEscrowCode, sellerEscrowCode);
  } finally {
    harness.cleanup();
  }
});

test('nexa-escrow accepts uppercase counterparty escrow codes and rejects unknown escrow codes', async () => {
  const harness = createHarness();

  try {
    const buyerSync = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-buyer-open-id-case',
      sessionKey: 'escrow-buyer-session-key-case',
      nickname: 'Buyer User'
    });
    const buyerCookie = JSON.parse(buyerSync.headers['set-cookie'][0]);

    const sellerSync = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-seller-open-id-case',
      sessionKey: 'escrow-seller-session-key-case',
      nickname: 'Seller User'
    });
    const sellerCookie = JSON.parse(sellerSync.headers['set-cookie'][0]);
    const sellerBootstrap = await harness.request('GET', '/api/nexa-escrow/bootstrap', null, {
      cookies: {
        [sellerCookie.name]: sellerCookie.value
      }
    });
    const sellerEscrowCode = sellerBootstrap.body.account.escrowCode;

    const uppercaseCreate = await harness.request('POST', '/api/nexa-escrow/orders', {
      creatorRole: 'buyer',
      amount: '10.00',
      counterpartyEscrowCode: sellerEscrowCode.toUpperCase(),
      description: '大小写兼容测试'
    }, {
      cookies: {
        [buyerCookie.name]: buyerCookie.value
      }
    });

    assert.equal(uppercaseCreate.statusCode, 200);
    assert.equal(uppercaseCreate.body.order.sellerEscrowCode, sellerEscrowCode);

    const invalidCreate = await harness.request('POST', '/api/nexa-escrow/orders', {
      creatorRole: 'buyer',
      amount: '10.00',
      counterpartyEscrowCode: 'n999999',
      description: '无效担保号测试'
    }, {
      cookies: {
        [buyerCookie.name]: buyerCookie.value
      }
    });

    assert.equal(invalidCreate.statusCode, 400);
    assert.equal(invalidCreate.body.ok, false);
    assert.equal(invalidCreate.body.error, 'INVALID_COUNTERPARTY_ESCROW_CODE');
  } finally {
    harness.cleanup();
  }
});

test('nexa-escrow rejects descriptions longer than 30 characters', async () => {
  const harness = createHarness();

  try {
    const buyerSync = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-buyer-open-id-long-desc',
      sessionKey: 'escrow-buyer-session-key-long-desc',
      nickname: 'Buyer User'
    });
    const buyerCookie = JSON.parse(buyerSync.headers['set-cookie'][0]);

    const sellerSync = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-seller-open-id-long-desc',
      sessionKey: 'escrow-seller-session-key-long-desc',
      nickname: 'Seller User'
    });
    const sellerCookie = JSON.parse(sellerSync.headers['set-cookie'][0]);
    const sellerBootstrap = await harness.request('GET', '/api/nexa-escrow/bootstrap', null, {
      cookies: {
        [sellerCookie.name]: sellerCookie.value
      }
    });

    const invalidCreate = await harness.request('POST', '/api/nexa-escrow/orders', {
      creatorRole: 'buyer',
      amount: '10.00',
      counterpartyEscrowCode: sellerBootstrap.body.account.escrowCode,
      description: '这是一个超过三十个字的担保交易描述测试内容请拒绝创建订单并返回超长错误提示'
    }, {
      cookies: {
        [buyerCookie.name]: buyerCookie.value
      }
    });

    assert.equal(invalidCreate.statusCode, 400);
    assert.equal(invalidCreate.body.ok, false);
    assert.equal(invalidCreate.body.error, 'DESCRIPTION_TOO_LONG');
  } finally {
    harness.cleanup();
  }
});

test('nexa-escrow seller-created order lets the buyer see and pay from order detail flow', async () => {
  const harness = createHarness({
    mockPaymentResponse() {
      return {
        code: '0',
        message: 'success',
        data: {
          orderNo: 'escrow-order-no-seller-create',
          timestamp: '1711111111',
          nonce: 'nonce-escrow-seller-create',
          signType: 'MD5',
          paySign: 'pay-sign-escrow-seller-create',
          apiKey: 'test-nexa-api-key'
        }
      };
    }
  });

  try {
    const buyerSync = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-buyer-open-id-3',
      sessionKey: 'escrow-buyer-session-key-3',
      nickname: 'Buyer User'
    });
    const buyerCookie = JSON.parse(buyerSync.headers['set-cookie'][0]);

    const sellerSync = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-seller-open-id-3',
      sessionKey: 'escrow-seller-session-key-3',
      nickname: 'Seller User'
    });
    const sellerCookie = JSON.parse(sellerSync.headers['set-cookie'][0]);

    const buyerBootstrap = await harness.request('GET', '/api/nexa-escrow/bootstrap', null, {
      cookies: { [buyerCookie.name]: buyerCookie.value }
    });

    const sellerCreate = await harness.request('POST', '/api/nexa-escrow/orders', {
      creatorRole: 'seller',
      amount: '66.00',
      counterpartyEscrowCode: buyerBootstrap.body.account.escrowCode,
      description: '卖家发起担保测试'
    }, {
      cookies: { [sellerCookie.name]: sellerCookie.value }
    });

    assert.equal(sellerCreate.statusCode, 200);
    assert.equal(sellerCreate.body.order.status, 'AWAITING_PAYMENT');

    const tradeCode = sellerCreate.body.order.tradeCode;
    const buyerOrdersResponse = await harness.request('GET', '/api/nexa-escrow/bootstrap', null, {
      cookies: { [buyerCookie.name]: buyerCookie.value }
    });
    const buyerOrder = buyerOrdersResponse.body.orders.find((item) => item.tradeCode === tradeCode);

    assert.ok(buyerOrder);
    assert.equal(buyerOrder.status, 'AWAITING_PAYMENT');
    assert.match(String(buyerOrder.paymentDueAt || ''), /^\d{4}-\d{2}-\d{2} /);
    assert.equal(buyerOrder.viewerRole, 'buyer');
    assert.deepEqual(buyerOrder.availableActions, ['fund']);

    const paymentCreate = await harness.request('POST', '/api/nexa-escrow/payment/create', {
      tradeCode
    }, {
      cookies: { [buyerCookie.name]: buyerCookie.value }
    });

    assert.equal(paymentCreate.statusCode, 200);
    assert.equal(paymentCreate.body.ok, true);
    assert.equal(paymentCreate.body.orderNo, 'escrow-order-no-seller-create');
    assert.equal(paymentCreate.body.tradeCode, tradeCode);
    assert.equal(paymentCreate.body.payment.orderNo, 'escrow-order-no-seller-create');

    const buyerPendingBootstrap = await harness.request('GET', '/api/nexa-escrow/bootstrap', null, {
      cookies: { [buyerCookie.name]: buyerCookie.value }
    });
    const sellerPendingBootstrap = await harness.request('GET', '/api/nexa-escrow/bootstrap', null, {
      cookies: { [sellerCookie.name]: sellerCookie.value }
    });
    const buyerPendingOrder = buyerPendingBootstrap.body.orders.find((item) => item.tradeCode === tradeCode);
    const sellerPendingOrder = sellerPendingBootstrap.body.orders.find((item) => item.tradeCode === tradeCode);

    assert.equal(buyerPendingOrder.status, 'PAYMENT_PENDING');
    assert.deepEqual(buyerPendingOrder.availableActions, ['fund']);
    assert.equal(sellerPendingOrder.status, 'PAYMENT_PENDING');
    assert.deepEqual(sellerPendingOrder.availableActions, ['cancel']);
  } finally {
    harness.cleanup();
  }
});

test('nexa-escrow unpaid orders auto cancel after the 2-hour payment timeout', async () => {
  const harness = createHarness();

  try {
    const buyerSync = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-buyer-open-id-timeout',
      sessionKey: 'escrow-buyer-session-key-timeout',
      nickname: 'Timeout Buyer'
    });
    const buyerCookie = JSON.parse(buyerSync.headers['set-cookie'][0]);

    const sellerSync = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-seller-open-id-timeout',
      sessionKey: 'escrow-seller-session-key-timeout',
      nickname: 'Timeout Seller'
    });
    const sellerCookie = JSON.parse(sellerSync.headers['set-cookie'][0]);

    const buyerBootstrap = await harness.request('GET', '/api/nexa-escrow/bootstrap', null, {
      cookies: { [buyerCookie.name]: buyerCookie.value }
    });

    const sellerCreate = await harness.request('POST', '/api/nexa-escrow/orders', {
      creatorRole: 'seller',
      amount: '8.00',
      counterpartyEscrowCode: buyerBootstrap.body.account.escrowCode,
      description: '超时取消测试'
    }, {
      cookies: { [sellerCookie.name]: sellerCookie.value }
    });

    const tradeCode = sellerCreate.body.order.tradeCode;
    harness.db.prepare("UPDATE nexa_escrow_orders SET payment_due_at = '2026-01-01 00:00:00' WHERE trade_code = ?").run(tradeCode);

    const buyerOrdersResponse = await harness.request('GET', '/api/nexa-escrow/bootstrap', null, {
      cookies: { [buyerCookie.name]: buyerCookie.value }
    });
    const expiredOrder = buyerOrdersResponse.body.orders.find((item) => item.tradeCode === tradeCode);

    assert.ok(expiredOrder);
    assert.equal(expiredOrder.status, 'CANCELLED');
  } finally {
    harness.cleanup();
  }
});

test('nexa-escrow funded flow supports payment, seller delivery, and buyer release', async () => {
  const harness = createHarness({
    mockPaymentResponse(payload) {
      if (payload.orderNo) {
        return {
          code: '0',
          message: 'success',
          data: {
            orderNo: 'escrow-order-no-1',
            timestamp: '1711111111',
            nonce: 'nonce-escrow',
            signType: 'MD5',
            paySign: 'pay-sign-escrow',
            apiKey: 'test-nexa-api-key'
          }
        };
      }
      return {
        code: '0',
        message: 'success',
        data: {
          orderNo: 'escrow-order-no-1',
          timestamp: '1711111111',
          nonce: 'nonce-escrow',
          signType: 'MD5',
          paySign: 'pay-sign-escrow',
          apiKey: 'test-nexa-api-key'
        }
      };
    },
    mockQueryResponse() {
      return {
        code: '0',
        message: 'success',
        data: {
          orderNo: 'escrow-order-no-1',
          status: 'SUCCESS',
          amount: '18.88',
          currency: 'USDT',
          paidTime: '2026-04-07 10:00:00'
        }
      };
    }
  });

  try {
    const buyerSync = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-buyer-open-id-2',
      sessionKey: 'escrow-buyer-session-key-2',
      nickname: 'Buyer User'
    });
    const buyerCookie = JSON.parse(buyerSync.headers['set-cookie'][0]);

    const sellerSync = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-seller-open-id-2',
      sessionKey: 'escrow-seller-session-key-2',
      nickname: 'Seller User'
    });
    const sellerCookie = JSON.parse(sellerSync.headers['set-cookie'][0]);

    const sellerBootstrap = await harness.request('GET', '/api/nexa-escrow/bootstrap', null, {
      cookies: {
        [sellerCookie.name]: sellerCookie.value
      }
    });

    const createResponse = await harness.request('POST', '/api/nexa-escrow/orders', {
      creatorRole: 'buyer',
      amount: '18.88',
      counterpartyEscrowCode: sellerBootstrap.body.account.escrowCode,
      description: '购买设计稿担保'
    }, {
      cookies: {
        [buyerCookie.name]: buyerCookie.value
      }
    });

    const tradeCode = createResponse.body.order.tradeCode;

    const paymentCreate = await harness.request('POST', '/api/nexa-escrow/payment/create', {
      tradeCode
    }, {
      cookies: {
        [buyerCookie.name]: buyerCookie.value
      }
    });

    assert.equal(paymentCreate.statusCode, 200);
    assert.equal(paymentCreate.body.ok, true);
    assert.equal(paymentCreate.body.orderNo, 'escrow-order-no-1');
    assert.equal(paymentCreate.body.payment.orderNo, 'escrow-order-no-1');

    const paymentQuery = await harness.request('POST', '/api/nexa-escrow/payment/query', {
      orderNo: 'escrow-order-no-1'
    }, {
      cookies: {
        [buyerCookie.name]: buyerCookie.value
      }
    });

    assert.equal(paymentQuery.statusCode, 200);
    assert.equal(paymentQuery.body.ok, true);
    assert.equal(paymentQuery.body.order.status, 'FUNDED');

    const sellerDeliver = await harness.request('POST', '/api/nexa-escrow/orders/action', {
      tradeCode,
      action: 'mark_delivered'
    }, {
      cookies: {
        [sellerCookie.name]: sellerCookie.value
      }
    });

    assert.equal(sellerDeliver.statusCode, 200);
    assert.equal(sellerDeliver.body.order.status, 'DELIVERED');
    assert.ok(sellerDeliver.body.order.autoReleaseAt);
    assert.ok(sellerDeliver.body.order.deliveredAt);
    const deliveredMs = new Date(String(sellerDeliver.body.order.deliveredAt).replace(' ', 'T') + 'Z').getTime();
    const autoReleaseMs = new Date(String(sellerDeliver.body.order.autoReleaseAt).replace(' ', 'T') + 'Z').getTime();
    assert.equal(
      Math.round((autoReleaseMs - deliveredMs) / (24 * 60 * 60 * 1000)),
      14
    );

    const buyerRelease = await harness.request('POST', '/api/nexa-escrow/orders/action', {
      tradeCode,
      action: 'confirm_receipt'
    }, {
      cookies: {
        [buyerCookie.name]: buyerCookie.value
      }
    });

    assert.equal(buyerRelease.statusCode, 200);
    assert.equal(buyerRelease.body.order.status, 'COMPLETED');

    const wallet = harness.db.prepare(`
      SELECT available_balance
      FROM nexa_escrow_wallets
      JOIN game_users ON game_users.id = nexa_escrow_wallets.user_id
      WHERE game_users.openid = ?
    `).get('escrow-seller-open-id-2');

    assert.equal(String(wallet.available_balance), '18.88');
  } finally {
    harness.cleanup();
  }
});

test('nexa-escrow seller release uses configured fee permille and credits the net amount', async () => {
  const harness = createHarness({
    mockPaymentResponse() {
      return {
        code: '0',
        message: 'success',
        data: {
          orderNo: 'escrow-order-no-fee',
          timestamp: '1711111111',
          nonce: 'nonce-escrow-fee',
          signType: 'MD5',
          paySign: 'pay-sign-escrow-fee',
          apiKey: 'test-nexa-api-key'
        }
      };
    },
    mockQueryResponse() {
      return {
        code: '0',
        message: 'success',
        data: {
          orderNo: 'escrow-order-no-fee',
          status: 'SUCCESS',
          amount: '100.00',
          currency: 'USDT',
          paidTime: '2026-04-07 10:00:00'
        }
      };
    }
  });

  try {
    const adminCookies = await loginAdmin(harness);
    const updateResponse = await harness.request('PUT', '/api/admin/site-config', {
      title: 'claw800.com',
      subtitleZh: '龙虾学习导航网，为你的龙虾赋能。',
      subtitleEn: 'OpenClaw ecosystem directory for AI websites',
      htmlTitleZh: '',
      htmlTitleEn: '',
      skillsPageTitleZh: 'Claw800 龙虾技能大全',
      skillsPageTitleEn: 'Claw800 Skills Directory',
      skillsPageSubtitleZh: '同步 claw800.com 的 OpenClaw 精选技能目录，分类浏览，一键查看和复制安装提示词。',
      skillsPageSubtitleEn: 'Synced from claw800.com. Browse curated OpenClaw skills by category and copy install prompts in one click.',
      skillsPageBotLabelZh: '',
      skillsPageBotLabelEn: '',
      skillsPageBotPromptZh: '',
      skillsPageBotPromptEn: '',
      skillsPageInstallPromptZh: '',
      skillsPageInstallPromptEn: '',
      icon: '',
      logo: '',
      footerCopyrightZh: '',
      footerCopyrightEn: '',
      footerLinksRaw: '',
      footerContactZh: '',
      footerContactEn: '',
      nexaApiKey: '',
      nexaEscrowMinAmount: '1.00',
      nexaEscrowMaxAmount: '100000.00',
      nexaEscrowFeePermille: '2',
      nexaAppSecret: '',
      keepNexaAppSecret: true
    }, {
      cookies: adminCookies
    });
    assert.equal(updateResponse.statusCode, 200);

    const buyerSync = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-fee-buyer-open-id',
      sessionKey: 'escrow-fee-buyer-session-key',
      nickname: 'Fee Buyer'
    });
    const buyerCookie = JSON.parse(buyerSync.headers['set-cookie'][0]);

    const sellerSync = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-fee-seller-open-id',
      sessionKey: 'escrow-fee-seller-session-key',
      nickname: 'Fee Seller'
    });
    const sellerCookie = JSON.parse(sellerSync.headers['set-cookie'][0]);

    const sellerBootstrap = await harness.request('GET', '/api/nexa-escrow/bootstrap', null, {
      cookies: {
        [sellerCookie.name]: sellerCookie.value
      }
    });

    const createResponse = await harness.request('POST', '/api/nexa-escrow/orders', {
      creatorRole: 'buyer',
      amount: '100.00',
      counterpartyEscrowCode: sellerBootstrap.body.account.escrowCode,
      description: '手续费到账测试'
    }, {
      cookies: {
        [buyerCookie.name]: buyerCookie.value
      }
    });

    const tradeCode = createResponse.body.order.tradeCode;

    const paymentCreate = await harness.request('POST', '/api/nexa-escrow/payment/create', {
      tradeCode
    }, {
      cookies: {
        [buyerCookie.name]: buyerCookie.value
      }
    });
    assert.equal(paymentCreate.statusCode, 200);

    const paymentQuery = await harness.request('POST', '/api/nexa-escrow/payment/query', {
      orderNo: 'escrow-order-no-fee'
    }, {
      cookies: {
        [buyerCookie.name]: buyerCookie.value
      }
    });
    assert.equal(paymentQuery.statusCode, 200);
    assert.equal(paymentQuery.body.order.status, 'FUNDED');

    const sellerDeliver = await harness.request('POST', '/api/nexa-escrow/orders/action', {
      tradeCode,
      action: 'mark_delivered'
    }, {
      cookies: {
        [sellerCookie.name]: sellerCookie.value
      }
    });
    assert.equal(sellerDeliver.statusCode, 200);

    const buyerRelease = await harness.request('POST', '/api/nexa-escrow/orders/action', {
      tradeCode,
      action: 'confirm_receipt'
    }, {
      cookies: {
        [buyerCookie.name]: buyerCookie.value
      }
    });
    assert.equal(buyerRelease.statusCode, 200);
    assert.equal(buyerRelease.body.order.status, 'COMPLETED');

    const wallet = harness.db.prepare(`
      SELECT available_balance
      FROM nexa_escrow_wallets
      JOIN game_users ON game_users.id = nexa_escrow_wallets.user_id
      WHERE game_users.openid = ?
    `).get('escrow-fee-seller-open-id');

    assert.equal(String(wallet.available_balance), '99.80');
  } finally {
    harness.cleanup();
  }
});

test('nexa-escrow funded orders auto cancel after seller ship timeout and refund buyer wallet', async () => {
  const harness = createHarness({
    mockPaymentResponse() {
      return {
        code: '0',
        message: 'success',
        data: {
          orderNo: 'escrow-order-no-timeout-ship',
          timestamp: '1711111111',
          nonce: 'nonce-timeout-ship',
          signType: 'MD5',
          paySign: 'pay-sign-timeout-ship',
          apiKey: 'test-nexa-api-key'
        }
      };
    },
    mockQueryResponse() {
      return {
        code: '0',
        message: 'success',
        data: {
          orderNo: 'escrow-order-no-timeout-ship',
          status: 'SUCCESS',
          amount: '18.88',
          currency: 'USDT',
          paidTime: '2026-04-07 10:00:00'
        }
      };
    }
  });

  try {
    const buyerSync = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-buyer-open-id-ship-timeout',
      sessionKey: 'escrow-buyer-session-key-ship-timeout',
      nickname: 'Buyer Ship Timeout'
    });
    const buyerCookie = JSON.parse(buyerSync.headers['set-cookie'][0]);

    const sellerSync = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-seller-open-id-ship-timeout',
      sessionKey: 'escrow-seller-session-key-ship-timeout',
      nickname: 'Seller Ship Timeout'
    });
    const sellerCookie = JSON.parse(sellerSync.headers['set-cookie'][0]);

    const sellerBootstrap = await harness.request('GET', '/api/nexa-escrow/bootstrap', null, {
      cookies: { [sellerCookie.name]: sellerCookie.value }
    });

    const createResponse = await harness.request('POST', '/api/nexa-escrow/orders', {
      creatorRole: 'buyer',
      amount: '18.88',
      counterpartyEscrowCode: sellerBootstrap.body.account.escrowCode,
      description: '发货超时退款测试'
    }, {
      cookies: { [buyerCookie.name]: buyerCookie.value }
    });

    const tradeCode = createResponse.body.order.tradeCode;

    await harness.request('POST', '/api/nexa-escrow/payment/create', {
      tradeCode
    }, {
      cookies: { [buyerCookie.name]: buyerCookie.value }
    });

    await harness.request('POST', '/api/nexa-escrow/payment/query', {
      orderNo: 'escrow-order-no-timeout-ship'
    }, {
      cookies: { [buyerCookie.name]: buyerCookie.value }
    });

    harness.db.prepare("UPDATE nexa_escrow_orders SET ship_due_at = '2026-01-01 00:00:00' WHERE trade_code = ?").run(tradeCode);

    const sellerOrdersResponse = await harness.request('GET', '/api/nexa-escrow/bootstrap', null, {
      cookies: { [sellerCookie.name]: sellerCookie.value }
    });
    const expiredOrder = sellerOrdersResponse.body.orders.find((item) => item.tradeCode === tradeCode);

    assert.ok(expiredOrder);
    assert.equal(expiredOrder.status, 'CANCELLED');

    const wallet = harness.db.prepare(`
      SELECT available_balance
      FROM nexa_escrow_wallets
      JOIN game_users ON game_users.id = nexa_escrow_wallets.user_id
      WHERE game_users.openid = ?
    `).get('escrow-buyer-open-id-ship-timeout');

    assert.equal(String(wallet.available_balance), '18.88');
  } finally {
    harness.cleanup();
  }
});

test('nexa-escrow auto releases to the seller after 14 days without dispute', async () => {
  const harness = createHarness({
    mockPaymentResponse() {
      return {
        code: '0',
        message: 'success',
        data: {
          orderNo: 'escrow-order-no-auto-release',
          timestamp: '1711111111',
          nonce: 'nonce-escrow',
          signType: 'MD5',
          paySign: 'pay-sign-escrow',
          apiKey: 'test-nexa-api-key'
        }
      };
    },
    mockQueryResponse() {
      return {
        code: '0',
        message: 'success',
        data: {
          orderNo: 'escrow-order-no-auto-release',
          status: 'SUCCESS',
          amount: '12.00',
          currency: 'USDT',
          paidTime: '2026-04-07 10:00:00'
        }
      };
    }
  });

  try {
    const buyerSync = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-buyer-open-id-auto',
      sessionKey: 'escrow-buyer-session-key-auto',
      nickname: 'Buyer User'
    });
    const buyerCookie = JSON.parse(buyerSync.headers['set-cookie'][0]);

    const sellerSync = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-seller-open-id-auto',
      sessionKey: 'escrow-seller-session-key-auto',
      nickname: 'Seller User'
    });
    const sellerCookie = JSON.parse(sellerSync.headers['set-cookie'][0]);
    const sellerBootstrap = await harness.request('GET', '/api/nexa-escrow/bootstrap', null, {
      cookies: { [sellerCookie.name]: sellerCookie.value }
    });

    const createResponse = await harness.request('POST', '/api/nexa-escrow/orders', {
      creatorRole: 'buyer',
      amount: '12.00',
      counterpartyEscrowCode: sellerBootstrap.body.account.escrowCode,
      description: '自动放款测试'
    }, {
      cookies: { [buyerCookie.name]: buyerCookie.value }
    });
    const tradeCode = createResponse.body.order.tradeCode;

    await harness.request('POST', '/api/nexa-escrow/payment/create', { tradeCode }, {
      cookies: { [buyerCookie.name]: buyerCookie.value }
    });
    await harness.request('POST', '/api/nexa-escrow/payment/query', { orderNo: 'escrow-order-no-auto-release' }, {
      cookies: { [buyerCookie.name]: buyerCookie.value }
    });
    await harness.request('POST', '/api/nexa-escrow/orders/action', {
      tradeCode,
      action: 'mark_delivered'
    }, {
      cookies: { [sellerCookie.name]: sellerCookie.value }
    });

    harness.db.prepare(
      "UPDATE nexa_escrow_orders SET delivered_at = '2026-03-01 00:00:00', auto_release_at = '2026-03-08 00:00:00' WHERE trade_code = ?"
    ).run(tradeCode);

    const bootstrap = await harness.request('GET', '/api/nexa-escrow/bootstrap', null, {
      cookies: { [buyerCookie.name]: buyerCookie.value }
    });
    const autoReleased = bootstrap.body.orders.find((item) => item.tradeCode === tradeCode);

    assert.equal(autoReleased.status, 'COMPLETED');
    assert.equal(autoReleased.releaseType, 'AUTO');

    const wallet = harness.db.prepare(`
      SELECT available_balance
      FROM nexa_escrow_wallets
      JOIN game_users ON game_users.id = nexa_escrow_wallets.user_id
      WHERE game_users.openid = ?
    `).get('escrow-seller-open-id-auto');
    assert.equal(String(wallet.available_balance), '12.00');
  } finally {
    harness.cleanup();
  }
});

test('nexa-escrow dispute blocks auto release and admin can resolve the order', async () => {
  const harness = createHarness({
    mockPaymentResponse() {
      return {
        code: '0',
        message: 'success',
        data: {
          orderNo: 'escrow-order-no-dispute',
          timestamp: '1711111111',
          nonce: 'nonce-escrow',
          signType: 'MD5',
          paySign: 'pay-sign-escrow',
          apiKey: 'test-nexa-api-key'
        }
      };
    },
    mockQueryResponse() {
      return {
        code: '0',
        message: 'success',
        data: {
          orderNo: 'escrow-order-no-dispute',
          status: 'SUCCESS',
          amount: '30.00',
          currency: 'USDT',
          paidTime: '2026-04-07 10:00:00'
        }
      };
    }
  });

  try {
    const buyerSync = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-buyer-open-id-dispute',
      sessionKey: 'escrow-buyer-session-key-dispute',
      nickname: 'Buyer User'
    });
    const buyerCookie = JSON.parse(buyerSync.headers['set-cookie'][0]);
    const sellerSync = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-seller-open-id-dispute',
      sessionKey: 'escrow-seller-session-key-dispute',
      nickname: 'Seller User'
    });
    const sellerCookie = JSON.parse(sellerSync.headers['set-cookie'][0]);
    const sellerBootstrap = await harness.request('GET', '/api/nexa-escrow/bootstrap', null, {
      cookies: { [sellerCookie.name]: sellerCookie.value }
    });

    const createResponse = await harness.request('POST', '/api/nexa-escrow/orders', {
      creatorRole: 'buyer',
      amount: '30.00',
      counterpartyEscrowCode: sellerBootstrap.body.account.escrowCode,
      description: '仲裁测试'
    }, {
      cookies: { [buyerCookie.name]: buyerCookie.value }
    });
    const tradeCode = createResponse.body.order.tradeCode;

    await harness.request('POST', '/api/nexa-escrow/payment/create', { tradeCode }, {
      cookies: { [buyerCookie.name]: buyerCookie.value }
    });
    await harness.request('POST', '/api/nexa-escrow/payment/query', { orderNo: 'escrow-order-no-dispute' }, {
      cookies: { [buyerCookie.name]: buyerCookie.value }
    });
    await harness.request('POST', '/api/nexa-escrow/orders/action', {
      tradeCode,
      action: 'mark_delivered'
    }, {
      cookies: { [sellerCookie.name]: sellerCookie.value }
    });
    const disputeResponse = await harness.request('POST', '/api/nexa-escrow/orders/action', {
      tradeCode,
      action: 'dispute'
    }, {
      cookies: { [buyerCookie.name]: buyerCookie.value }
    });

    assert.equal(disputeResponse.statusCode, 200);
    assert.equal(disputeResponse.body.order.status, 'DISPUTED');

    const adminCookies = await loginAdmin(harness);
    const listResponse = await harness.request('GET', '/api/admin/nexa-escrow-orders?status=DISPUTED', undefined, {
      cookies: adminCookies
    });
    assert.equal(listResponse.statusCode, 200);
    assert.equal(listResponse.body.items.length, 1);
    assert.equal(listResponse.body.items[0].tradeCode, tradeCode);

    const resolveResponse = await harness.request(
      'POST',
      `/api/admin/nexa-escrow-orders/${encodeURIComponent(tradeCode)}/resolve`,
      { resolution: 'release_to_seller', note: '支持卖家' },
      {
        cookies: adminCookies
      }
    );
    assert.equal(resolveResponse.statusCode, 200);
    assert.equal(resolveResponse.body.ok, true);
    assert.equal(resolveResponse.body.order.status, 'COMPLETED');

    const buyerBootstrapAfterResolve = await harness.request('GET', '/api/nexa-escrow/bootstrap', null, {
      cookies: { [buyerCookie.name]: buyerCookie.value }
    });
    const resolvedBuyerOrder = buyerBootstrapAfterResolve.body.orders.find((item) => item.tradeCode === tradeCode);
    assert.ok(resolvedBuyerOrder);
    assert.equal(String(resolvedBuyerOrder.status || '').toUpperCase(), 'COMPLETED');

    const wallet = harness.db.prepare(`
      SELECT available_balance
      FROM nexa_escrow_wallets
      JOIN game_users ON game_users.id = nexa_escrow_wallets.user_id
      WHERE game_users.openid = ?
    `).get('escrow-seller-open-id-dispute');
    assert.equal(String(wallet.available_balance), '30.00');
  } finally {
    harness.cleanup();
  }
});
