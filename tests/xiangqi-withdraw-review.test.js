const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const EventEmitter = require('node:events');

const dbModulePath = path.join(__dirname, '..', 'src', 'db.js');
const serverModulePath = path.join(__dirname, '..', 'src', 'server.js');
const nexaPayModulePath = path.join(__dirname, '..', 'src', 'nexa-pay.js');
const adminHtmlPath = path.join(__dirname, '..', 'public', 'admin.html');
const adminJsPath = path.join(__dirname, '..', 'public', 'admin.js');

function createHarness({ mockWithdrawResponse } = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claw800-xiangqi-withdraw-review-'));
  const dbPath = path.join(tmpDir, 'claw800.db');
  const previousDbPath = process.env.CLAW800_DB_PATH;

  process.env.CLAW800_DB_PATH = dbPath;
  delete require.cache[require.resolve(dbModulePath)];
  delete require.cache[require.resolve(serverModulePath)];
  delete require.cache[require.resolve(nexaPayModulePath)];

  const nexaPay = require(nexaPayModulePath);
  if (mockWithdrawResponse) {
    nexaPay.postNexaJson = async (endpointPath, payload) => {
      if (endpointPath === '/partner/api/openapi/account/withdraw') {
        return mockWithdrawResponse(payload);
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
    async request(method, routePath, body, cookies = {}) {
      return new Promise((resolve, reject) => {
        const req = new EventEmitter();
        req.method = method;
        req.url = routePath;
        req.originalUrl = routePath;
        req.headers = {};
        req.connection = {};
        req.socket = {};
        req.body = body;
        req.cookies = { ...cookies };
        req.query = {};

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
        res.cookie = function cookie(name, value) {
          this.headers['set-cookie'] = [`${name}=${value}`];
          return this;
        };
        res.clearCookie = function clearCookie(name) {
          this.headers['set-cookie'] = [`${name}=; Max-Age=0`];
          return this;
        };
        res.status = function status(code) {
          this.statusCode = code;
          return this;
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
            return this;
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
    }
  };
}

function seedUser(db, { openid = 'withdraw-review-user', availableBalance = '20.00' } = {}) {
  const result = db
    .prepare("INSERT INTO game_users (openid, nickname, avatar) VALUES (?, 'Player', '')")
    .run(openid);

  db.prepare(
    "INSERT INTO game_wallets (user_id, currency, available_balance, frozen_balance) VALUES (?, 'USDT', ?, '0.00')"
  ).run(result.lastInsertRowid, availableBalance);

  return Number(result.lastInsertRowid);
}

function getWallet(db, userId) {
  return db.prepare('SELECT available_balance, frozen_balance FROM game_wallets WHERE user_id = ?').get(userId);
}

async function loginAdmin(harness) {
  const response = await harness.request('POST', '/api/admin/login', { password: '123456' });
  const setCookie = response.headers['set-cookie'];
  assert.equal(response.statusCode, 200);
  assert.ok(Array.isArray(setCookie));
  const token = String(setCookie[0] || '').split(';')[0].split('=')[1];
  assert.ok(token);
  return { admin_token: token };
}

test('admin can list review-pending xiangqi withdrawals', async () => {
  const harness = createHarness();
  const userId = seedUser(harness.db, { openid: 'review-list-user', availableBalance: '9.00' });

  try {
    await harness.request('POST', '/api/xiangqi/withdraw/create', {
      partnerOrderNo: 'wd-review-list-001',
      userId,
      amount: '3.00'
    });
    const cookies = await loginAdmin(harness);

    const response = await harness.request('GET', '/api/admin/xiangqi-withdrawals?status=review_pending', undefined, cookies);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.items.length, 1);
    assert.equal(response.body.items[0].partnerOrderNo, 'wd-review-list-001');
    assert.equal(response.body.items[0].status, 'review_pending');
    assert.equal(response.body.items[0].openId, 'review-list-user');
  } finally {
    harness.cleanup();
  }
});

test('admin rejection refunds review-pending withdrawal back to wallet', async () => {
  const harness = createHarness();
  const userId = seedUser(harness.db, { openid: 'review-reject-user', availableBalance: '20.00' });

  try {
    const createResponse = await harness.request('POST', '/api/xiangqi/withdraw/create', {
      partnerOrderNo: 'wd-review-reject-001',
      userId,
      amount: '6.25'
    });
    assert.equal(createResponse.statusCode, 200);

    const cookies = await loginAdmin(harness);
    const rejectResponse = await harness.request(
      'POST',
      '/api/admin/xiangqi-withdrawals/wd-review-reject-001/reject',
      { note: '人工驳回测试' },
      cookies
    );

    assert.equal(rejectResponse.statusCode, 200);
    assert.deepEqual(rejectResponse.body, { ok: true, status: 'rejected' });
    assert.deepEqual(getWallet(harness.db, userId), {
      available_balance: '20.00',
      frozen_balance: '0.00'
    });
    const withdrawal = harness.db
      .prepare('SELECT status, review_note, reviewed_by FROM nexa_game_withdrawals WHERE partner_order_no = ?')
      .get('wd-review-reject-001');
    assert.equal(withdrawal.status, 'rejected');
    assert.equal(withdrawal.review_note, '人工驳回测试');
    assert.equal(withdrawal.reviewed_by, 'admin');
  } finally {
    harness.cleanup();
  }
});

test('admin approval calls Nexa withdrawal API and keeps funds debited while pending', async () => {
  const harness = createHarness({
    mockWithdrawResponse(payload) {
      return {
        code: '0',
        message: 'success',
        data: {
          amount: payload.amount,
          currency: payload.currency,
          status: 'PENDING',
          openid: payload.openid,
          createTime: '2026-03-22 18:00:00',
          orderNo: payload.orderNo
        }
      };
    }
  });
  const userId = seedUser(harness.db, { openid: 'review-approve-user', availableBalance: '20.00' });

  try {
    await harness.request('POST', '/api/xiangqi/withdraw/create', {
      partnerOrderNo: 'wd-review-approve-001',
      userId,
      amount: '4.50'
    });
    const cookies = await loginAdmin(harness);

    const approveResponse = await harness.request(
      'POST',
      '/api/admin/xiangqi-withdrawals/wd-review-approve-001/approve',
      { note: '人工审核通过' },
      cookies
    );

    assert.equal(approveResponse.statusCode, 200);
    assert.deepEqual(approveResponse.body, { ok: true, status: 'pending' });
    assert.deepEqual(getWallet(harness.db, userId), {
      available_balance: '15.50',
      frozen_balance: '0.00'
    });
    const withdrawal = harness.db
      .prepare('SELECT status, review_note, reviewed_by, notify_payload FROM nexa_game_withdrawals WHERE partner_order_no = ?')
      .get('wd-review-approve-001');
    assert.equal(withdrawal.status, 'pending');
    assert.equal(withdrawal.review_note, '人工审核通过');
    assert.equal(withdrawal.reviewed_by, 'admin');
    assert.match(withdrawal.notify_payload, /PENDING/);
  } finally {
    harness.cleanup();
  }
});

test('admin panel includes a xiangqi withdrawal review entry point', () => {
  const html = fs.readFileSync(adminHtmlPath, 'utf8');
  const js = fs.readFileSync(adminJsPath, 'utf8');

  assert.match(html, /id="navXiangqiWithdrawals"/);
  assert.match(html, /id="adminXiangqiWithdrawalsSection"/);
  assert.match(html, /id="xiangqiWithdrawalsList"/);
  assert.match(js, /const adminXiangqiWithdrawalsSection = document\.getElementById\('adminXiangqiWithdrawalsSection'\);/);
  assert.match(js, /const xiangqiWithdrawalsList = document\.getElementById\('xiangqiWithdrawalsList'\);/);
  assert.match(js, /requestTutorialJson\(\['\/api\/admin\/xiangqi-withdrawals\?status=review_pending'/);
  assert.match(js, /requestTutorialJson\(\[`\/api\/admin\/xiangqi-withdrawals\/\$\{encodeURIComponent\(partnerOrderNo\)\}\/approve`\]/);
  assert.match(js, /requestTutorialJson\(\[`\/api\/admin\/xiangqi-withdrawals\/\$\{encodeURIComponent\(partnerOrderNo\)\}\/reject`\]/);
});
