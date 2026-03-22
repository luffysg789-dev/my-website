const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const dbModulePath = path.join(__dirname, '..', 'src', 'db.js');
const serverModulePath = path.join(__dirname, '..', 'src', 'server.js');

function createHarness() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claw800-xiangqi-money-flow-'));
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
      const layer = app._router.stack.find((entry) => {
        if (!entry.route) return false;
        if (entry.route.path !== routePath) return false;
        return Boolean(entry.route.methods[String(method || '').toLowerCase()]);
      });

      assert.ok(layer, `missing route ${method} ${routePath}`);

      return new Promise((resolve, reject) => {
        const req = {
          method,
          path: routePath,
          body
        };
        const res = {
          statusCode: 200,
          status(code) {
            this.statusCode = code;
            return this;
          },
          json(payload) {
            resolve({ statusCode: this.statusCode, body: payload });
            return this;
          }
        };

        try {
          const maybePromise = layer.route.stack[0].handle(req, res, reject);
          Promise.resolve(maybePromise).catch(reject);
        } catch (error) {
          reject(error);
        }
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

function seedUser(db, { openid = 'money-flow-user', availableBalance = '0.00' } = {}) {
  const result = db
    .prepare("INSERT INTO game_users (openid, nickname, avatar) VALUES (?, 'Player', '')")
    .run(openid);

  db.prepare(
    "INSERT INTO game_wallets (user_id, currency, available_balance, frozen_balance) VALUES (?, 'USDT', ?, '0.00')"
  ).run(result.lastInsertRowid, availableBalance);

  return Number(result.lastInsertRowid);
}

function getWallet(db, userId) {
  return db.prepare('SELECT * FROM game_wallets WHERE user_id = ?').get(userId);
}

function getLedgerByRelated(db, relatedType, relatedId) {
  return db
    .prepare(
      'SELECT type, amount, balance_after, related_type, related_id, remark FROM game_wallet_ledger WHERE related_type = ? AND related_id = ? ORDER BY id'
    )
    .all(relatedType, relatedId);
}

test('successful deposit notify credits available_balance', async () => {
  const harness = createHarness();
  const userId = seedUser(harness.db);
  harness.db.prepare(
    "INSERT INTO nexa_game_deposits (partner_order_no, user_id, amount, currency, status) VALUES (?, ?, ?, 'USDT', 'pending')"
  ).run('dep-success-001', userId, '12.50');

  try {
    const response = await harness.request('POST', '/api/xiangqi/deposit/notify', {
      partnerOrderNo: 'dep-success-001',
      userId,
      amount: '12.50',
      status: 'SUCCESS'
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, { ok: true, status: 'credited' });
    assert.equal(getWallet(harness.db, userId).available_balance, '12.50');
    assert.deepEqual(getLedgerByRelated(harness.db, 'deposit', 'dep-success-001'), [
      {
        type: 'deposit_credit',
        amount: '12.50',
        balance_after: '12.50',
        related_type: 'deposit',
        related_id: 'dep-success-001',
        remark: 'deposit notify success'
      }
    ]);

    const deposit = harness.db
      .prepare('SELECT status, paid_at, notify_payload FROM nexa_game_deposits WHERE partner_order_no = ?')
      .get('dep-success-001');
    assert.equal(deposit.status, 'paid');
    assert.ok(deposit.paid_at);
    assert.match(deposit.notify_payload, /dep-success-001/);
  } finally {
    harness.cleanup();
  }
});

test('duplicate deposit notify is idempotent', async () => {
  const harness = createHarness();
  const userId = seedUser(harness.db);
  harness.db.prepare(
    "INSERT INTO nexa_game_deposits (partner_order_no, user_id, amount, currency, status) VALUES (?, ?, ?, 'USDT', 'pending')"
  ).run('dep-idempotent-001', userId, '5.00');

  try {
    const payload = {
      partnerOrderNo: 'dep-idempotent-001',
      userId,
      amount: '5.00',
      status: 'SUCCESS'
    };

    const first = await harness.request('POST', '/api/xiangqi/deposit/notify', payload);
    const second = await harness.request('POST', '/api/xiangqi/deposit/notify', payload);

    assert.equal(first.statusCode, 200);
    assert.equal(second.statusCode, 200);
    assert.deepEqual(second.body, { ok: true, status: 'already_processed' });
    assert.equal(getWallet(harness.db, userId).available_balance, '5.00');
    assert.equal(getLedgerByRelated(harness.db, 'deposit', 'dep-idempotent-001').length, 1);
  } finally {
    harness.cleanup();
  }
});

test('withdraw create rejects when available_balance is insufficient', async () => {
  const harness = createHarness();
  const userId = seedUser(harness.db, { availableBalance: '3.00', openid: 'withdraw-insufficient-user' });

  try {
    const response = await harness.request('POST', '/api/xiangqi/withdraw/create', {
      partnerOrderNo: 'wd-insufficient-001',
      userId,
      amount: '4.00',
      status: 'PENDING'
    });

    assert.equal(response.statusCode, 409);
    assert.deepEqual(response.body, {
      ok: false,
      error: 'INSUFFICIENT_BALANCE'
    });
    assert.equal(getWallet(harness.db, userId).available_balance, '3.00');
    assert.equal(
      harness.db.prepare('SELECT COUNT(*) AS count FROM nexa_game_withdrawals WHERE partner_order_no = ?').get('wd-insufficient-001').count,
      0
    );
  } finally {
    harness.cleanup();
  }
});

test('withdraw create records a review-pending withdrawal and deducts from available_balance', async () => {
  const harness = createHarness();
  const userId = seedUser(harness.db, { availableBalance: '20.00', openid: 'withdraw-pending-user' });

  try {
    const response = await harness.request('POST', '/api/xiangqi/withdraw/create', {
      partnerOrderNo: 'wd-pending-001',
      userId,
      amount: '6.25',
      status: 'PENDING'
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, { ok: true, status: 'review_pending' });
    assert.equal(getWallet(harness.db, userId).available_balance, '13.75');
    assert.deepEqual(
      harness.db
        .prepare('SELECT partner_order_no, amount, status FROM nexa_game_withdrawals WHERE partner_order_no = ?')
        .get('wd-pending-001'),
      {
        partner_order_no: 'wd-pending-001',
        amount: '6.25',
        status: 'review_pending'
      }
    );
    assert.deepEqual(getLedgerByRelated(harness.db, 'withdraw', 'wd-pending-001'), [
      {
        type: 'withdraw_debit',
        amount: '-6.25',
        balance_after: '13.75',
        related_type: 'withdraw',
        related_id: 'wd-pending-001',
        remark: 'withdraw review pending'
      }
    ]);
  } finally {
    harness.cleanup();
  }
});

test('failed withdrawal notify rejects review-pending withdrawals before admin approval', async () => {
  const harness = createHarness();
  const userId = seedUser(harness.db, { availableBalance: '10.00', openid: 'withdraw-refund-user' });

  try {
    const createResponse = await harness.request('POST', '/api/xiangqi/withdraw/create', {
      partnerOrderNo: 'wd-failed-001',
      userId,
      amount: '4.50',
      status: 'PENDING'
    });
    assert.equal(createResponse.statusCode, 200);

    const notifyResponse = await harness.request('POST', '/api/xiangqi/withdraw/notify', {
      partnerOrderNo: 'wd-failed-001',
      userId,
      amount: '4.50',
      status: 'FAILED'
    });

    assert.equal(notifyResponse.statusCode, 409);
    assert.equal(notifyResponse.body.error, 'WITHDRAWAL_NOT_PENDING');
    assert.equal(getWallet(harness.db, userId).available_balance, '5.50');
    assert.deepEqual(getLedgerByRelated(harness.db, 'withdraw', 'wd-failed-001'), [
      {
        type: 'withdraw_debit',
        amount: '-4.50',
        balance_after: '5.50',
        related_type: 'withdraw',
        related_id: 'wd-failed-001',
        remark: 'withdraw review pending'
      }
    ]);

    const withdrawal = harness.db
      .prepare('SELECT status, finished_at, notify_payload FROM nexa_game_withdrawals WHERE partner_order_no = ?')
      .get('wd-failed-001');
    assert.equal(withdrawal.status, 'review_pending');
    assert.equal(withdrawal.finished_at, '');
    assert.equal(withdrawal.notify_payload, '');
  } finally {
    harness.cleanup();
  }
});

test('withdraw create rejects mismatched duplicate requests for the same partner order', async () => {
  const harness = createHarness();
  const userId = seedUser(harness.db, { availableBalance: '20.00', openid: 'withdraw-idempotency-user' });

  try {
    const first = await harness.request('POST', '/api/xiangqi/withdraw/create', {
      partnerOrderNo: 'wd-duplicate-001',
      userId,
      amount: '6.00',
      status: 'PENDING'
    });
    assert.equal(first.statusCode, 200);

    const second = await harness.request('POST', '/api/xiangqi/withdraw/create', {
      partnerOrderNo: 'wd-duplicate-001',
      userId,
      amount: '7.00',
      status: 'PENDING'
    });

    assert.equal(second.statusCode, 409);
    assert.deepEqual(second.body, {
      ok: false,
      error: 'WITHDRAWAL_IDEMPOTENCY_MISMATCH'
    });
    assert.equal(getWallet(harness.db, userId).available_balance, '14.00');
    assert.equal(getLedgerByRelated(harness.db, 'withdraw', 'wd-duplicate-001').length, 1);
  } finally {
    harness.cleanup();
  }
});

test('failed withdrawal notify rejects withdrawals that are no longer pending', async () => {
  const harness = createHarness();
  const userId = seedUser(harness.db, { availableBalance: '8.00', openid: 'withdraw-invalid-state-user' });
  harness.db.prepare(
    "INSERT INTO nexa_game_withdrawals (partner_order_no, user_id, amount, currency, status, notify_payload, finished_at) VALUES (?, ?, ?, 'USDT', 'success', '', datetime('now'))"
  ).run('wd-success-001', userId, '3.00');

  try {
    const response = await harness.request('POST', '/api/xiangqi/withdraw/notify', {
      partnerOrderNo: 'wd-success-001',
      userId,
      amount: '3.00',
      status: 'FAILED'
    });

    assert.equal(response.statusCode, 409);
    assert.deepEqual(response.body, {
      ok: false,
      error: 'WITHDRAWAL_NOT_PENDING'
    });
    assert.equal(getWallet(harness.db, userId).available_balance, '8.00');
    assert.equal(getLedgerByRelated(harness.db, 'withdraw', 'wd-success-001').length, 0);
  } finally {
    harness.cleanup();
  }
});
