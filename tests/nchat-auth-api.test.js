const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const EventEmitter = require('node:events');

const dbModulePath = path.join(__dirname, '..', 'src', 'db.js');
const serverModulePath = path.join(__dirname, '..', 'src', 'server.js');

function createHarness() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claw800-nchat-auth-api-'));
  const dbPath = path.join(tmpDir, 'claw800.db');
  const previousDbPath = process.env.CLAW800_DB_PATH;

  process.env.CLAW800_DB_PATH = dbPath;
  delete require.cache[require.resolve(dbModulePath)];
  delete require.cache[require.resolve(serverModulePath)];

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
        res.status = function status(code) {
          this.statusCode = code;
          return this;
        };
        res.cookie = function cookie(name, value, opts = {}) {
          const serialized = JSON.stringify({ name, value, opts });
          const current = this.headers['set-cookie'];
          if (!current) this.headers['set-cookie'] = [serialized];
          else current.push(serialized);
          return this;
        };
        res.clearCookie = function clearCookie(name, opts = {}) {
          return this.cookie(name, '', { ...opts, expires: new Date(0), maxAge: 0 });
        };
        res.json = function json(payload) {
          resolve({ statusCode: this.statusCode, body: payload, headers: this.headers });
          return this;
        };
        res.end = function end(payload) {
          resolve({ statusCode: this.statusCode, body: payload, headers: this.headers });
        };

        app.handle(req, res, reject);
        req.emit('end');
      });
    },
    async requestSse(routePath, options = {}) {
      return new Promise((resolve, reject) => {
        const req = new EventEmitter();
        req.method = 'GET';
        req.url = routePath;
        req.originalUrl = routePath;
        req.headers = { accept: 'text/event-stream', ...(options.headers || {}) };
        req.connection = {};
        req.socket = {};
        req.body = undefined;
        req.query = {};
        req.cookies = { ...(options.cookies || {}) };

        const [pathname, queryString = ''] = routePath.split('?');
        req.path = pathname;
        const params = new URLSearchParams(queryString);
        for (const [key, value] of params.entries()) {
          req.query[key] = value;
        }

        let firstChunk = '';
        let resolved = false;
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
        res.status = function status(code) {
          this.statusCode = code;
          return this;
        };
        res.flushHeaders = function flushHeaders() {};
        res.json = function json(payload) {
          if (!resolved) {
            resolved = true;
            resolve({ statusCode: this.statusCode, body: payload, headers: this.headers });
          }
          return this;
        };
        res.write = function write(chunk) {
          firstChunk += String(chunk || '');
          if (!resolved && /event:/i.test(firstChunk)) {
            resolved = true;
            resolve({ statusCode: this.statusCode, chunk: firstChunk, headers: this.headers, close: () => { req.emit('close'); res.emit('close'); } });
          }
          return true;
        };
        res.end = function end(chunk) {
          if (!resolved) {
            resolved = true;
            resolve({ statusCode: this.statusCode, body: chunk ? String(chunk) : null, headers: this.headers });
          }
        };

        app.handle(req, res, reject);
        req.emit('end');
      });
    },
    openSseCollector(routePath, options = {}) {
      const req = new EventEmitter();
      req.method = 'GET';
      req.url = routePath;
      req.originalUrl = routePath;
      req.headers = { accept: 'text/event-stream', ...(options.headers || {}) };
      req.connection = {};
      req.socket = {};
      req.body = undefined;
      req.query = {};
      req.cookies = { ...(options.cookies || {}) };

      const [pathname, queryString = ''] = routePath.split('?');
      req.path = pathname;
      const params = new URLSearchParams(queryString);
      for (const [key, value] of params.entries()) {
        req.query[key] = value;
      }

      const chunks = [];
      const waiters = [];
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
      res.status = function status(code) {
        this.statusCode = code;
        return this;
      };
      res.flushHeaders = function flushHeaders() {};
      res.json = function json(payload) {
        chunks.push(JSON.stringify(payload));
        return this;
      };
      res.write = function write(chunk) {
        const text = String(chunk || '');
        chunks.push(text);
        waiters.splice(0).forEach((waiter) => waiter());
        return true;
      };
      res.end = function end(chunk) {
        if (chunk) chunks.push(String(chunk));
      };

      app.handle(req, res, (error) => {
        chunks.push(String(error?.message || error || 'SSE_ERROR'));
      });
      req.emit('end');

      return {
        get statusCode() {
          return res.statusCode;
        },
        get text() {
          return chunks.join('');
        },
        waitFor(pattern, timeoutMs = 200) {
          const regex = pattern instanceof RegExp ? pattern : new RegExp(String(pattern));
          if (regex.test(chunks.join(''))) return Promise.resolve(chunks.join(''));
          return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error(`SSE_TIMEOUT:${regex}`));
            }, timeoutMs);
            const check = () => {
              const text = chunks.join('');
              if (regex.test(text)) {
                clearTimeout(timeout);
                resolve(text);
              } else {
                waiters.push(check);
              }
            };
            waiters.push(check);
          });
        },
        close() {
          req.emit('close');
          res.emit('close');
        }
      };
    },
    cleanup() {
      db.close();
      delete require.cache[require.resolve(serverModulePath)];
      delete require.cache[require.resolve(dbModulePath)];
      if (previousDbPath === undefined) delete process.env.CLAW800_DB_PATH;
      else process.env.CLAW800_DB_PATH = previousDbPath;
    }
  };
}

