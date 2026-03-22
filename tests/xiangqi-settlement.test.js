const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const EventEmitter = require('node:events');

const dbModulePath = path.join(__dirname, '..', 'src', 'db.js');
const serverModulePath = path.join(__dirname, '..', 'src', 'server.js');

function createHarness() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claw800-xiangqi-settlement-'));
  const dbPath = path.join(tmpDir, 'claw800.db');
  const previousDbPath = process.env.CLAW800_DB_PATH;

  process.env.CLAW800_DB_PATH = dbPath;
  delete require.cache[require.resolve(dbModulePath)];
  delete require.cache[require.resolve(serverModulePath)];

  const db = require(dbModulePath);
  const app = require(serverModulePath);

  return {
    app,
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
          resolve({ statusCode: this.statusCode, body: payload });
          return this;
        };
        res.end = function end(chunk) {
          let payload = chunk;
          if (Buffer.isBuffer(payload)) payload = payload.toString('utf8');
          if (payload === undefined || payload === null || payload === '') {
            resolve({ statusCode: this.statusCode, body: null });
            return;
          }
          try {
            resolve({ statusCode: this.statusCode, body: JSON.parse(String(payload)) });
          } catch (error) {
            reject(error);
          }
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

function seedUser(db, { openid, availableBalance = '20.00' }) {
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

function getRoomByCode(db, roomCode) {
  return db.prepare('SELECT id, status, finished_at FROM xiangqi_rooms WHERE room_code = ?').get(roomCode);
}

function getMatchById(db, matchId) {
  return db
    .prepare('SELECT id, status, result, winner_user_id, finished_at FROM xiangqi_matches WHERE id = ?')
    .get(matchId);
}

function getLedgerByMatch(db, matchId) {
  return db
    .prepare(
      'SELECT user_id, type, amount, balance_after, related_type, related_id, remark FROM game_wallet_ledger WHERE related_type = ? AND related_id = ? ORDER BY id'
    )
    .all('xiangqi_match', String(matchId));
}

async function createPlayingMatch(harness) {
  const creatorUserId = seedUser(harness.db, { openid: 'settlement-creator' });
  const joinerUserId = seedUser(harness.db, { openid: 'settlement-joiner' });

  const createResponse = await harness.request('POST', '/api/xiangqi/rooms/create', {
    userId: creatorUserId,
    stakeAmount: '5.00',
    timeControlMinutes: 15
  });
  const roomCode = createResponse.body.roomCode;

  const joinResponse = await harness.request('POST', '/api/xiangqi/rooms/join', {
    userId: joinerUserId,
    roomCode
  });

  return {
    creatorUserId,
    joinerUserId,
    roomCode,
    matchId: joinResponse.body.matchId
  };
}

test('winner receives opponent stake and own stake is released', async () => {
  const harness = createHarness();

  try {
    const context = await createPlayingMatch(harness);

    const result = harness.app.locals.xiangqi.settleMatchForTesting({
      matchId: context.matchId,
      result: 'RED_WIN'
    });

    assert.equal(result.kind, 'settled');
    assert.equal(result.result, 'RED_WIN');
    assert.deepEqual(getWallet(harness.db, context.creatorUserId), {
      available_balance: '25.00',
      frozen_balance: '0.00'
    });
    assert.deepEqual(getWallet(harness.db, context.joinerUserId), {
      available_balance: '15.00',
      frozen_balance: '0.00'
    });
    assert.deepEqual(getLedgerByMatch(harness.db, context.matchId), [
      {
        user_id: context.creatorUserId,
        type: 'match_win',
        amount: '10.00',
        balance_after: '25.00',
        related_type: 'xiangqi_match',
        related_id: String(context.matchId),
        remark: 'match settled win'
      },
      {
        user_id: context.joinerUserId,
        type: 'match_loss',
        amount: '-5.00',
        balance_after: '15.00',
        related_type: 'xiangqi_match',
        related_id: String(context.matchId),
        remark: 'match settled loss'
      }
    ]);
  } finally {
    harness.cleanup();
  }
});

test('loser loses only their frozen stake', async () => {
  const harness = createHarness();

  try {
    const context = await createPlayingMatch(harness);

    harness.app.locals.xiangqi.settleMatchForTesting({
      matchId: context.matchId,
      result: 'BLACK_WIN'
    });

    assert.deepEqual(getWallet(harness.db, context.creatorUserId), {
      available_balance: '15.00',
      frozen_balance: '0.00'
    });
    assert.deepEqual(getWallet(harness.db, context.joinerUserId), {
      available_balance: '25.00',
      frozen_balance: '0.00'
    });
    assert.deepEqual(getLedgerByMatch(harness.db, context.matchId), [
      {
        user_id: context.creatorUserId,
        type: 'match_loss',
        amount: '-5.00',
        balance_after: '15.00',
        related_type: 'xiangqi_match',
        related_id: String(context.matchId),
        remark: 'match settled loss'
      },
      {
        user_id: context.joinerUserId,
        type: 'match_win',
        amount: '10.00',
        balance_after: '25.00',
        related_type: 'xiangqi_match',
        related_id: String(context.matchId),
        remark: 'match settled win'
      }
    ]);
  } finally {
    harness.cleanup();
  }
});

test('draw returns both frozen stakes', async () => {
  const harness = createHarness();

  try {
    const context = await createPlayingMatch(harness);

    const result = harness.app.locals.xiangqi.settleMatchForTesting({
      matchId: context.matchId,
      result: 'DRAW'
    });

    assert.equal(result.kind, 'settled');
    assert.equal(result.result, 'DRAW');
    assert.deepEqual(getWallet(harness.db, context.creatorUserId), {
      available_balance: '20.00',
      frozen_balance: '0.00'
    });
    assert.deepEqual(getWallet(harness.db, context.joinerUserId), {
      available_balance: '20.00',
      frozen_balance: '0.00'
    });
    assert.deepEqual(getLedgerByMatch(harness.db, context.matchId), [
      {
        user_id: context.creatorUserId,
        type: 'unfreeze_stake',
        amount: '5.00',
        balance_after: '20.00',
        related_type: 'xiangqi_match',
        related_id: String(context.matchId),
        remark: 'match draw unfreeze'
      },
      {
        user_id: context.joinerUserId,
        type: 'unfreeze_stake',
        amount: '5.00',
        balance_after: '20.00',
        related_type: 'xiangqi_match',
        related_id: String(context.matchId),
        remark: 'match draw unfreeze'
      }
    ]);

    const room = getRoomByCode(harness.db, context.roomCode);
    const match = getMatchById(harness.db, context.matchId);
    assert.equal(room.status, 'FINISHED');
    assert.ok(room.finished_at);
    assert.equal(match.status, 'FINISHED');
    assert.equal(match.result, 'DRAW');
    assert.equal(match.winner_user_id, null);
    assert.ok(match.finished_at);
  } finally {
    harness.cleanup();
  }
});

test('timeout result returns both frozen stakes', async () => {
  const harness = createHarness();

  try {
    const context = await createPlayingMatch(harness);

    const result = harness.app.locals.xiangqi.settleMatchForTesting({
      matchId: context.matchId,
      result: 'TIMEOUT_DRAW'
    });

    assert.equal(result.kind, 'settled');
    assert.equal(result.result, 'TIMEOUT_DRAW');
    assert.deepEqual(getWallet(harness.db, context.creatorUserId), {
      available_balance: '20.00',
      frozen_balance: '0.00'
    });
    assert.deepEqual(getWallet(harness.db, context.joinerUserId), {
      available_balance: '20.00',
      frozen_balance: '0.00'
    });
    assert.deepEqual(getLedgerByMatch(harness.db, context.matchId), [
      {
        user_id: context.creatorUserId,
        type: 'unfreeze_stake',
        amount: '5.00',
        balance_after: '20.00',
        related_type: 'xiangqi_match',
        related_id: String(context.matchId),
        remark: 'match timeout draw unfreeze'
      },
      {
        user_id: context.joinerUserId,
        type: 'unfreeze_stake',
        amount: '5.00',
        balance_after: '20.00',
        related_type: 'xiangqi_match',
        related_id: String(context.matchId),
        remark: 'match timeout draw unfreeze'
      }
    ]);
  } finally {
    harness.cleanup();
  }
});

test('settlement is idempotent if the same match result is processed twice', async () => {
  const harness = createHarness();

  try {
    const context = await createPlayingMatch(harness);

    const first = harness.app.locals.xiangqi.settleMatchForTesting({
      matchId: context.matchId,
      result: 'RED_WIN'
    });
    const second = harness.app.locals.xiangqi.settleMatchForTesting({
      matchId: context.matchId,
      result: 'RED_WIN'
    });

    assert.equal(first.kind, 'settled');
    assert.equal(first.result, 'RED_WIN');
    assert.deepEqual(second, { kind: 'already_processed', result: 'RED_WIN' });
    assert.deepEqual(getWallet(harness.db, context.creatorUserId), {
      available_balance: '25.00',
      frozen_balance: '0.00'
    });
    assert.deepEqual(getWallet(harness.db, context.joinerUserId), {
      available_balance: '15.00',
      frozen_balance: '0.00'
    });
    assert.equal(getLedgerByMatch(harness.db, context.matchId).length, 2);
  } finally {
    harness.cleanup();
  }
});
