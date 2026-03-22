const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const EventEmitter = require('node:events');

const dbModulePath = path.join(__dirname, '..', 'src', 'db.js');
const serverModulePath = path.join(__dirname, '..', 'src', 'server.js');

function createHarness() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claw800-xiangqi-match-rules-'));
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

async function createPlayingMatch(harness) {
  const redUserId = seedUser(harness.db, { openid: 'rules-red' });
  const blackUserId = seedUser(harness.db, { openid: 'rules-black' });

  const createResponse = await harness.request('POST', '/api/xiangqi/rooms/create', {
    userId: redUserId,
    stakeAmount: '5.00',
    timeControlMinutes: 15
  });
  const joinResponse = await harness.request('POST', '/api/xiangqi/rooms/join', {
    userId: blackUserId,
    roomCode: createResponse.body.roomCode
  });
  await harness.request('POST', `/api/xiangqi/rooms/${createResponse.body.roomCode}/start`, {
    userId: redUserId
  });

  return {
    redUserId,
    blackUserId,
    roomCode: createResponse.body.roomCode,
    matchId: joinResponse.body.matchId
  };
}

test('moves are blocked until a ready room is explicitly started', async () => {
  const harness = createHarness();

  try {
    const redUserId = seedUser(harness.db, { openid: 'rules-ready-red' });
    const blackUserId = seedUser(harness.db, { openid: 'rules-ready-black' });
    const createResponse = await harness.request('POST', '/api/xiangqi/rooms/create', {
      userId: redUserId,
      stakeAmount: '5.00',
      timeControlMinutes: 15
    });
    const joinResponse = await harness.request('POST', '/api/xiangqi/rooms/join', {
      userId: blackUserId,
      roomCode: createResponse.body.roomCode
    });

    const response = await harness.request('POST', `/api/xiangqi/matches/${joinResponse.body.matchId}/move`, {
      userId: redUserId,
      from: { file: 0, rank: 6 },
      to: { file: 0, rank: 5 }
    });

    assert.equal(response.statusCode, 409);
    assert.deepEqual(response.body, {
      ok: false,
      error: 'MATCH_NOT_PLAYING'
    });
  } finally {
    harness.cleanup();
  }
});

function getWallet(db, userId) {
  return db.prepare('SELECT available_balance, frozen_balance FROM game_wallets WHERE user_id = ?').get(userId);
}

function setCustomMatchState(db, matchId, { pieces, turnSide = 'RED' }) {
  db.prepare(
    `
      UPDATE xiangqi_matches
      SET current_fen = ?, turn_side = ?
      WHERE id = ?
    `
  ).run(
    JSON.stringify({
      pendingDrawOfferSide: null,
      pieces
    }),
    turnSide,
    matchId
  );
}

test('only the current side can move', async () => {
  const harness = createHarness();

  try {
    const context = await createPlayingMatch(harness);

    const response = await harness.request('POST', `/api/xiangqi/matches/${context.matchId}/move`, {
      userId: context.blackUserId,
      from: { file: 0, rank: 3 },
      to: { file: 0, rank: 4 }
    });

    assert.equal(response.statusCode, 409);
    assert.deepEqual(response.body, {
      ok: false,
      error: 'NOT_YOUR_TURN'
    });
  } finally {
    harness.cleanup();
  }
});

test('illegal moves are rejected', async () => {
  const harness = createHarness();

  try {
    const context = await createPlayingMatch(harness);

    const response = await harness.request('POST', `/api/xiangqi/matches/${context.matchId}/move`, {
      userId: context.redUserId,
      from: { file: 0, rank: 9 },
      to: { file: 1, rank: 8 }
    });

    assert.equal(response.statusCode, 422);
    assert.deepEqual(response.body, {
      ok: false,
      error: 'ILLEGAL_MOVE'
    });
  } finally {
    harness.cleanup();
  }
});