function extractCookie(syncResponse) {
  const serialized = JSON.parse(syncResponse.headers['set-cookie'][0]);
  return { [serialized.name]: serialized.value };
}

async function createNchatUser(harness, { openId, sessionKey, nickname }) {
  const response = await harness.request('POST', '/api/nchat/session', { openId, sessionKey, nickname });
  return {
    response,
    cookies: extractCookie(response)
  };
}

test('nchat session sync creates a user row with a unique 8-digit chat id', async () => {
  const harness = createHarness();
  try {
    const response = await harness.request('POST', '/api/nchat/session', {
      openId: 'nchat-open-id-1',
      sessionKey: 'nchat-session-key-1',
      nickname: 'Nchat User'
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
    assert.match(String(response.body.user.chatId || ''), /^\d{8}$/);
    assert.match(response.headers['set-cookie'][0], /"maxAge":2592000000/);
  } finally {
    harness.cleanup();
  }
});

test('nchat bootstrap returns current profile and requires setup when nickname or avatar is missing', async () => {
  const harness = createHarness();
  try {
    const { cookies } = await createNchatUser(harness, {
      openId: 'nchat-open-id-bootstrap',
      sessionKey: 'nchat-session-key-bootstrap',
      nickname: ''
    });
    const bootstrap = await harness.request('GET', '/api/nchat/bootstrap', null, { cookies });

    assert.equal(bootstrap.statusCode, 200);
    assert.equal(bootstrap.body.ok, true);
    assert.equal(bootstrap.body.profileSetupRequired, true);
    assert.match(String(bootstrap.body.user.chatId || ''), /^\d{8}$/);
  } finally {
    harness.cleanup();
  }
});

test('nchat profile save completes first-time setup with nickname and avatar', async () => {
  const harness = createHarness();
  try {
    const { cookies } = await createNchatUser(harness, {
      openId: 'nchat-open-id-profile',
      sessionKey: 'nchat-session-key-profile',
      nickname: ''
    });
    const response = await harness.request('POST', '/api/nchat/profile', {
      nickname: '幽灵通信',
      avatarUrl: '/uploads/nchat/avatar-a.png'
    }, { cookies });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.profileSetupRequired, false);
    assert.equal(response.body.user.nickname, '幽灵通信');
    assert.equal(response.body.user.avatarUrl, '/uploads/nchat/avatar-a.png');
  } finally {
    harness.cleanup();
  }
});

test('nchat search finds users by nickname and exact 8-digit chat id', async () => {
  const harness = createHarness();
  try {
    const seeker = await createNchatUser(harness, {
      openId: 'nchat-open-id-search-a',
      sessionKey: 'nchat-session-key-search-a',
      nickname: '搜索者'
    });
    const target = await createNchatUser(harness, {
      openId: 'nchat-open-id-search-b',
      sessionKey: 'nchat-session-key-search-b',
      nickname: '影子代理007'
    });
    await harness.request('POST', '/api/nchat/profile', {
      nickname: '搜索者',
      avatarUrl: '/uploads/nchat/avatar-search-a.png'
    }, { cookies: seeker.cookies });
    const profileResponse = await harness.request('POST', '/api/nchat/profile', {
      nickname: '影子代理007',
      avatarUrl: '/uploads/nchat/avatar-search-b.png'
    }, { cookies: target.cookies });
    const targetChatId = String(profileResponse.body.user.chatId || '');

    const byNickname = await harness.request('GET', `/api/nchat/search?q=${encodeURIComponent('影子')}`, null, {
      cookies: seeker.cookies
    });
    const byChatId = await harness.request('GET', `/api/nchat/search?q=${encodeURIComponent(targetChatId)}`, null, {
      cookies: seeker.cookies
    });

    assert.equal(byNickname.statusCode, 200);
    assert.equal(byChatId.statusCode, 200);
    assert.equal(Array.isArray(byNickname.body.items), true);
    assert.equal(Array.isArray(byChatId.body.items), true);
    assert.equal(byNickname.body.items[0].chatId, targetChatId);
    assert.equal(byChatId.body.items[0].chatId, targetChatId);
  } finally {
    harness.cleanup();
  }
});

test('nchat add friend instantly creates friendship and direct conversation', async () => {
  const harness = createHarness();
  try {
    const buyer = await createNchatUser(harness, {
      openId: 'nchat-open-id-friend-a',
      sessionKey: 'nchat-session-key-friend-a',
      nickname: '加密终端 Alpha'
    });
    const seller = await createNchatUser(harness, {
      openId: 'nchat-open-id-friend-b',
      sessionKey: 'nchat-session-key-friend-b',
      nickname: '深网节点'
    });
    await harness.request('POST', '/api/nchat/profile', {
      nickname: '加密终端 Alpha',
      avatarUrl: '/uploads/nchat/a.png'
    }, { cookies: buyer.cookies });
    const sellerProfile = await harness.request('POST', '/api/nchat/profile', {
      nickname: '深网节点',
      avatarUrl: '/uploads/nchat/b.png'
    }, { cookies: seller.cookies });
    const response = await harness.request('POST', '/api/nchat/friends', {
      targetChatId: sellerProfile.body.user.chatId
    }, { cookies: buyer.cookies });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.conversation.id > 0, true);
  } finally {
    harness.cleanup();
  }
});

