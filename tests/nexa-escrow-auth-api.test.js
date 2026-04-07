const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const EventEmitter = require('node:events');

const dbModulePath = path.join(__dirname, '..', 'src', 'db.js');
const serverModulePath = path.join(__dirname, '..', 'src', 'server.js');
const nexaPayModulePath = path.join(__dirname, '..', 'src', 'nexa-pay.js');

function createHarness({ mockPaymentResponse, mockQueryResponse, seedNexaEnv = true } = {}) {
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
  if (mockPaymentResponse || mockQueryResponse) {
    nexaPay.postNexaJson = async (endpointPath, payload) => {
      if (endpointPath === '/partner/api/openapi/payment/create' && mockPaymentResponse) {
        return mockPaymentResponse(payload);
      }
      if (endpointPath === '/partner/api/openapi/payment/query' && mockQueryResponse) {
        return mockQueryResponse(payload);
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
    assert.equal(Array.isArray(response.body.orders), true);
    assert.equal(response.body.orders.length, 0);
  } finally {
    harness.cleanup();
  }
});

test('nexa-escrow buyer can create an order and seller can join with the trade code', async () => {
  const harness = createHarness();

  try {
    const buyerSync = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-buyer-open-id',
      sessionKey: 'escrow-buyer-session-key',
      nickname: 'Buyer User'
    });
    const buyerCookie = JSON.parse(buyerSync.headers['set-cookie'][0]);

    const createResponse = await harness.request('POST', '/api/nexa-escrow/orders', {
      creatorRole: 'buyer',
      amount: '18.88',
      counterpartyEmail: 'seller@example.com',
      description: '购买主机担保'
    }, {
      cookies: {
        [buyerCookie.name]: buyerCookie.value
      }
    });

    assert.equal(createResponse.statusCode, 200);
    assert.equal(createResponse.body.ok, true);
    assert.equal(createResponse.body.order.creatorRole, 'buyer');
    assert.equal(createResponse.body.order.status, 'AWAITING_SELLER');
    assert.match(createResponse.body.order.tradeCode, /^[A-Z0-9]{8}$/);

    const sellerSync = await harness.request('POST', '/api/nexa-escrow/session', {
      openId: 'escrow-seller-open-id',
      sessionKey: 'escrow-seller-session-key',
      nickname: 'Seller User'
    });
    const sellerCookie = JSON.parse(sellerSync.headers['set-cookie'][0]);

    const joinResponse = await harness.request('POST', '/api/nexa-escrow/orders/join', {
      tradeCode: createResponse.body.order.tradeCode
    }, {
      cookies: {
        [sellerCookie.name]: sellerCookie.value
      }
    });

    assert.equal(joinResponse.statusCode, 200);
    assert.equal(joinResponse.body.ok, true);
    assert.equal(joinResponse.body.order.status, 'AWAITING_PAYMENT');
    assert.equal(joinResponse.body.order.sellerOpenId, 'escrow-seller-open-id');
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

    const createResponse = await harness.request('POST', '/api/nexa-escrow/orders', {
      creatorRole: 'buyer',
      amount: '18.88',
      counterpartyEmail: 'seller@example.com',
      description: '购买设计稿担保'
    }, {
      cookies: {
        [buyerCookie.name]: buyerCookie.value
      }
    });

    const tradeCode = createResponse.body.order.tradeCode;

    await harness.request('POST', '/api/nexa-escrow/orders/join', {
      tradeCode
    }, {
      cookies: {
        [sellerCookie.name]: sellerCookie.value
      }
    });

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

    const buyerRelease = await harness.request('POST', '/api/nexa-escrow/orders/action', {
      tradeCode,
      action: 'release'
    }, {
      cookies: {
        [buyerCookie.name]: buyerCookie.value
      }
    });

    assert.equal(buyerRelease.statusCode, 200);
    assert.equal(buyerRelease.body.order.status, 'COMPLETED');

    const wallet = harness.db.prepare(`
      SELECT available_balance
      FROM game_wallets
      JOIN game_users ON game_users.id = game_wallets.user_id
      WHERE game_users.openid = ?
    `).get('escrow-seller-open-id-2');

    assert.equal(String(wallet.available_balance), '18.88');
  } finally {
    harness.cleanup();
  }
});