test('legal moves update stored state', async () => {
  const harness = createHarness();

  try {
    const context = await createPlayingMatch(harness);

    const moveResponse = await harness.request('POST', `/api/xiangqi/matches/${context.matchId}/move`, {
      userId: context.redUserId,
      from: { file: 0, rank: 6 },
      to: { file: 0, rank: 5 }
    });
    const matchResponse = await harness.request('GET', `/api/xiangqi/matches/${context.matchId}`);

    assert.equal(moveResponse.statusCode, 200);
    assert.equal(moveResponse.body.ok, true);
    assert.equal(moveResponse.body.status, 'playing');
    assert.equal(moveResponse.body.turnSide, 'BLACK');
    assert.equal(moveResponse.body.moveNo, 1);
    assert.equal(moveResponse.body.audioCue, '');
    assert.equal(moveResponse.body.match.id, context.matchId);
    assert.equal(moveResponse.body.match.status, 'PLAYING');
    assert.equal(moveResponse.body.match.result, '');
    assert.equal(moveResponse.body.match.winnerUserId, null);
    assert.equal(moveResponse.body.match.roomId > 0, true);
    assert.equal(moveResponse.body.match.redUserId, context.redUserId);
    assert.equal(moveResponse.body.match.blackUserId, context.blackUserId);
    assert.equal(moveResponse.body.match.turnSide, 'BLACK');
    assert.equal(moveResponse.body.match.redTimeLeftMs > 0, true);
    assert.equal(moveResponse.body.match.blackTimeLeftMs <= 15 * 60 * 1000, true);
    assert.equal(moveResponse.body.match.blackTimeLeftMs >= 15 * 60 * 1000 - 250, true);
    assert.equal(moveResponse.body.match.pendingDrawOfferSide, null);
    assert.equal(Array.isArray(moveResponse.body.match.pieces), true);
    assert.equal(matchResponse.statusCode, 200);
    assert.equal(matchResponse.body.item.turnSide, 'BLACK');
    assert.equal(matchResponse.body.item.pieces.some((piece) => piece.side === 'RED' && piece.type === 'pawn' && piece.file === 0 && piece.rank === 5), true);
    assert.equal(matchResponse.body.item.pieces.some((piece) => piece.side === 'RED' && piece.type === 'pawn' && piece.file === 0 && piece.rank === 6), false);
  } finally {
    harness.cleanup();
  }
});

test('a new match starts with the standard chinese chess opening setup', async () => {
  const harness = createHarness();

  try {
    const context = await createPlayingMatch(harness);
    const matchResponse = await harness.request('GET', `/api/xiangqi/matches/${context.matchId}`);
    const pieces = matchResponse.body.item.pieces;

    assert.equal(pieces.some((piece) => piece.side === 'BLACK' && piece.type === 'rook' && piece.file === 0 && piece.rank === 0), true);
    assert.equal(pieces.some((piece) => piece.side === 'BLACK' && piece.type === 'king' && piece.file === 4 && piece.rank === 0), true);
    assert.equal(pieces.some((piece) => piece.side === 'BLACK' && piece.type === 'rook' && piece.file === 8 && piece.rank === 0), true);
    assert.equal(pieces.some((piece) => piece.side === 'BLACK' && piece.type === 'cannon' && piece.file === 1 && piece.rank === 2), true);
    assert.equal(pieces.some((piece) => piece.side === 'BLACK' && piece.type === 'cannon' && piece.file === 7 && piece.rank === 2), true);
    assert.equal(pieces.some((piece) => piece.side === 'RED' && piece.type === 'rook' && piece.file === 0 && piece.rank === 9), true);
    assert.equal(pieces.some((piece) => piece.side === 'RED' && piece.type === 'king' && piece.file === 4 && piece.rank === 9), true);
    assert.equal(pieces.some((piece) => piece.side === 'RED' && piece.type === 'rook' && piece.file === 8 && piece.rank === 9), true);
    assert.equal(pieces.some((piece) => piece.side === 'RED' && piece.type === 'cannon' && piece.file === 1 && piece.rank === 7), true);
    assert.equal(pieces.some((piece) => piece.side === 'RED' && piece.type === 'cannon' && piece.file === 7 && piece.rank === 7), true);
  } finally {
    harness.cleanup();
  }
});