test('nchat friends can send text messages and fetch conversation history', async () => {
  const harness = createHarness();
  try {
    const sender = await createNchatUser(harness, {
      openId: 'nchat-open-id-message-a',
      sessionKey: 'nchat-session-key-message-a',
      nickname: 'Alpha'
    });
    const receiver = await createNchatUser(harness, {
      openId: 'nchat-open-id-message-b',
      sessionKey: 'nchat-session-key-message-b',
      nickname: 'Bravo'
    });
    await harness.request('POST', '/api/nchat/profile', { nickname: 'Alpha', avatarUrl: '/uploads/nchat/alpha.png' }, { cookies: sender.cookies });
    const receiverProfile = await harness.request('POST', '/api/nchat/profile', { nickname: 'Bravo', avatarUrl: '/uploads/nchat/bravo.png' }, { cookies: receiver.cookies });
    const friendResponse = await harness.request('POST', '/api/nchat/friends', {
      targetChatId: receiverProfile.body.user.chatId
    }, { cookies: sender.cookies });
    const conversationId = friendResponse.body.conversation.id;

    const sendResponse = await harness.request('POST', `/api/nchat/conversations/${conversationId}/messages`, {
      content: 'hello'
    }, { cookies: sender.cookies });
    const historyResponse = await harness.request('GET', `/api/nchat/conversations/${conversationId}/messages`, null, {
      cookies: receiver.cookies
    });

    assert.equal(sendResponse.statusCode, 200);
    assert.equal(sendResponse.body.message.content, 'hello');
    assert.equal(historyResponse.statusCode, 200);
    assert.equal(Array.isArray(historyResponse.body.items), true);
    assert.equal(historyResponse.body.items[0].content, 'hello');
  } finally {
    harness.cleanup();
  }
});

