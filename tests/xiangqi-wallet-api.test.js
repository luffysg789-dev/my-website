const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const EventEmitter = require('node:events');

const dbModulePath = path.join(__dirname, '..', 'src', 'db.js');
const serverModulePath = path.join(__dirname, '..', 'src', 'server.js');

function createHarness() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claw800-xiangqi-wallet-api-'));
  const dbPath = path.join(tmpDir, 'claw800.db');
  const previousDbPath = process.env.CLAW800_DB_PATH;

  process.env.CLAW800_DB_PATH = dbPath;
  delete require.cache[require.resolve(dbModulePath)];
  delete require.cache[require.resolve(serverModulePath)];

  const db = require(dbModulePath);
  const app = require(serverModulePath);

  return {
    db,
    async request(method, routePath, body) {
      return new Promise((resolve, reject) => {
        const req = new EventEmitter();
        req.method = method;
        req.url = routePath;
        req.originalUrl = routePath;
        req.headers = {};
        req.connection = {};
        req.socket = {};
        req.body = body;
        req.query = {};

        const [pathname, queryString = ''] = routePath.split('?');
        req.url = routePath;
        req.originalUrl = routePath;
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
      if (previousDbPath === undefined) {
        delete process.env.CLAW800_DB_PATH;
      } else {
        process.env.CLAW800_DB_PATH = previousDbPath;
      }
    }
  };
}

function seedUser(db, { openid = 'wallet-api-user', availableBalance = '9.50', frozenBalance = '1.25' } = {}) {
  const result = db
    .prepare("INSERT INTO game_users (openid, nickname, avatar) VALUES (?, 'Player', '')")
    .run(openid);

  db.prepare(
    "INSERT INTO game_wallets (user_id, currency, available_balance, frozen_balance) VALUES (?, 'USDT', ?, ?)"
  ).run(result.lastInsertRowid, availableBalance, frozenBalance);

  return Number(result.lastInsertRowid);
}

test('xiangqi session sync creates the user wallet on demand', async () => {
  const harness = createHarness();

  try {
    const response = await harness.request('POST', '/api/xiangqi/session', {
      openId: 'nexa-open-user-1',
      nickname: 'Nexa 玩家'
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.user.openId, 'nexa-open-user-1');
    assert.equal(response.body.wallet.availableBalance, '0.00');
    assert.equal(response.body.wallet.frozenBalance, '0.00');
  } finally {
    harness.cleanup();
  }
});

test('xiangqi local browser session keeps an existing zero-balance wallet at zero', async () => {
  const harness = createHarness();
  const userId = seedUser(harness.db, {
    openid: 'xiangqi-browser-local',
    availableBalance: '0.00',
    frozenBalance: '0.00'
  });

  try {
    const response = await harness.request('POST', '/api/xiangqi/session', {
      openId: 'xiangqi-browser-local',
      nickname: 'Nexa 玩家'
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.user.id, userId);
    assert.equal(response.body.wallet.availableBalance, '0.00');
    assert.equal(response.body.wallet.frozenBalance, '0.00');
  } finally {
    harness.cleanup();
  }
});

test('legacy xiangqi demo session is normalized back to zero balance', async () => {
  const harness = createHarness();
  const userId = seedUser(harness.db, {
    openid: 'xiangqi-demo-local',
    availableBalance: '1000.00',
    frozenBalance: '0.00'
  });

  try {
    const response = await harness.request('POST', '/api/xiangqi/session', {
      openId: 'xiangqi-demo-local',
      nickname: '测试账号'
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.user.id, userId);
    assert.equal(response.body.wallet.availableBalance, '0.00');
    assert.equal(response.body.wallet.frozenBalance, '0.00');
  } finally {
    harness.cleanup();
  }
});

test('legacy browser-local xiangqi session is normalized back to zero balance', async () => {
  const harness = createHarness();
  const userId = seedUser(harness.db, {
    openid: 'xiangqi-browser-local',
    availableBalance: '995.00',
    frozenBalance: '0.00'
  });

  try {
    const response = await harness.request('POST', '/api/xiangqi/session', {
      openId: 'xiangqi-browser-local',
      nickname: 'Nexa 玩家'
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.user.id, userId);
    assert.equal(response.body.wallet.availableBalance, '0.00');
    assert.equal(response.body.wallet.frozenBalance, '0.00');
  } finally {
    harness.cleanup();
  }
});

test('xiangqi wallet endpoints return summary and recent ledger items', async () => {
  const harness = createHarness();
  const userId = seedUser(harness.db);

  harness.db.prepare(
    "INSERT INTO game_wallet_ledger (user_id, type, amount, balance_after, related_type, related_id, remark) VALUES (?, 'deposit_credit', '5.00', '9.50', 'deposit', 'dep-1', 'deposit notify success')"
  ).run(userId);

  try {
    const walletResponse = await harness.request('GET', `/api/xiangqi/wallet?userId=${userId}`);
    const ledgerResponse = await harness.request('GET', `/api/xiangqi/wallet/ledger?userId=${userId}&limit=10`);

    assert.equal(walletResponse.statusCode, 200);
    assert.deepEqual(walletResponse.body.item, {
      userId,
      currency: 'USDT',
      availableBalance: '9.50',
      frozenBalance: '1.25',
      latestDeposit: null,
      latestWithdrawal: null
    });
    assert.equal(ledgerResponse.statusCode, 200);
    assert.equal(ledgerResponse.body.items.length, 1);
    assert.equal(ledgerResponse.body.items[0].type, 'deposit_credit');
    assert.equal(ledgerResponse.body.items[0].amount, '5.00');
    assert.equal(ledgerResponse.body.items[0].withdrawalStatus, '');
  } finally {
    harness.cleanup();
  }
});

test('unfinished wallet endpoints still keep explicit placeholders when body is missing', async () => {
  const harness = createHarness();

  try {
    const depositNotify = await harness.request('POST', '/api/xiangqi/deposit/notify');
    const withdrawCreate = await harness.request('POST', '/api/xiangqi/withdraw/create');

    assert.equal(depositNotify.statusCode, 501);
    assert.deepEqual(depositNotify.body, {
      ok: false,
      error: 'Xiangqi wallet API not implemented yet'
    });
    assert.equal(withdrawCreate.statusCode, 501);
    assert.deepEqual(withdrawCreate.body, {
      ok: false,
      error: 'Xiangqi wallet API not implemented yet'
    });
  } finally {
    harness.cleanup();
  }
});