test('resign marks the correct winner', async () => {
  const harness = createHarness();

  try {
    const context = await createPlayingMatch(harness);

    const response = await harness.request('POST', `/api/xiangqi/matches/${context.matchId}/resign`, {
      userId: context.blackUserId
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, {
      ok: true,
      status: 'finished',
      result: 'RED_WIN'
    });
    assert.deepEqual(getWallet(harness.db, context.redUserId), {
      available_balance: '25.00',
      frozen_balance: '0.00'
    });
    assert.deepEqual(getWallet(harness.db, context.blackUserId), {
      available_balance: '15.00',
      frozen_balance: '0.00'
    });
  } finally {
    harness.cleanup();
  }
});

test('draw offer and acceptance mark the match as draw', async () => {
  const harness = createHarness();

  try {
    const context = await createPlayingMatch(harness);

    const offerResponse = await harness.request('POST', `/api/xiangqi/matches/${context.matchId}/draw/offer`, {
      userId: context.redUserId
    });
    const acceptResponse = await harness.request('POST', `/api/xiangqi/matches/${context.matchId}/draw/respond`, {
      userId: context.blackUserId,
      accept: true
    });
    const matchResponse = await harness.request('GET', `/api/xiangqi/matches/${context.matchId}`);

    assert.equal(offerResponse.statusCode, 200);
    assert.equal(offerResponse.body.ok, true);
    assert.equal(offerResponse.body.status, 'pending');
    assert.equal(offerResponse.body.offerSide, 'RED');
    assert.equal(offerResponse.body.match.pendingDrawOfferSide, 'RED');
    assert.equal(acceptResponse.statusCode, 200);
    assert.deepEqual(acceptResponse.body, {
      ok: true,
      status: 'finished',
      result: 'DRAW'
    });
    assert.equal(matchResponse.body.item.status, 'FINISHED');
    assert.equal(matchResponse.body.item.result, 'DRAW');
    assert.deepEqual(getWallet(harness.db, context.redUserId), {
      available_balance: '20.00',
      frozen_balance: '0.00'
    });
    assert.deepEqual(getWallet(harness.db, context.blackUserId), {
      available_balance: '20.00',
      frozen_balance: '0.00'
    });
  } finally {
    harness.cleanup();
  }
});

test('draw offer response includes pending draw state for realtime clients', async () => {
  const harness = createHarness();

  try {
    const context = await createPlayingMatch(harness);

    const offerResponse = await harness.request('POST', `/api/xiangqi/matches/${context.matchId}/draw/offer`, {
      userId: context.redUserId
    });

    assert.equal(offerResponse.statusCode, 200);
    assert.equal(offerResponse.body.ok, true);
    assert.equal(offerResponse.body.status, 'pending');
    assert.equal(offerResponse.body.offerSide, 'RED');
    assert.equal(offerResponse.body.match.id, context.matchId);
    assert.equal(typeof offerResponse.body.match.roomId, 'number');
    assert.ok(offerResponse.body.match.roomId > 0);
    assert.equal(offerResponse.body.match.redUserId, context.redUserId);
    assert.equal(offerResponse.body.match.blackUserId, context.blackUserId);
    assert.equal(offerResponse.body.match.turnSide, 'RED');
    assert.equal(offerResponse.body.match.status, 'PLAYING');
    assert.equal(offerResponse.body.match.result, '');
    assert.equal(offerResponse.body.match.winnerUserId, null);
    assert.equal(offerResponse.body.match.pendingDrawOfferSide, 'RED');
    assert.equal(offerResponse.body.match.finishedAt, '');
    assert.ok(Array.isArray(offerResponse.body.match.pieces));
    assert.equal(typeof offerResponse.body.match.redTimeLeftMs, 'number');
    assert.equal(typeof offerResponse.body.match.blackTimeLeftMs, 'number');
  } finally {
    harness.cleanup();
  }
});

test('capturing the opposing king ends the match immediately', async () => {
  const harness = createHarness();

  try {
    const context = await createPlayingMatch(harness);
    setCustomMatchState(harness.db, context.matchId, {
      turnSide: 'BLACK',
      pieces: [
        { file: 4, rank: 0, side: 'BLACK', type: 'king' },
        { file: 4, rank: 8, side: 'BLACK', type: 'rook' },
        { file: 4, rank: 9, side: 'RED', type: 'king' }
      ]
    });

    const response = await harness.request('POST', `/api/xiangqi/matches/${context.matchId}/move`, {
      userId: context.blackUserId,
      from: { file: 4, rank: 8 },
      to: { file: 4, rank: 9 }
    });
    const matchResponse = await harness.request('GET', `/api/xiangqi/matches/${context.matchId}`);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.status, 'finished');
    assert.equal(response.body.result, 'BLACK_WIN');
    assert.equal(response.body.match.id, context.matchId);
    assert.equal(response.body.match.status, 'FINISHED');
    assert.equal(response.body.match.result, 'BLACK_WIN');
    assert.equal(response.body.match.winnerUserId, context.blackUserId);
    assert.equal(Array.isArray(response.body.match.pieces), true);
    assert.equal(matchResponse.statusCode, 200);
    assert.equal(matchResponse.body.item.status, 'FINISHED');
    assert.equal(matchResponse.body.item.result, 'BLACK_WIN');
    assert.equal(matchResponse.body.item.winnerUserId, context.blackUserId);
    assert.equal(
      matchResponse.body.item.pieces.some((piece) => piece.side === 'RED' && piece.type === 'king'),
      false
    );
    assert.equal(
      matchResponse.body.item.pieces.some((piece) => piece.side === 'BLACK' && piece.type === 'rook' && piece.file === 4 && piece.rank === 9),
      true
    );
    assert.deepEqual(getWallet(harness.db, context.redUserId), {
      available_balance: '15.00',
      frozen_balance: '0.00'
    });
    assert.deepEqual(getWallet(harness.db, context.blackUserId), {
      available_balance: '25.00',
      frozen_balance: '0.00'
    });
  } finally {
    harness.cleanup();
  }
});

