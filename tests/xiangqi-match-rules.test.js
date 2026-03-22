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
    assert.deepEqual(moveResponse.body, {
      ok: true,
      status: 'playing',
      turnSide: 'BLACK',
      moveNo: 1
    });
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
    assert.deepEqual(offerResponse.body, {
      ok: true,
      status: 'pending',
      offerSide: 'RED'
    });
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