test('nchat opening a conversation clears the unread badge for that user', async () => {
  const harness = createHarness();
  try {
    const sender = await createNchatUser(harness, {
      openId: 'nchat-open-id-read-a',
      sessionKey: 'nchat-session-key-read-a',
      nickname: 'Reader A'
    });
    const receiver = await createNchatUser(harness, {
      openId: 'nchat-open-id-read-b',
      sessionKey: 'nchat-session-key-read-b',
      nickname: 'Reader B'
    });
    await harness.request('POST', '/api/nchat/profile', { nickname: 'Reader A', avatarUrl: '/uploads/nchat/read-a.png' }, { cookies: sender.cookies });
    const receiverProfile = await harness.request('POST', '/api/nchat/profile', { nickname: 'Reader B', avatarUrl: '/uploads/nchat/read-b.png' }, { cookies: receiver.cookies });
    const friendResponse = await harness.request('POST', '/api/nchat/friends', {
      targetChatId: receiverProfile.body.user.chatId
    }, { cookies: sender.cookies });
    const conversationId = friendResponse.body.conversation.id;
    await harness.request('POST', `/api/nchat/conversations/${conversationId}/messages`, { content: 'ping' }, { cookies: sender.cookies });

    const response = await harness.request('POST', `/api/nchat/conversations/${conversationId}/read`, {}, {
      cookies: receiver.cookies
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.unreadCount, 0);
  } finally {
    harness.cleanup();
  }
});

test('nchat receiver event stream gets notified when sender sends a message', async () => {
  const harness = createHarness();
  try {
    const sender = await createNchatUser(harness, {
      openId: 'nchat-open-id-sse-a',
      sessionKey: 'nchat-session-key-sse-a',
      nickname: 'SSE A'
    });
    const receiver = await createNchatUser(harness, {
      openId: 'nchat-open-id-sse-b',
      sessionKey: 'nchat-session-key-sse-b',
      nickname: 'SSE B'
    });
    await harness.request('POST', '/api/nchat/profile', { nickname: 'SSE A', avatarUrl: '/uploads/nchat/sse-a.png' }, { cookies: sender.cookies });
    const receiverProfile = await harness.request('POST', '/api/nchat/profile', { nickname: 'SSE B', avatarUrl: '/uploads/nchat/sse-b.png' }, { cookies: receiver.cookies });
    const friendResponse = await harness.request('POST', '/api/nchat/friends', {
      targetChatId: receiverProfile.body.user.chatId
    }, { cookies: sender.cookies });
    const conversationId = friendResponse.body.conversation.id;

    const stream = await harness.requestSse('/api/nchat/events', { cookies: receiver.cookies });
    await harness.request('POST', `/api/nchat/conversations/${conversationId}/messages`, {
      content: 'ping'
    }, { cookies: sender.cookies });

    assert.equal(stream.statusCode, 200);
    assert.match(String(stream.chunk || ''), /event:\s*nchat\.(message|conversation-updated)/);
    stream.close?.();
  } finally {
    harness.cleanup();
  }
});

test('nchat bidirectional event streams both receive realtime messages', async () => {
  const harness = createHarness();
  try {
    const alpha = await createNchatUser(harness, {
      openId: 'nchat-open-id-sse-bidirectional-a',
      sessionKey: 'nchat-session-key-sse-bidirectional-a',
      nickname: 'Bidirectional A'
    });
    const bravo = await createNchatUser(harness, {
      openId: 'nchat-open-id-sse-bidirectional-b',
      sessionKey: 'nchat-session-key-sse-bidirectional-b',
      nickname: 'Bidirectional B'
    });
    await harness.request('POST', '/api/nchat/profile', {
      nickname: 'Bidirectional A',
      avatarUrl: '/uploads/nchat/bidirectional-a.png'
    }, { cookies: alpha.cookies });
    const bravoProfile = await harness.request('POST', '/api/nchat/profile', {
      nickname: 'Bidirectional B',
      avatarUrl: '/uploads/nchat/bidirectional-b.png'
    }, { cookies: bravo.cookies });
    const friendResponse = await harness.request('POST', '/api/nchat/friends', {
      targetChatId: bravoProfile.body.user.chatId
    }, { cookies: alpha.cookies });
    const conversationId = friendResponse.body.conversation.id;

    const alphaStream = harness.openSseCollector('/api/nchat/events', { cookies: alpha.cookies });
    const bravoStream = harness.openSseCollector('/api/nchat/events', { cookies: bravo.cookies });
    await alphaStream.waitFor(/event:\s*nchat\.conversation-updated[\s\S]*bootstrap/);
    await bravoStream.waitFor(/event:\s*nchat\.conversation-updated[\s\S]*bootstrap/);

    await harness.request('POST', `/api/nchat/conversations/${conversationId}/messages`, {
      content: 'from alpha'
    }, { cookies: alpha.cookies });
    await bravoStream.waitFor(/event:\s*nchat\.message[\s\S]*from alpha/);

    await harness.request('POST', `/api/nchat/conversations/${conversationId}/messages`, {
      content: 'from bravo'
    }, { cookies: bravo.cookies });
    await alphaStream.waitFor(/event:\s*nchat\.message[\s\S]*from bravo/);

    alphaStream.close();
    bravoStream.close();
  } finally {
    harness.cleanup();
  }
});