test('capturing a piece returns the capture audio cue', async () => {
  const harness = createHarness();

  try {
    const context = await createPlayingMatch(harness);
    setCustomMatchState(harness.db, context.matchId, {
      turnSide: 'RED',
      pieces: [
        { file: 4, rank: 0, side: 'BLACK', type: 'king' },
        { file: 4, rank: 9, side: 'RED', type: 'king' },
        { file: 4, rank: 5, side: 'RED', type: 'pawn' },
        { file: 0, rank: 5, side: 'RED', type: 'rook' },
        { file: 0, rank: 4, side: 'BLACK', type: 'pawn' }
      ]
    });

    const response = await harness.request('POST', `/api/xiangqi/matches/${context.matchId}/move`, {
      userId: context.redUserId,
      from: { file: 0, rank: 5 },
      to: { file: 0, rank: 4 }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.status, 'playing');
    assert.equal(response.body.turnSide, 'BLACK');
    assert.equal(response.body.moveNo, 1);
    assert.equal(response.body.audioCue, 'capture');
    assert.equal(response.body.match.id, context.matchId);
    assert.equal(response.body.match.status, 'PLAYING');
    assert.equal(response.body.match.result, '');
    assert.equal(response.body.match.winnerUserId, null);
    assert.equal(response.body.match.roomId > 0, true);
    assert.equal(response.body.match.redUserId, context.redUserId);
    assert.equal(response.body.match.blackUserId, context.blackUserId);
    assert.equal(response.body.match.turnSide, 'BLACK');
    assert.equal(response.body.match.redTimeLeftMs > 0, true);
    assert.equal(response.body.match.blackTimeLeftMs > 0, true);
    assert.equal(response.body.match.pendingDrawOfferSide, null);
    assert.equal(Array.isArray(response.body.match.pieces), true);
  } finally {
    harness.cleanup();
  }
});

test('checking the opposing king returns the check audio cue', async () => {
  const harness = createHarness();

  try {
    const context = await createPlayingMatch(harness);
    setCustomMatchState(harness.db, context.matchId, {
      turnSide: 'RED',
      pieces: [
        { file: 4, rank: 0, side: 'BLACK', type: 'king' },
        { file: 3, rank: 9, side: 'RED', type: 'king' },
        { file: 3, rank: 1, side: 'RED', type: 'rook' }
      ]
    });

    const response = await harness.request('POST', `/api/xiangqi/matches/${context.matchId}/move`, {
      userId: context.redUserId,
      from: { file: 3, rank: 1 },
      to: { file: 4, rank: 1 }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.status, 'playing');
    assert.equal(response.body.turnSide, 'BLACK');
    assert.equal(response.body.moveNo, 1);
    assert.equal(response.body.audioCue, 'check');
    assert.equal(response.body.match.id, context.matchId);
    assert.equal(response.body.match.status, 'PLAYING');
    assert.equal(response.body.match.result, '');
    assert.equal(response.body.match.winnerUserId, null);
    assert.equal(response.body.match.roomId > 0, true);
    assert.equal(response.body.match.redUserId, context.redUserId);
    assert.equal(response.body.match.blackUserId, context.blackUserId);
    assert.equal(response.body.match.turnSide, 'BLACK');
    assert.equal(response.body.match.redTimeLeftMs > 0, true);
    assert.equal(response.body.match.blackTimeLeftMs > 0, true);
    assert.equal(response.body.match.pendingDrawOfferSide, null);
    assert.equal(Array.isArray(response.body.match.pieces), true);
  } finally {
    harness.cleanup();
  }
});

test('timeout makes the timed out side lose instead of ending in a draw', async () => {
  const harness = createHarness();

  try {
    const context = await createPlayingMatch(harness);
    harness.db.prepare(
      `
        UPDATE xiangqi_matches
        SET red_time_left_ms = 0,
            black_time_left_ms = 60000
        WHERE id = ?
      `
    ).run(context.matchId);

    const response = await harness.request('POST', `/api/xiangqi/matches/${context.matchId}/timeout`, {});
    const matchResponse = await harness.request('GET', `/api/xiangqi/matches/${context.matchId}`);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.status, 'finished');
    assert.equal(response.body.result, 'BLACK_WIN');
    assert.equal(matchResponse.body.item.status, 'FINISHED');
    assert.equal(matchResponse.body.item.result, 'BLACK_WIN');
    assert.equal(matchResponse.body.item.winnerUserId, context.blackUserId);
  } finally {
    harness.cleanup();
  }
});
