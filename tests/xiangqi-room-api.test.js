const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const EventEmitter = require('node:events');

const dbModulePath = path.join(__dirname, '..', 'src', 'db.js');
const serverModulePath = path.join(__dirname, '..', 'src', 'server.js');

function createHarness() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claw800-xiangqi-room-api-'));
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
        res.flushHeaders = function flushHeaders() {};
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
          resolve({ statusCode: this.statusCode, body: String(payload || ''), headers: this.headers });
        };
        res.write = function write(chunk) {
          this._chunks = this._chunks || [];
          this._chunks.push(String(chunk || ''));
          process.nextTick(() => req.emit('close'));
          resolve({ statusCode: this.statusCode, body: this._chunks.join(''), headers: this.headers });
          return true;
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

async function createRoomContext(harness) {
  const creatorUserId = seedUser(harness.db, { openid: 'room-api-creator' });
  const joinerUserId = seedUser(harness.db, { openid: 'room-api-joiner' });

  const createResponse = await harness.request('POST', '/api/xiangqi/rooms/create', {
    userId: creatorUserId,
    stakeAmount: '5.00',
    timeControlMinutes: 10
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

test('xiangqi room detail returns room and match summary after join', async () => {
  const harness = createHarness();

  try {
    const context = await createRoomContext(harness);
    const response = await harness.request('GET', `/api/xiangqi/rooms/${context.roomCode}`);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.item.roomCode, context.roomCode);
    assert.equal(response.body.item.status, 'PLAYING');
    assert.equal(response.body.item.match.id, context.matchId);
    assert.equal(response.body.item.match.turnSide, 'RED');
  } finally {
    harness.cleanup();
  }
});

test('xiangqi active room lookup returns a waiting room for the current user', async () => {
  const harness = createHarness();
  const creatorUserId = seedUser(harness.db, { openid: 'active-room-lookup-creator', availableBalance: '20.00' });

  try {
    const createResponse = await harness.request('POST', '/api/xiangqi/rooms/create', {
      userId: creatorUserId,
      stakeAmount: '1.00',
      timeControlMinutes: 15
    });

    const response = await harness.request('GET', `/api/xiangqi/rooms/active?userId=${creatorUserId}`);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.item.roomCode, createResponse.body.roomCode);
    assert.equal(response.body.item.status, 'WAITING');
    assert.equal(response.body.item.stakeAmount, '1.00');
  } finally {
    harness.cleanup();
  }
});

test('xiangqi room events endpoint opens SSE stream with snapshot', async () => {
  const harness = createHarness();

  try {
    const context = await createRoomContext(harness);
    const response = await harness.request('GET', `/api/xiangqi/rooms/${context.roomCode}/events`);

    assert.equal(response.statusCode, 200);
    assert.match(String(response.headers['content-type'] || ''), /text\/event-stream/);
    assert.match(response.body, /event: room\.snapshot/);
    assert.match(response.body, new RegExp(context.roomCode));
  } finally {
    harness.cleanup();
  }
});

test('unfinished room endpoints still keep placeholders when body is missing', async () => {
  const harness = createHarness();

  try {
    const createResponse = await harness.request('POST', '/api/xiangqi/rooms/create');
    const joinResponse = await harness.request('POST', '/api/xiangqi/rooms/join');
    const cancelResponse = await harness.request('POST', '/api/xiangqi/rooms/cancel');

    for (const response of [createResponse, joinResponse, cancelResponse]) {
      assert.equal(response.statusCode, 501);
      assert.deepEqual(response.body, {
        ok: false,
        error: 'Xiangqi room API not implemented yet'
      });
    }
  } finally {
    harness.cleanup();
  }
});
