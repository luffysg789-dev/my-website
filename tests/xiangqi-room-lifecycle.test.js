const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const EventEmitter = require('node:events');

const dbModulePath = path.join(__dirname, '..', 'src', 'db.js');
const serverModulePath = path.join(__dirname, '..', 'src', 'server.js');

function createHarness() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claw800-xiangqi-room-lifecycle-'));
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
    async requestSse(routePath) {
      return new Promise((resolve, reject) => {
        const req = new EventEmitter();
        req.method = 'GET';
        req.url = routePath;
        req.originalUrl = routePath;
        req.headers = {};
        req.connection = {};
        req.socket = {};

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
        res.flushHeaders = function flushHeaders() {};
        res.write = function write(chunk) {
          process.nextTick(() => {
            req.emit('close');
            res.emit('close');
          });
          resolve({
            statusCode: this.statusCode,
            headers: this.headers,
            chunk: Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk || '')
          });
          return true;
        };
        res.end = function end() {};

        app.handle(req, res, reject);
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

function seedUser(db, { openid, availableBalance = '0.00' }) {
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

function getRoomByCode(db, roomCode) {
  return db.prepare('SELECT * FROM xiangqi_rooms WHERE room_code = ?').get(roomCode);
}

function getMatchByRoomId(db, roomId) {
  return db.prepare('SELECT * FROM xiangqi_matches WHERE room_id = ?').get(roomId);
}

function getMoveCount(db, matchId) {
  return db.prepare('SELECT COUNT(*) AS count FROM xiangqi_moves WHERE match_id = ?').get(matchId).count;
}

function getLedgerByRelated(db, relatedType, relatedId) {
  return db
    .prepare(
      'SELECT user_id, type, amount, balance_after, related_type, related_id, remark FROM game_wallet_ledger WHERE related_type = ? AND related_id = ? ORDER BY id'
    )
    .all(relatedType, String(relatedId));
}

test('create room rejects when balance is insufficient', async () => {
  const harness = createHarness();
  const userId = seedUser(harness.db, { openid: 'creator-insufficient', availableBalance: '3.00' });

  try {
    const response = await harness.request('POST', '/api/xiangqi/rooms/create', {
      userId,
      stakeAmount: '5.00',
      timeControlMinutes: 10
    });

    assert.equal(response.statusCode, 409);
    assert.deepEqual(response.body, {
      ok: false,
      error: 'INSUFFICIENT_BALANCE'
    });
    assert.equal(getWallet(harness.db, userId).available_balance, '3.00');
    assert.equal(getWallet(harness.db, userId).frozen_balance, '0.00');
    assert.equal(harness.db.prepare('SELECT COUNT(*) AS count FROM xiangqi_rooms').get().count, 0);
  } finally {
    harness.cleanup();
  }
});

test('room events stream disables proxy buffering for realtime match sync', async () => {
  const harness = createHarness();
  const creatorUserId = seedUser(harness.db, { openid: 'events-creator', availableBalance: '20.00' });

  try {
    const createResponse = await harness.request('POST', '/api/xiangqi/rooms/create', {
      userId: creatorUserId,
      stakeAmount: '1.00',
      timeControlMinutes: 15
    });
    const roomCode = createResponse.body.roomCode;

    const response = await harness.requestSse(`/api/xiangqi/rooms/${roomCode}/events`);

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers['content-type'], 'text/event-stream; charset=utf-8');
    assert.equal(response.headers['cache-control'], 'no-store, no-cache, must-revalidate, proxy-revalidate');
    assert.equal(response.headers['x-accel-buffering'], 'no');
    assert.match(response.chunk, /event: room\.snapshot/);
  } finally {
    harness.cleanup();
  }
});

test('create room freezes stake and stores room details', async () => {
  const harness = createHarness();
  const userId = seedUser(harness.db, { openid: 'creator-success', availableBalance: '20.00' });

  try {
    const response = await harness.request('POST', '/api/xiangqi/rooms/create', {
      userId,
      stakeAmount: '5.00',
      timeControlMinutes: 15
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.status, 'waiting');
    assert.match(response.body.roomCode, /^\d{6}$/);

    const room = getRoomByCode(harness.db, response.body.roomCode);
    assert.deepEqual(
      {
        creator_user_id: room.creator_user_id,
        joiner_user_id: room.joiner_user_id,
        stake_amount: room.stake_amount,
        time_control_minutes: room.time_control_minutes,
        status: room.status
      },
      {
        creator_user_id: userId,
        joiner_user_id: null,
        stake_amount: '5.00',
        time_control_minutes: 15,
        status: 'WAITING'
      }
    );
    assert.equal(getWallet(harness.db, userId).available_balance, '15.00');
    assert.equal(getWallet(harness.db, userId).frozen_balance, '5.00');
    assert.deepEqual(getLedgerByRelated(harness.db, 'xiangqi_room', room.id), [
      {
        user_id: userId,
        type: 'freeze_stake',
        amount: '-5.00',
        balance_after: '15.00',
        related_type: 'xiangqi_room',
        related_id: String(room.id),
        remark: 'room create freeze'
      }
    ]);
  } finally {
    harness.cleanup();
  }
});

test('join room rejects when balance is insufficient', async () => {
  const harness = createHarness();
  const creatorUserId = seedUser(harness.db, { openid: 'join-creator', availableBalance: '20.00' });
  const joinerUserId = seedUser(harness.db, { openid: 'join-insufficient', availableBalance: '2.00' });

  try {
    const createResponse = await harness.request('POST', '/api/xiangqi/rooms/create', {
      userId: creatorUserId,
      stakeAmount: '5.00',
      timeControlMinutes: 10
    });
    const roomCode = createResponse.body.roomCode;

    const response = await harness.request('POST', '/api/xiangqi/rooms/join', {
      userId: joinerUserId,
      roomCode
    });

    assert.equal(response.statusCode, 409);
    assert.deepEqual(response.body, {
      ok: false,
      error: 'INSUFFICIENT_BALANCE'
    });
    assert.equal(getWallet(harness.db, joinerUserId).available_balance, '2.00');
    assert.equal(getWallet(harness.db, joinerUserId).frozen_balance, '0.00');
    assert.equal(getRoomByCode(harness.db, roomCode).status, 'WAITING');
    assert.equal(harness.db.prepare('SELECT COUNT(*) AS count FROM xiangqi_matches').get().count, 0);
  } finally {
    harness.cleanup();
  }
});

test('join room freezes stake, marks room ready, and creates a ready match', async () => {
  const harness = createHarness();
  const creatorUserId = seedUser(harness.db, { openid: 'ready-creator', availableBalance: '20.00' });
  const joinerUserId = seedUser(harness.db, { openid: 'ready-joiner', availableBalance: '12.00' });

  try {
    const createResponse = await harness.request('POST', '/api/xiangqi/rooms/create', {
      userId: creatorUserId,
      stakeAmount: '5.00',
      timeControlMinutes: 30
    });
    const roomCode = createResponse.body.roomCode;

    const response = await harness.request('POST', '/api/xiangqi/rooms/join', {
      userId: joinerUserId,
      roomCode
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, {
      ok: true,
      status: 'ready',
      roomCode,
      matchId: response.body.matchId
    });

    const room = getRoomByCode(harness.db, roomCode);
    assert.deepEqual(
      {
        joiner_user_id: room.joiner_user_id,
        status: room.status
      },
      {
        joiner_user_id: joinerUserId,
        status: 'READY'
      }
    );

    const match = getMatchByRoomId(harness.db, room.id);
    assert.deepEqual(
      {
        id: match.id,
        room_id: match.room_id,
        red_user_id: match.red_user_id,
        black_user_id: match.black_user_id,
        turn_side: match.turn_side,
        red_time_left_ms: match.red_time_left_ms,
        black_time_left_ms: match.black_time_left_ms,
        status: match.status
      },
      {
        id: response.body.matchId,
        room_id: room.id,
        red_user_id: creatorUserId,
        black_user_id: joinerUserId,
        turn_side: 'RED',
        red_time_left_ms: 1800000,
        black_time_left_ms: 1800000,
        status: 'READY'
      }
    );

    assert.equal(getWallet(harness.db, joinerUserId).available_balance, '7.00');
    assert.equal(getWallet(harness.db, joinerUserId).frozen_balance, '5.00');
    assert.deepEqual(getLedgerByRelated(harness.db, 'xiangqi_room', room.id), [
      {
        user_id: creatorUserId,
        type: 'freeze_stake',
        amount: '-5.00',
        balance_after: '15.00',
        related_type: 'xiangqi_room',
        related_id: String(room.id),
        remark: 'room create freeze'
      },
      {
        user_id: joinerUserId,
        type: 'freeze_stake',
        amount: '-5.00',
        balance_after: '7.00',
        related_type: 'xiangqi_room',
        related_id: String(room.id),
        remark: 'room join freeze'
      }
    ]);
  } finally {
    harness.cleanup();
  }
});

test('start room transitions a ready match into playing state', async () => {
  const harness = createHarness();
  const creatorUserId = seedUser(harness.db, { openid: 'start-creator', availableBalance: '20.00' });
  const joinerUserId = seedUser(harness.db, { openid: 'start-joiner', availableBalance: '20.00' });

  try {
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

    const startResponse = await harness.request('POST', `/api/xiangqi/rooms/${roomCode}/start`, {
      userId: creatorUserId
    });

    assert.equal(startResponse.statusCode, 200);
    assert.deepEqual(startResponse.body, {
      ok: true,
      status: 'playing',
      roomCode,
      matchId: joinResponse.body.matchId
    });

    const room = getRoomByCode(harness.db, roomCode);
    const match = getMatchByRoomId(harness.db, room.id);
    assert.equal(room.status, 'PLAYING');
    assert.equal(match.status, 'PLAYING');
    assert.ok(room.started_at);
  } finally {
    harness.cleanup();
  }
});

test('only the room creator can start a ready room', async () => {
  const harness = createHarness();
  const creatorUserId = seedUser(harness.db, { openid: 'creator-start-only', availableBalance: '20.00' });
  const joinerUserId = seedUser(harness.db, { openid: 'joiner-start-blocked', availableBalance: '20.00' });

  try {
    const createResponse = await harness.request('POST', '/api/xiangqi/rooms/create', {
      userId: creatorUserId,
      stakeAmount: '5.00',
      timeControlMinutes: 15
    });
    const roomCode = createResponse.body.roomCode;

    await harness.request('POST', '/api/xiangqi/rooms/join', {
      userId: joinerUserId,
      roomCode
    });

    const startResponse = await harness.request('POST', `/api/xiangqi/rooms/${roomCode}/start`, {
      userId: joinerUserId
    });

    assert.equal(startResponse.statusCode, 403);
    assert.deepEqual(startResponse.body, {
      ok: false,
      error: 'ROOM_FORBIDDEN'
    });

    const room = getRoomByCode(harness.db, roomCode);
    const match = getMatchByRoomId(harness.db, room.id);
    assert.equal(room.status, 'READY');
    assert.equal(match.status, 'READY');
  } finally {
    harness.cleanup();
  }
});

test('cancel waiting room unfreezes the creator stake', async () => {
  const harness = createHarness();
  const creatorUserId = seedUser(harness.db, { openid: 'cancel-creator', availableBalance: '20.00' });

  try {
    const createResponse = await harness.request('POST', '/api/xiangqi/rooms/create', {
      userId: creatorUserId,
      stakeAmount: '5.00',
      timeControlMinutes: 10
    });

    const response = await harness.request('POST', '/api/xiangqi/rooms/cancel', {
      userId: creatorUserId,
      roomCode: createResponse.body.roomCode
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, {
      ok: true,
      status: 'canceled',
      roomCode: createResponse.body.roomCode
    });

    const room = getRoomByCode(harness.db, createResponse.body.roomCode);
    assert.equal(room.status, 'CANCELED');
    assert.equal(getWallet(harness.db, creatorUserId).available_balance, '20.00');
    assert.equal(getWallet(harness.db, creatorUserId).frozen_balance, '0.00');
    assert.deepEqual(getLedgerByRelated(harness.db, 'xiangqi_room', room.id), [
      {
        user_id: creatorUserId,
        type: 'freeze_stake',
        amount: '-5.00',
        balance_after: '15.00',
        related_type: 'xiangqi_room',
        related_id: String(room.id),
        remark: 'room create freeze'
      },
      {
        user_id: creatorUserId,
        type: 'unfreeze_stake',
        amount: '5.00',
        balance_after: '20.00',
        related_type: 'xiangqi_room',
        related_id: String(room.id),
        remark: 'room cancel unfreeze'
      }
    ]);
  } finally {
    harness.cleanup();
  }
});

test('a user cannot create or join a second active room', async () => {
  const harness = createHarness();
  const userId = seedUser(harness.db, { openid: 'active-room-user', availableBalance: '40.00' });
  const otherCreatorId = seedUser(harness.db, { openid: 'other-creator', availableBalance: '20.00' });

  try {
    const firstCreate = await harness.request('POST', '/api/xiangqi/rooms/create', {
      userId,
      stakeAmount: '5.00',
      timeControlMinutes: 10
    });
    assert.equal(firstCreate.statusCode, 200);

    const secondCreate = await harness.request('POST', '/api/xiangqi/rooms/create', {
      userId,
      stakeAmount: '5.00',
      timeControlMinutes: 15
    });

    assert.equal(secondCreate.statusCode, 409);
    assert.deepEqual(secondCreate.body, {
      ok: false,
      error: 'USER_ALREADY_IN_ACTIVE_ROOM'
    });

    const otherRoom = await harness.request('POST', '/api/xiangqi/rooms/create', {
      userId: otherCreatorId,
      stakeAmount: '5.00',
      timeControlMinutes: 10
    });

    const joinResponse = await harness.request('POST', '/api/xiangqi/rooms/join', {
      userId,
      roomCode: otherRoom.body.roomCode
    });

    assert.equal(joinResponse.statusCode, 409);
    assert.deepEqual(joinResponse.body, {
      ok: false,
      error: 'USER_ALREADY_IN_ACTIVE_ROOM'
    });
    assert.equal(getWallet(harness.db, userId).available_balance, '35.00');
    assert.equal(getWallet(harness.db, userId).frozen_balance, '5.00');
    assert.equal(harness.db.prepare('SELECT COUNT(*) AS count FROM xiangqi_rooms').get().count, 2);
    assert.equal(harness.db.prepare('SELECT COUNT(*) AS count FROM xiangqi_matches').get().count, 0);
  } finally {
    harness.cleanup();
  }
});

test('cancel is rejected after a room has been joined', async () => {
  const harness = createHarness();
  const creatorUserId = seedUser(harness.db, { openid: 'cancel-after-join-creator', availableBalance: '20.00' });
  const joinerUserId = seedUser(harness.db, { openid: 'cancel-after-join-joiner', availableBalance: '20.00' });

  try {
    const createResponse = await harness.request('POST', '/api/xiangqi/rooms/create', {
      userId: creatorUserId,
      stakeAmount: '5.00',
      timeControlMinutes: 10
    });
    await harness.request('POST', '/api/xiangqi/rooms/join', {
      userId: joinerUserId,
      roomCode: createResponse.body.roomCode
    });

    const response = await harness.request('POST', '/api/xiangqi/rooms/cancel', {
      userId: creatorUserId,
      roomCode: createResponse.body.roomCode
    });

    assert.equal(response.statusCode, 409);
    assert.deepEqual(response.body, {
      ok: false,
      error: 'ROOM_NOT_CANCELABLE'
    });
    const room = getRoomByCode(harness.db, createResponse.body.roomCode);
    assert.equal(room.status, 'READY');
    assert.equal(getWallet(harness.db, creatorUserId).available_balance, '15.00');
    assert.equal(getWallet(harness.db, creatorUserId).frozen_balance, '5.00');
    assert.equal(getWallet(harness.db, joinerUserId).available_balance, '15.00');
    assert.equal(getWallet(harness.db, joinerUserId).frozen_balance, '5.00');
  } finally {
    harness.cleanup();
  }
});

test('only the room creator can request a rematch after a finished game', async () => {
  const harness = createHarness();
  const creatorUserId = seedUser(harness.db, { openid: 'rematch-creator', availableBalance: '20.00' });
  const joinerUserId = seedUser(harness.db, { openid: 'rematch-joiner', availableBalance: '20.00' });

  try {
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
    await harness.request('POST', `/api/xiangqi/rooms/${roomCode}/start`, {
      userId: creatorUserId
    });
    await harness.request('POST', `/api/xiangqi/matches/${joinResponse.body.matchId}/resign`, {
      userId: joinerUserId
    });

    const blockedResponse = await harness.request('POST', `/api/xiangqi/rooms/${roomCode}/rematch/request`, {
      userId: joinerUserId
    });

    assert.equal(blockedResponse.statusCode, 403);
    assert.deepEqual(blockedResponse.body, {
      ok: false,
      error: 'ROOM_FORBIDDEN'
    });

    const requestResponse = await harness.request('POST', `/api/xiangqi/rooms/${roomCode}/rematch/request`, {
      userId: creatorUserId
    });

    assert.equal(requestResponse.statusCode, 200);
    assert.deepEqual(requestResponse.body, {
      ok: true,
      status: 'rematch_requested',
      roomCode
    });

    const room = getRoomByCode(harness.db, roomCode);
    assert.equal(room.status, 'FINISHED');
    assert.equal(room.rematch_requested_by, creatorUserId);
  } finally {
    harness.cleanup();
  }
});

test('challenger confirm rematch reuses same room settings and freezes stake again', async () => {
  const harness = createHarness();
  const creatorUserId = seedUser(harness.db, { openid: 'rematch-confirm-creator', availableBalance: '20.00' });
  const joinerUserId = seedUser(harness.db, { openid: 'rematch-confirm-joiner', availableBalance: '20.00' });

  try {
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
    await harness.request('POST', `/api/xiangqi/rooms/${roomCode}/start`, {
      userId: creatorUserId
    });
    await harness.request('POST', `/api/xiangqi/matches/${joinResponse.body.matchId}/resign`, {
      userId: joinerUserId
    });

    assert.equal(getWallet(harness.db, creatorUserId).available_balance, '25.00');
    assert.equal(getWallet(harness.db, joinerUserId).available_balance, '15.00');
    assert.equal(getWallet(harness.db, creatorUserId).frozen_balance, '0.00');
    assert.equal(getWallet(harness.db, joinerUserId).frozen_balance, '0.00');

    await harness.request('POST', `/api/xiangqi/rooms/${roomCode}/rematch/request`, {
      userId: creatorUserId
    });

    const response = await harness.request('POST', `/api/xiangqi/rooms/${roomCode}/rematch/confirm`, {
      userId: joinerUserId
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, {
      ok: true,
      status: 'ready',
      roomCode,
      matchId: joinResponse.body.matchId
    });

    const room = getRoomByCode(harness.db, roomCode);
    const match = getMatchByRoomId(harness.db, room.id);
    assert.equal(room.status, 'READY');
    assert.equal(room.rematch_requested_by, null);
    assert.equal(match.status, 'READY');
    assert.equal(match.result, '');
    assert.equal(match.winner_user_id, null);
    assert.equal(match.turn_side, 'RED');
    assert.equal(match.red_time_left_ms, 900000);
    assert.equal(match.black_time_left_ms, 900000);
    assert.equal(getMoveCount(harness.db, match.id), 0);
    assert.equal(getWallet(harness.db, creatorUserId).available_balance, '20.00');
    assert.equal(getWallet(harness.db, creatorUserId).frozen_balance, '5.00');
    assert.equal(getWallet(harness.db, joinerUserId).available_balance, '10.00');
    assert.equal(getWallet(harness.db, joinerUserId).frozen_balance, '5.00');
  } finally {
    harness.cleanup();
  }
});

test('challenger can re-enter a finished room by room code after host requests rematch', async () => {
  const harness = createHarness();
  const creatorUserId = seedUser(harness.db, { openid: 'rematch-reenter-creator', availableBalance: '30.00' });
  const joinerUserId = seedUser(harness.db, { openid: 'rematch-reenter-joiner', availableBalance: '30.00' });

  try {
    const createResponse = await harness.request('POST', '/api/xiangqi/rooms/create', {
      userId: creatorUserId,
      stakeAmount: '5.00',
      timeControlMinutes: 15
    });
    const roomCode = createResponse.body.roomCode;

    await harness.request('POST', '/api/xiangqi/rooms/join', {
      userId: joinerUserId,
      roomCode
    });
    await harness.request('POST', `/api/xiangqi/rooms/${roomCode}/start`, {
      userId: creatorUserId
    });
    await harness.request('POST', `/api/xiangqi/matches/${getMatchByRoomId(harness.db, getRoomByCode(harness.db, roomCode).id).id}/resign`, {
      userId: joinerUserId
    });

    await harness.request('POST', `/api/xiangqi/rooms/${roomCode}/rematch/request`, {
      userId: creatorUserId
    });

    const response = await harness.request('POST', '/api/xiangqi/rooms/join', {
      userId: joinerUserId,
      roomCode
    });

    const room = getRoomByCode(harness.db, roomCode);
    const match = getMatchByRoomId(harness.db, room.id);
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, {
      ok: true,
      status: 'reentered',
      roomCode,
      matchId: match.id
    });
    assert.equal(getWallet(harness.db, joinerUserId).available_balance, '25.00');
    assert.equal(getWallet(harness.db, joinerUserId).frozen_balance, '0.00');
  } finally {
    harness.cleanup();
  }
});

test('rematch request expires after 60 seconds and disbands the room', async () => {
  const harness = createHarness();
  const creatorUserId = seedUser(harness.db, { openid: 'rematch-expire-creator', availableBalance: '20.00' });
  const joinerUserId = seedUser(harness.db, { openid: 'rematch-expire-joiner', availableBalance: '20.00' });

  try {
    const createResponse = await harness.request('POST', '/api/xiangqi/rooms/create', {
      userId: creatorUserId,
      stakeAmount: '5.00',
      timeControlMinutes: 15
    });
    const roomCode = createResponse.body.roomCode;

    await harness.request('POST', '/api/xiangqi/rooms/join', {
      userId: joinerUserId,
      roomCode
    });
    await harness.request('POST', `/api/xiangqi/rooms/${roomCode}/start`, {
      userId: creatorUserId
    });

    const room = getRoomByCode(harness.db, roomCode);
    const match = getMatchByRoomId(harness.db, room.id);
    await harness.request('POST', `/api/xiangqi/matches/${match.id}/resign`, {
      userId: joinerUserId
    });
    await harness.request('POST', `/api/xiangqi/rooms/${roomCode}/rematch/request`, {
      userId: creatorUserId
    });

    harness.db.prepare(`
      UPDATE xiangqi_rooms
      SET rematch_requested_at = datetime('now', '-61 seconds')
      WHERE room_code = ?
    `).run(roomCode);

    const expireResponse = await harness.request('POST', `/api/xiangqi/rooms/${roomCode}/rematch/expire`, {});
    assert.equal(expireResponse.statusCode, 200);
    assert.deepEqual(expireResponse.body, {
      ok: true,
      status: 'disbanded',
      roomCode
    });

    const expiredRoom = getRoomByCode(harness.db, roomCode);
    assert.equal(expiredRoom.status, 'DISBANDED');
    assert.equal(expiredRoom.rematch_requested_by, null);
    assert.equal(String(expiredRoom.rematch_requested_at || ''), '');
  } finally {
    harness.cleanup();
  }
});

test('finished room without rematch request expires after 60 seconds and disbands the room', async () => {
  const harness = createHarness();
  const creatorUserId = seedUser(harness.db, { openid: 'finished-expire-creator', availableBalance: '20.00' });
  const joinerUserId = seedUser(harness.db, { openid: 'finished-expire-joiner', availableBalance: '20.00' });

  try {
    const createResponse = await harness.request('POST', '/api/xiangqi/rooms/create', {
      userId: creatorUserId,
      stakeAmount: '5.00',
      timeControlMinutes: 15
    });
    const roomCode = createResponse.body.roomCode;

    await harness.request('POST', '/api/xiangqi/rooms/join', {
      userId: joinerUserId,
      roomCode
    });
    await harness.request('POST', `/api/xiangqi/rooms/${roomCode}/start`, {
      userId: creatorUserId
    });

    const room = getRoomByCode(harness.db, roomCode);
    const match = getMatchByRoomId(harness.db, room.id);
    await harness.request('POST', `/api/xiangqi/matches/${match.id}/resign`, {
      userId: joinerUserId
    });

    harness.db.prepare(`
      UPDATE xiangqi_rooms
      SET finished_at = datetime('now', '-61 seconds')
      WHERE room_code = ?
    `).run(roomCode);

    const expireResponse = await harness.request('POST', `/api/xiangqi/rooms/${roomCode}/rematch/expire`, {});
    assert.equal(expireResponse.statusCode, 200);
    assert.deepEqual(expireResponse.body, {
      ok: true,
      status: 'disbanded',
      roomCode
    });

    const expiredRoom = getRoomByCode(harness.db, roomCode);
    assert.equal(expiredRoom.status, 'DISBANDED');
    assert.equal(expiredRoom.rematch_requested_by, null);
    assert.equal(String(expiredRoom.rematch_requested_at || ''), '');
  } finally {
    harness.cleanup();
  }
});
